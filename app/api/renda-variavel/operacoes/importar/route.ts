// src/app/api/renda-variavel/operacoes/importar/route.ts
//
// Recebe as operações já lidas/filtradas da planilha "Movimentação" da B3 (a
// leitura é feita no navegador). Grava só as que ainda não existem (chave em
// origem_importacao) e valida o histórico completo de cada ativo: nada que
// deixe uma venda sem saldo. Importação de histórico NÃO mexe no saldo das contas.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { operacoesRv } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import { hojeBrt } from "@/utils/aplicacaoSimulacao";
import {
  TICKER_REGEX, normalizarTicker, validarSequencia,
  type OperacaoRv, type TipoAtivo,
} from "@/utils/rendaVariavelUtils";

const TIPOS_ATIVO: TipoAtivo[] = ["acao", "fii", "etf", "bdr"];
const EVENTOS = ["desdobramento", "bonificacao"] as const;
const MAX_OPERACOES = 1500;
const LOTE = 200;

const fmtIso = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/");

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const body = await req.json();
    const entrada: any[] = Array.isArray(body.operacoes) ? body.operacoes : [];
    if (entrada.length === 0) return NextResponse.json({ error: "Nenhuma operação para importar" }, { status: 400 });
    if (entrada.length > MAX_OPERACOES)
      return NextResponse.json({ error: `Máximo de ${MAX_OPERACOES} operações por importação` }, { status: 400 });

    const hoje = hojeBrt();
    const existentes = await db.select().from(operacoesRv).where(eq(operacoesRv.userId, userId));
    const chavesExistentes = new Set(existentes.map((e) => e.origemImportacao).filter((c): c is string => !!c));
    const tipoAtivoDoTicker = new Map(existentes.map((e) => [e.ticker, e.tipoAtivo]));

    type Nova = {
      chave: string; ticker: string; tipoAtivo: TipoAtivo; tipo: "compra" | "venda";
      evento: (typeof EVENTOS)[number] | null; data: string; quantidade: number;
      precoUnitario: number; dataEstimada: boolean; instituicao: string | null;
    };
    const novas = new Map<string, Nova>();
    let invalidos = 0;
    let duplicados = 0;

    for (const e of entrada) {
      const ticker = normalizarTicker(String(e?.ticker ?? ""));
      const data = String(e?.data ?? "");
      const qtd = Number(e?.quantidade);
      const preco = Number(e?.precoUnitario);
      const evento = e?.evento ?? null;
      const chave = String(e?.chave ?? "").slice(0, 300);
      if (
        !chave || !TICKER_REGEX.test(ticker) ||
        (e?.tipo !== "compra" && e?.tipo !== "venda") ||
        !TIPOS_ATIVO.includes(e?.tipoAtivo) ||
        (evento !== null && (!EVENTOS.includes(evento) || e.tipo !== "compra")) ||
        !/^\d{4}-\d{2}-\d{2}$/.test(data) || data > hoje ||
        !Number.isInteger(qtd) || qtd <= 0 ||
        !Number.isFinite(preco) || (evento ? preco !== 0 : preco <= 0)
      ) {
        invalidos++;
        continue;
      }
      if (chavesExistentes.has(chave) || novas.has(chave)) {
        duplicados++;
        continue;
      }
      novas.set(chave, {
        chave, ticker, tipo: e.tipo, evento, data, quantidade: qtd, precoUnitario: preco,
        tipoAtivo: tipoAtivoDoTicker.get(ticker) ?? e.tipoAtivo,
        dataEstimada: e.dataEstimada === true,
        instituicao: e.instituicao ? String(e.instituicao).slice(0, 120) : null,
      });
    }

    const lista = Array.from(novas.values());

    // Valida o histórico completo (existentes + novas) de cada ticker afetado
    const afetados = new Set(lista.map((n) => n.ticker));
    for (const ticker of Array.from(afetados)) {
      const ops: OperacaoRv[] = [
        ...existentes
          .filter((x) => x.ticker === ticker)
          .map((x) => ({
            id: x.id, ticker: x.ticker, tipoAtivo: x.tipoAtivo, tipo: x.tipo, data: x.data,
            quantidade: x.quantidade, precoUnitario: Number(x.precoUnitario), taxas: Number(x.taxas),
          })),
        ...lista
          .filter((n) => n.ticker === ticker)
          .map((n) => ({
            id: n.chave, ticker: n.ticker, tipoAtivo: n.tipoAtivo, tipo: n.tipo, data: n.data,
            quantidade: n.quantidade, precoUnitario: n.precoUnitario, taxas: 0, evento: n.evento,
          })),
      ];
      const problema = validarSequencia(ops);
      if (problema) {
        return NextResponse.json(
          { error: `Histórico de ${ticker} inconsistente: faltam ${problema.faltam} para a venda de ${fmtIso(problema.data)}. Ignore este ativo ou ajuste as operações.` },
          { status: 400 },
        );
      }
    }

    let inseridos = 0;
    for (let i = 0; i < lista.length; i += LOTE) {
      const lote = lista.slice(i, i + LOTE);
      const r = await db
        .insert(operacoesRv)
        .values(
          lote.map((n) => ({
            userId,
            ticker: n.ticker,
            tipoAtivo: n.tipoAtivo,
            tipo: n.tipo,
            data: n.data,
            quantidade: n.quantidade,
            precoUnitario: n.precoUnitario.toFixed(4),
            taxas: "0.00",
            contaId: null,
            movimentouConta: false,
            origemImportacao: n.chave,
            evento: n.evento,
            dataEstimada: n.dataEstimada,
            instituicao: n.instituicao,
          })),
        )
        .onConflictDoNothing()
        .returning({ id: operacoesRv.id });
      inseridos += r.length;
    }

    return NextResponse.json({
      inseridos,
      duplicados: duplicados + (lista.length - inseridos),
      invalidos,
      total: entrada.length,
    });
  } catch (error: any) {
    console.error("Erro ao importar operações de renda variável:", error);
    return NextResponse.json({ error: error.message || "Erro ao importar operações" }, { status: 500 });
  }
}