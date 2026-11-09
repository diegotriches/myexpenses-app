//
// Proventos de renda variável (dividendos, JCP e rendimentos de FII) e leitura
// das planilhas da B3 (Área do Investidor):
//  - "Proventos Recebidos"  → colunas Produto, Pagamento, Tipo de Evento, ...
//  - "Movimentação"         → mistura tudo (compras, CDB, atualizações...);
//                             aqui só entram as linhas de provento.
// O valor guardado é o LÍQUIDO (já sem o IR retido na fonte, como a B3 informa).

import { TICKER_REGEX, normalizarTicker, r2 } from "./rendaVariavelUtils";
import { dataIso, numero, semAcento, texto } from "./b3ParserUtils";

export type TipoProvento = "dividendo" | "jcp" | "rendimento";

export const TIPO_PROVENTO_LABEL: Record<TipoProvento, string> = {
  dividendo: "Dividendo",
  jcp: "JCP",
  rendimento: "Rendimento",
};

export interface ProventoImportavel {
  ticker: string;
  tipo: TipoProvento;
  data: string; // YYYY-MM-DD (pagamento)
  quantidade: number | null;
  precoUnitario: number | null;
  valorLiquido: number;
  instituicao: string | null;
}

export interface ProventoRv extends ProventoImportavel {
  id: string;
  contaId: string | null;
  movimentouConta: boolean;
}

/** Chave de unicidade: o mesmo provento nunca entra duas vezes. */
export function chaveProvento(p: {
  ticker: string;
  data: string;
  tipo: TipoProvento;
  valorLiquido: number;
  quantidade: number | null;
}): string {
  return [p.ticker, p.data, p.tipo, r2(p.valorLiquido).toFixed(2), p.quantidade ?? ""].join("|");
}

// ── Leitura de planilhas ────────────────────────────────────────────────────

export type FormatoPlanilha = "proventos-recebidos" | "movimentacao";

export interface ResultadoLeitura {
  formato: FormatoPlanilha | null;
  proventos: ProventoImportavel[];
  ignorados: { motivo: string; quantidade: number }[];
  erro?: string;
}

// Tipos de evento da B3 (sem acento, minúsculos) → tipo interno
const TIPOS: Record<string, TipoProvento> = {
  rendimento: "rendimento",
  dividendo: "dividendo",
  "juros sobre capital proprio": "jcp",
};

export function lerPlanilhaProventos(linhas: unknown[][]): ResultadoLeitura {
  const vazio: ResultadoLeitura = { formato: null, proventos: [], ignorados: [] };

  // Cabeçalho: primeira linha (nas 15 primeiras) com "Produto"
  let cab = -1;
  for (let i = 0; i < Math.min(linhas.length, 15); i++) {
    if ((linhas[i] ?? []).some((c) => semAcento(texto(c)) === "produto")) {
      cab = i;
      break;
    }
  }
  if (cab < 0) return { ...vazio, erro: "Não encontrei o cabeçalho (coluna \"Produto\"). Esta planilha é da B3?" };

  const idx: Record<string, number> = {};
  (linhas[cab] ?? []).forEach((c, i) => {
    idx[semAcento(texto(c))] = i;
  });

  const colProduto = idx["produto"];
  const colData = idx["pagamento"] ?? idx["data"];
  const colTipo = idx["tipo de evento"] ?? idx["movimentacao"];
  const colInst = idx["instituicao"];
  const colQtd = idx["quantidade"];
  const colPreco = idx["preco unitario"];
  const colValor = idx["valor liquido"] ?? idx["valor da operacao"];
  const colES = idx["entrada/saida"];

  if ([colProduto, colData, colTipo, colValor].some((c) => c === undefined)) {
    return { ...vazio, erro: "Colunas esperadas não encontradas (Produto, Data/Pagamento, Tipo/Movimentação, Valor)." };
  }

  const formato: FormatoPlanilha = colES !== undefined ? "movimentacao" : "proventos-recebidos";
  const proventos: ProventoImportavel[] = [];
  const ignorados = new Map<string, number>();
  const ignorar = (motivo: string) => ignorados.set(motivo, (ignorados.get(motivo) ?? 0) + 1);

  for (let i = cab + 1; i < linhas.length; i++) {
    const l = linhas[i] ?? [];
    const produto = texto(l[colProduto]);
    const tipoTxt = texto(l[colTipo]);
    if (!produto && !tipoTxt) continue; // linha em branco / "Total"

    const tipo = TIPOS[semAcento(tipoTxt)];
    if (!tipo) {
      // Na "Movimentação" a maioria das linhas não é provento: agrupa por tipo
      ignorar(formato === "movimentacao" ? `Movimentação "${tipoTxt}" (não é provento)` : `Tipo de evento não suportado: "${tipoTxt}"`);
      continue;
    }
    if (colES !== undefined && semAcento(texto(l[colES])) !== "credito") {
      ignorar("Provento com débito (estorno)");
      continue;
    }

    const ticker = normalizarTicker(produto.split(" - ")[0] ?? "");
    if (!TICKER_REGEX.test(ticker)) {
      ignorar("Produto sem ticker válido");
      continue;
    }
    const data = dataIso(l[colData]);
    if (!data) {
      ignorar("Data inválida");
      continue;
    }
    const valor = numero(l[colValor]);
    if (valor === null || valor <= 0) {
      ignorar("Valor zerado ou inválido");
      continue;
    }

    const qtd = colQtd !== undefined ? numero(l[colQtd]) : null;
    proventos.push({
      ticker,
      tipo,
      data,
      quantidade: qtd !== null && Number.isInteger(qtd) && qtd >= 0 ? qtd : null,
      precoUnitario: colPreco !== undefined ? numero(l[colPreco]) : null,
      valorLiquido: r2(valor),
      instituicao: colInst !== undefined ? texto(l[colInst]) || null : null,
    });
  }

  return {
    formato,
    proventos,
    ignorados: Array.from(ignorados.entries()).map(([motivo, quantidade]) => ({ motivo, quantidade })),
  };
}

// ── Totais ──────────────────────────────────────────────────────────────────

export interface MesProventos {
  mes: string; // YYYY-MM
  label: string; // "out/26"
  dividendo: number;
  jcp: number;
  rendimento: number;
  total: number;
}

export interface ResumoProventos {
  total: number;
  noAno: number;
  ultimos12m: number;
  porMes: MesProventos[]; // 12 meses terminando no mês de `hoje`
  porTicker: Map<string, number>;
}

const NOMES_MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export function resumirProventos(proventos: Pick<ProventoImportavel, "ticker" | "tipo" | "data" | "valorLiquido">[], hoje: string): ResumoProventos {
  const ano = Number(hoje.slice(0, 4));
  const mesAtual = Number(hoje.slice(5, 7));

  const porMes: MesProventos[] = [];
  for (let k = 11; k >= 0; k--) {
    let m = mesAtual - k;
    let a = ano;
    while (m <= 0) {
      m += 12;
      a -= 1;
    }
    porMes.push({
      mes: `${a}-${String(m).padStart(2, "0")}`,
      label: `${NOMES_MES[m - 1]}/${String(a).slice(2)}`,
      dividendo: 0, jcp: 0, rendimento: 0, total: 0,
    });
  }
  const indice = new Map(porMes.map((m, i) => [m.mes, i]));

  let total = 0;
  let noAno = 0;
  const porTicker = new Map<string, number>();
  for (const p of proventos) {
    total += p.valorLiquido;
    if (p.data.slice(0, 4) === String(ano)) noAno += p.valorLiquido;
    porTicker.set(p.ticker, (porTicker.get(p.ticker) ?? 0) + p.valorLiquido);
    const i = indice.get(p.data.slice(0, 7));
    if (i !== undefined) {
      porMes[i][p.tipo] += p.valorLiquido;
      porMes[i].total += p.valorLiquido;
    }
  }
  for (const m of porMes) {
    m.dividendo = r2(m.dividendo); m.jcp = r2(m.jcp); m.rendimento = r2(m.rendimento); m.total = r2(m.total);
  }
  const ultimos12m = r2(porMes.reduce((s, m) => s + m.total, 0));
  for (const [t, v] of Array.from(porTicker.entries())) porTicker.set(t, r2(v));

  return { total: r2(total), noAno: r2(noAno), ultimos12m, porMes, porTicker };
}