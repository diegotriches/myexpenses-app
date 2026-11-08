// src/utils/importacaoOperacoesUtils.ts
//
// Leitura da planilha "Movimentação" da B3 (Área do Investidor) para importar
// operações de renda variável:
//  - "Transferência - Liquidação" = negócio liquidado. Crédito = compra,
//    Débito = venda. Traz a data de LIQUIDAÇÃO (D+2 úteis); a data do negócio
//    é estimada voltando 2 dias úteis pelo calendário da B3.
//  - "Desdobro" e "Bonificação em Ativos" entram como compra de preço zero.
//  - O resto (custódia, atualização, renda fixa, opções, direitos de
//    subscrição, proventos...) é ignorado e contado na prévia.
// A planilha não traz taxas: ficam zeradas.

import {
  TICKER_REGEX, normalizarTicker, r2, ordenarOperacoes, validarSequencia,
  type EventoOperacao, type OperacaoRv, type TipoAtivo, type TipoOperacao,
} from "./rendaVariavelUtils";

// ── Calendário de dias úteis da B3 ──────────────────────────────────────────

const iso = (d: Date) => d.toISOString().slice(0, 10);
const somarDiasUtc = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);

function pascoa(ano: number): Date {
  const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(ano, mes - 1, dia));
}

const cacheFeriados = new Map<number, Set<string>>();

function feriadosB3(ano: number): Set<string> {
  const c = cacheFeriados.get(ano);
  if (c) return c;
  const p = pascoa(ano);
  const f = new Set<string>([
    `${ano}-01-01`, `${ano}-04-21`, `${ano}-05-01`, `${ano}-09-07`, `${ano}-10-12`,
    `${ano}-11-02`, `${ano}-11-15`, `${ano}-12-24`, `${ano}-12-25`, `${ano}-12-31`,
    iso(somarDiasUtc(p, -48)), iso(somarDiasUtc(p, -47)), // Carnaval
    iso(somarDiasUtc(p, -2)), // Sexta-feira Santa
    iso(somarDiasUtc(p, 60)), // Corpus Christi
  ]);
  if (ano >= 2024) f.add(`${ano}-11-20`); // Consciência Negra
  cacheFeriados.set(ano, f);
  return f;
}

export function ehDiaUtilB3(dataIso: string): boolean {
  const d = new Date(`${dataIso}T00:00:00Z`);
  const dia = d.getUTCDay();
  if (dia === 0 || dia === 6) return false;
  return !feriadosB3(d.getUTCFullYear()).has(dataIso);
}

/** Data estimada do negócio: `dias` dias úteis antes da liquidação (padrão D+2). */
export function estimarDataNegocio(liquidacao: string, dias = 2): string {
  let d = new Date(`${liquidacao}T00:00:00Z`);
  let restam = dias;
  while (restam > 0) {
    d = somarDiasUtc(d, -1);
    if (ehDiaUtilB3(iso(d))) restam--;
  }
  return iso(d);
}

// ── Tipos ───────────────────────────────────────────────────────────────────

export interface OperacaoImportavel {
  id: string; // índice da linha na leitura (estável durante a prévia)
  chave: string; // identifica o movimento na planilha (anti-duplicidade)
  ticker: string; // como veio na planilha
  nome: string;
  tipo: TipoOperacao;
  evento: EventoOperacao | null;
  data: string; // data do negócio (estimada quando dataEstimada)
  dataLiquidacao: string | null;
  dataEstimada: boolean;
  quantidade: number;
  precoUnitario: number;
  valor: number;
  instituicao: string | null;
}

export interface Ignorado {
  motivo: string;
  quantidade: number;
}

export interface Aviso {
  ticker: string;
  data: string;
  movimentacao: string;
  quantidade: number | null;
}

export interface LeituraOperacoes {
  operacoes: OperacaoImportavel[];
  ignorados: Ignorado[];
  avisos: Aviso[]; // movimentos que mudam posição e NÃO foram tratados
  atualizacoes: Record<string, number>; // última "Atualização" de posição por ticker
  erro?: string;
}

// ── Leitura ─────────────────────────────────────────────────────────────────

const semAcento = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const texto = (v: unknown) => (v === null || v === undefined ? "" : String(v).trim());

function numero(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const t = texto(v);
  if (!t || t === "-") return null;
  const n = Number(t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t);
  return Number.isFinite(n) ? n : null;
}

function dataIso(v: unknown): string | null {
  if (v instanceof Date && !isNaN(v.getTime())) {
    return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, "0")}-${String(v.getDate()).padStart(2, "0")}`;
  }
  const t = texto(v);
  const br = t.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10);
  return null;
}

const RENDA_FIXA = /^(CDB|LCI|LCA|LC|CRI|CRA|DEB|DEBENTURE|TESOURO|NTN|LTN|LFT)\b/i;

const PROVENTOS = new Set([
  "rendimento", "dividendo", "juros sobre capital proprio",
  "rendimento - transferido", "dividendo - transferido", "juros sobre capital proprio - transferido",
]);
const ROTINA = new Set([
  "atualizacao", "transferencia", "direito de subscricao", "direitos de subscricao - nao exercido",
  "cessao de direitos", "cessao de direitos - solicitada",
]);
// Mudam a posição (ou o caixa) e precisam de tratamento manual
const ATENCAO = new Set([
  "restituicao de capital em acoes", "resgate", "recibo de subscricao",
  "direitos de subscricao - exercido", "solicitacao de subscricao",
]);

export function lerPlanilhaOperacoes(linhas: unknown[][]): LeituraOperacoes {
  const vazio: LeituraOperacoes = { operacoes: [], ignorados: [], avisos: [], atualizacoes: {} };

  let cab = -1;
  for (let i = 0; i < Math.min(linhas.length, 15); i++) {
    if ((linhas[i] ?? []).some((c) => semAcento(texto(c)) === "movimentacao")) { cab = i; break; }
  }
  if (cab < 0) return { ...vazio, erro: "Não encontrei o cabeçalho (coluna \"Movimentação\"). Use a planilha \"Movimentação\" da B3." };

  const idx: Record<string, number> = {};
  (linhas[cab] ?? []).forEach((c, i) => { idx[semAcento(texto(c))] = i; });
  const [cES, cData, cMov, cProd, cInst, cQtd, cPreco, cValor] = [
    idx["entrada/saida"], idx["data"], idx["movimentacao"], idx["produto"],
    idx["instituicao"], idx["quantidade"], idx["preco unitario"], idx["valor da operacao"],
  ];
  if ([cES, cData, cMov, cProd, cQtd].some((c) => c === undefined))
    return { ...vazio, erro: "Colunas esperadas não encontradas. Esta é a planilha \"Movimentação\" da B3?" };

  const operacoes: OperacaoImportavel[] = [];
  const ignorados = new Map<string, number>();
  const avisos: Aviso[] = [];
  const atualizacoes: Record<string, { data: string; qtd: number }> = {};
  const ignorar = (m: string) => ignorados.set(m, (ignorados.get(m) ?? 0) + 1);
  const vistos = new Map<string, number>();

  for (let i = cab + 1; i < linhas.length; i++) {
    const l = linhas[i] ?? [];
    const mov = texto(l[cMov]);
    const produto = texto(l[cProd]);
    if (!mov && !produto) continue;
    const m = semAcento(mov);
    const data = dataIso(l[cData]);
    const credito = semAcento(texto(l[cES])) === "credito";
    const ticker = normalizarTicker(produto.split(" - ")[0] ?? "");
    const qtd = numero(l[cQtd]);

    // Renda fixa e proventos: não são operações de renda variável
    if (RENDA_FIXA.test(produto) || m === "pagamento de juros" || m.startsWith("vencimento") || m === "compra / venda") {
      ignorar("Renda fixa (CDB, LCI, Tesouro…)"); continue;
    }
    if (PROVENTOS.has(m)) { ignorar("Proventos (têm importação própria)"); continue; }

    // Atualização de posição: serve para sugerir troca de ticker
    if (m === "atualizacao") {
      if (data && TICKER_REGEX.test(ticker) && qtd !== null) {
        const a = atualizacoes[ticker];
        if (!a || a.data < data) atualizacoes[ticker] = { data, qtd };
      }
      ignorar("Atualização de posição / custódia");
      continue;
    }
    if (m === "transferencia") { ignorar("Atualização de posição / custódia"); continue; }

    // Opções (Compra/Venda "Opção de …")
    if (/^opcao de /.test(semAcento(produto)) || (!TICKER_REGEX.test(ticker) && (m === "compra" || m === "venda"))) {
      ignorar("Opções (fora do escopo)"); continue;
    }

    if (ATENCAO.has(m)) {
      ignorar(`${mov} (precisa de tratamento manual)`);
      avisos.push({ ticker, data: data ?? "", movimentacao: mov, quantidade: qtd });
      continue;
    }
    if (ROTINA.has(m)) { ignorar("Direitos de subscrição e cessões (sem custo)"); continue; }

    if (m !== "transferencia - liquidacao" && m !== "desdobro" && m !== "bonificacao em ativos") {
      ignorar(`Outros: "${mov}"`); continue;
    }

    if (!TICKER_REGEX.test(ticker) || !data || qtd === null || !Number.isInteger(qtd) || qtd <= 0) {
      ignorar("Linha inválida (ticker, data ou quantidade)"); continue;
    }
    const inst = cInst !== undefined ? texto(l[cInst]) || null : null;
    const nome = produto.split(" - ").slice(1).join(" - ").trim();

    let tipo: TipoOperacao;
    let evento: EventoOperacao | null = null;
    let valor = 0;
    let preco = 0;
    let dataNegocio = data;
    let dataLiq: string | null = null;
    let estimada = false;

    if (m === "transferencia - liquidacao") {
      const v = cValor !== undefined ? numero(l[cValor]) : null;
      if (v === null || v <= 0) { ignorar("Linha inválida (ticker, data ou quantidade)"); continue; }
      tipo = credito ? "compra" : "venda";
      valor = r2(v);
      preco = Math.round((valor / qtd) * 10000) / 10000;
      dataLiq = data;
      dataNegocio = estimarDataNegocio(data);
      estimada = true;
    } else {
      if (!credito) { ignorar("Evento com débito (não tratado)"); continue; }
      tipo = "compra";
      evento = m === "desdobro" ? "desdobramento" : "bonificacao";
    }

    // Chave anti-duplicidade (com sufixo se o mesmo movimento aparecer 2x no arquivo)
    const base = ["b3mov", data, ticker, evento ?? (tipo === "compra" ? "C" : "V"), qtd, valor.toFixed(2), inst ?? ""].join("|");
    const n = (vistos.get(base) ?? 0) + 1;
    vistos.set(base, n);

    operacoes.push({
      id: String(operacoes.length),
      chave: n > 1 ? `${base}#${n}` : base,
      ticker, nome, tipo, evento,
      data: dataNegocio, dataLiquidacao: dataLiq, dataEstimada: estimada,
      quantidade: qtd, precoUnitario: preco, valor, instituicao: inst,
    });
  }

  return {
    operacoes,
    ignorados: Array.from(ignorados.entries()).map(([motivo, quantidade]) => ({ motivo, quantidade })),
    avisos,
    atualizacoes: Object.fromEntries(Object.entries(atualizacoes).map(([t, a]) => [t, a.qtd])),
  };
}

// ── Sugestões ───────────────────────────────────────────────────────────────

/** Sugere o tipo de ativo pelo ticker e pelo nome do produto. */
export function sugerirTipoAtivoPorNome(ticker: string, nome: string): TipoAtivo {
  const t = normalizarTicker(ticker);
  const n = semAcento(nome);
  if (/(32|33|34|35|39)$/.test(t)) return "bdr";
  if (!/11$/.test(t)) return "acao";
  if (/ishare|indice|\betf\b|hash|bova|smal|ivvb|spxi/.test(n)) return "etf";
  if (/imob|\bfii\b|\bfof\b|fundo|fdo|recebiv|properties|logist|shopping/.test(n)) return "fii";
  if (/s\.a|s\/a|companhia|\bcia\b|centrais|saneamen|participa/.test(n)) return "acao"; // units
  return "fii";
}

export interface SaldoTicker {
  ticker: string;
  saldo: number;
}

export function saldoPorTicker(ops: OperacaoRv[], ate?: string): Map<string, number> {
  const m = new Map<string, number>();
  for (const o of ops) {
    if (ate && o.data > ate) continue;
    m.set(o.ticker, (m.get(o.ticker) ?? 0) + (o.tipo === "compra" ? o.quantidade : -o.quantidade));
  }
  return m;
}

export const paraOperacaoRv = (o: OperacaoImportavel, ticker = o.ticker, tipoAtivo: TipoAtivo = "acao"): OperacaoRv => ({
  id: o.id, ticker, tipoAtivo, tipo: o.tipo, data: o.data,
  quantidade: o.quantidade, precoUnitario: o.precoUnitario, taxas: 0, evento: o.evento,
});

/**
 * Ativos com problema de histórico (venda sem saldo): são pré-marcados para
 * ficar de fora da importação — o usuário pode incluí-los se quiser.
 */
export function sugerirIgnorar(operacoes: OperacaoImportavel[]): string[] {
  const porTicker = new Map<string, OperacaoRv[]>();
  for (const o of operacoes) {
    const l = porTicker.get(o.ticker) ?? [];
    l.push(paraOperacaoRv(o));
    porTicker.set(o.ticker, l);
  }
  const out: string[] = [];
  for (const [t, ops] of Array.from(porTicker.entries())) {
    if (validarSequencia(ops)) out.push(t);
  }
  return out.sort();
}

/**
 * Troca de ticker: ticker T com posição final > 0 que NÃO tem atualização da
 * B3, e uma atualização de ticker U (sem nenhuma operação na planilha) com a
 * MESMA quantidade → sugere unir T em U (só quando há um único par possível).
 */
export function sugerirRenomeacoes(
  operacoes: OperacaoImportavel[],
  atualizacoes: Record<string, number>,
): Record<string, string> {
  const comOps = new Set(operacoes.map((o) => o.ticker));
  const saldos = saldoPorTicker(operacoes.map((o) => paraOperacaoRv(o)));
  const candidatos = Object.keys(atualizacoes).filter((u) => !comOps.has(u));
  const out: Record<string, string> = {};
  for (const [t, saldo] of Array.from(saldos.entries())) {
    if (saldo <= 0 || atualizacoes[t] !== undefined) continue;
    const pares = candidatos.filter((u) => atualizacoes[u] === saldo);
    const concorrentes = Array.from(saldos.entries()).filter(
      ([t2, s2]) => t2 !== t && s2 === saldo && atualizacoes[t2] === undefined,
    );
    if (pares.length === 1 && concorrentes.length === 0) out[t] = pares[0];
  }
  return out;
}

// ── Relatório consolidado anual (conferência de posição) ───────────────────

/** Lê as abas "Posição - Ações / ETF / Fundos" e devolve ticker → quantidade. */
export function lerPosicaoOficial(abas: { nome: string; linhas: unknown[][] }[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const aba of abas) {
    if (!/^posicao - (acoes|etf|fundos)$/.test(semAcento(aba.nome))) continue;
    const cab = aba.linhas.findIndex((l) => (l ?? []).some((c) => semAcento(texto(c)) === "codigo de negociacao"));
    if (cab < 0) continue;
    const h: Record<string, number> = {};
    (aba.linhas[cab] ?? []).forEach((c, i) => { h[semAcento(texto(c))] = i; });
    const cCod = h["codigo de negociacao"], cQtd = h["quantidade"];
    if (cCod === undefined || cQtd === undefined) continue;
    for (let i = cab + 1; i < aba.linhas.length; i++) {
      const l = aba.linhas[i] ?? [];
      const t = normalizarTicker(texto(l[cCod]));
      const q = numero(l[cQtd]);
      if (TICKER_REGEX.test(t) && q !== null) out[t] = (out[t] ?? 0) + q;
    }
  }
  return out;
}

export { ordenarOperacoes };