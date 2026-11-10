//
// Busca cotações na brapi (https://brapi.dev) e grava em cotacoes_rv.
// Plano gratuito: 1 ticker por requisição, 1 requisição simultânea e 15.000
// requisições por ciclo — por isso as buscas são SEQUENCIAIS e só acontecem
// para tickers cuja cotação ficou velha (ver mercado.ts).
//
// Variável de ambiente: BRAPI_API_KEY

import { db } from "@/db";
import { cotacoesRv } from "@/db/schema";
import { inArray } from "drizzle-orm";
import { precisaAtualizar } from "./mercado";
import { textoDoErro } from "@/utils/erro";

export type Interrupcao = "sem-chave" | "chave-invalida" | "limite" | null;

export interface ResultadoAtualizacao {
  atualizados: string[];
  ignorados: string[]; // cotação ainda recente, não precisou buscar
  falhas: { ticker: string; motivo: string }[];
  interrompido: Interrupcao; // se a rodada parou no meio (e por quê)
}

const MAX_TICKERS = 40;
const PAUSA_ENTRE_BUSCAS_MS = 150;

class ErroBrapi extends Error {
  constructor(public tipo: "chave-invalida" | "limite" | "falha", mensagem: string) {
    super(mensagem);
  }
}

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function buscarCotacao(ticker: string, token: string) {
  const res = await fetch(`https://brapi.dev/api/quote/${encodeURIComponent(ticker)}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });

  if (res.status === 401 || res.status === 403) throw new ErroBrapi("chave-invalida", "Chave da brapi recusada");
  // 429 também aparece quando há requisições simultâneas (limite de 1 no plano gratuito)
  if (res.status === 402 || res.status === 429) throw new ErroBrapi("limite", "Limite de requisições da brapi");
  if (res.status === 404) throw new ErroBrapi("falha", "Ticker não encontrado na brapi");
  if (!res.ok) throw new ErroBrapi("falha", `Resposta HTTP ${res.status}`);

  const json = await res.json();
  const r = json?.results?.[0];
  const preco = Number(r?.regularMarketPrice);
  if (!r || !Number.isFinite(preco) || preco <= 0) throw new ErroBrapi("falha", "Resposta sem preço");

  const variacao = Number(r.regularMarketChangePercent);
  return { preco, variacao: Number.isFinite(variacao) ? variacao : null };
}

export async function atualizarCotacoes(
  tickersEntrada: string[],
  opts: { forcar?: boolean } = {},
): Promise<ResultadoAtualizacao> {
  const resultado: ResultadoAtualizacao = { atualizados: [], ignorados: [], falhas: [], interrompido: null };

  const tickers = Array.from(new Set(tickersEntrada)).slice(0, MAX_TICKERS);
  if (tickers.length === 0) return resultado;

  const token = process.env.BRAPI_API_KEY;
  if (!token) {
    resultado.interrompido = "sem-chave";
    return resultado;
  }

  const existentes = await db.select().from(cotacoesRv).where(inArray(cotacoesRv.ticker, tickers));
  const porTicker = new Map(existentes.map((c) => [c.ticker, c]));
  const agora = new Date();

  const pendentes: string[] = [];
  for (const t of tickers) {
    const atual = porTicker.get(t);
    if (precisaAtualizar(atual ? new Date(atual.atualizadoEm) : null, agora, opts.forcar === true)) pendentes.push(t);
    else resultado.ignorados.push(t);
  }

  for (let i = 0; i < pendentes.length; i++) {
    const ticker = pendentes[i];
    try {
      const { preco, variacao } = await buscarCotacao(ticker, token);
      const quando = new Date();
      await db
        .insert(cotacoesRv)
        .values({
          ticker,
          preco: preco.toFixed(4),
          variacaoDia: variacao !== null ? variacao.toFixed(4) : null,
          fonte: "brapi",
          atualizadoEm: quando,
        })
        .onConflictDoUpdate({
          target: cotacoesRv.ticker,
          set: {
            preco: preco.toFixed(4),
            variacaoDia: variacao !== null ? variacao.toFixed(4) : null,
            fonte: "brapi",
            atualizadoEm: quando,
          },
        });
      resultado.atualizados.push(ticker);
    } catch (e) {
      if (e instanceof ErroBrapi && (e.tipo === "chave-invalida" || e.tipo === "limite")) {
        // Não adianta insistir: o restante também falharia
        resultado.interrompido = e.tipo;
        resultado.falhas.push({ ticker, motivo: e.message });
        break;
      }
      resultado.falhas.push({ ticker, motivo: textoDoErro(e, "Erro ao buscar cotação") });
    }
    if (i < pendentes.length - 1) await dormir(PAUSA_ENTRE_BUSCAS_MS);
  }

  return resultado;
}