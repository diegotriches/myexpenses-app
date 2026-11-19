//
// Indexadores com taxa contratada ao ano: Prefixado e IPCA+, sem cupom, do
// Tesouro (LTN, NTN-B Principal) ou de títulos privados (CDB, LCI...), marcados
// NA CURVA: o valor que o título atinge se for levado ao vencimento. O preço de
// mercado (venda antecipada) não é calculado aqui.
//
// O motor de renda fixa (utils/aplicacaoSimulacao.ts) aplica uma taxa diária
// em cada dia útil. Aqui se gera essa taxa, com percentual 100%:
//  - Prefixado: (1 + taxa anual)^(1/252) em cada dia útil.
//  - IPCA+: parte real, (1 + taxa real)^(1/252), vezes a inflação. Como no
//    Tesouro, a inflação do mês M corre do dia 15 de M até o dia 14 de M+1,
//    dividida pelos dias úteis desse período: (1 + IPCA de M)^(1/dias úteis).
//
// Os dias úteis vêm de fora (datas da série do CDI, que o Banco Central só
// publica em dia útil). Dias do período ainda sem CDI (futuros) são contados
// de segunda a sexta, sem feriados. IPCA ainda não publicado repete o último
// publicado, e o mês fica marcado como estimado.

import type { TaxaDia } from "./aplicacaoSimulacao";

export type IndexadorTaxaAnual = "prefixado" | "ipca";
export type Indexador = "cdi" | "selic" | IndexadorTaxaAnual;

export const INDEXADORES: readonly Indexador[] = ["cdi", "selic", "prefixado", "ipca"];

/** Prefixado e IPCA+: rendem pela taxa contratada (taxaAnual), não por % de um indexador */
export function usaTaxaAnual(indexador: string): indexador is IndexadorTaxaAnual {
  return indexador === "prefixado" || indexador === "ipca";
}

export const INDEXADOR_LABEL: Record<Indexador, string> = {
  cdi: "CDI",
  selic: "Selic",
  prefixado: "Prefixado",
  ipca: "IPCA+",
};

const pct = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

/** "120% do CDI", "Prefixado 13,5% a.a." ou "IPCA + 6,2% a.a." */
export function descreverRentabilidade(a: {
  indexador: string;
  percentualIndexador: string | number;
  taxaAnual?: string | number | null;
}): string {
  if (a.indexador === "prefixado") return `Prefixado ${pct(Number(a.taxaAnual ?? 0))}% a.a.`;
  if (a.indexador === "ipca") return `IPCA + ${pct(Number(a.taxaAnual ?? 0))}% a.a.`;
  const nome = INDEXADOR_LABEL[a.indexador as Indexador] ?? a.indexador.toUpperCase();
  return `${pct(Number(a.percentualIndexador))}% do ${nome}`;
}

// ── datas (AAAA-MM-DD, em UTC) ───────────────────────────────────────────────

const paraUtc = (iso: string) => new Date(`${iso}T00:00:00Z`);
const iso = (d: Date) => d.toISOString().slice(0, 10);
const somarDia = (d: string, n: number) => { const x = paraUtc(d); x.setUTCDate(x.getUTCDate() + n); return iso(x); };
const ehDiaDeSemana = (d: string) => { const s = paraUtc(d).getUTCDay(); return s !== 0 && s !== 6; };

/** "AAAA-MM" do mês seguinte (ou anterior, com delta -1) */
export function somarMes(mes: string, delta: number): string {
  const [a, m] = mes.split("-").map(Number);
  const x = new Date(Date.UTC(a, m - 1 + delta, 1));
  return iso(x).slice(0, 7);
}

/** Mês do IPCA que corre na data: do dia 15 de M ao dia 14 de M+1 vale o IPCA de M */
export function mesReferenciaIpca(data: string): string {
  const mes = data.slice(0, 7);
  return Number(data.slice(8, 10)) >= 15 ? mes : somarMes(mes, -1);
}

/** Período do IPCA de M: [15/M, 15/M+1) */
function periodoIpca(mes: string): [string, string] {
  return [`${mes}-15`, `${somarMes(mes, 1)}-15`];
}

const fatorAnual = (taxaAnual: number) => Math.pow(1 + taxaAnual / 100, 1 / 252);

export interface TaxasTesouro {
  taxas: TaxaDia[];
  /** Meses de IPCA (AAAA-MM) que usaram o último IPCA publicado por falta do oficial */
  mesesIpcaEstimados: string[];
}

/**
 * Taxa diária (%) do título em cada dia útil informado.
 *
 * @param diasUteis dias úteis conhecidos, em ordem (datas da série do CDI)
 * @param ipcaMensal IPCA de cada mês em %, por "AAAA-MM" (só para IPCA+)
 */
export function taxasDiariasTesouro(p: {
  indexador: IndexadorTaxaAnual;
  taxaAnual: number;
  diasUteis: string[];
  ipcaMensal?: Record<string, number>;
}): TaxasTesouro {
  const dias = [...p.diasUteis].sort();
  const real = fatorAnual(p.taxaAnual);

  if (p.indexador === "prefixado") {
    const taxa = (real - 1) * 100;
    return { taxas: dias.map((data) => ({ data, taxa })), mesesIpcaEstimados: [] };
  }

  const ipca = p.ipcaMensal ?? {};
  const mesesPublicados = Object.keys(ipca).sort();
  const ultimoDia = dias[dias.length - 1];
  const conjunto = new Set(dias);

  // Dias úteis do período de cada mês: os conhecidos (CDI) e, depois do último
  // dia conhecido, os de segunda a sexta
  const diasNoPeriodo = new Map<string, number>();
  const contarPeriodo = (mes: string) => {
    const salvo = diasNoPeriodo.get(mes);
    if (salvo !== undefined) return salvo;
    const [ini, fim] = periodoIpca(mes);
    let n = 0;
    for (let d = ini; d < fim; d = somarDia(d, 1)) {
      if (ultimoDia && d <= ultimoDia) { if (conjunto.has(d)) n++; }
      else if (ehDiaDeSemana(d)) n++;
    }
    diasNoPeriodo.set(mes, n);
    return n;
  };

  // IPCA do mês, ou o último publicado antes dele (estimativa)
  const estimados = new Set<string>();
  const ipcaDoMes = (mes: string): number => {
    if (ipca[mes] !== undefined) return ipca[mes];
    estimados.add(mes);
    let anterior: string | undefined;
    for (const m of mesesPublicados) if (m < mes) anterior = m;
    return anterior !== undefined ? ipca[anterior] : 0;
  };

  const taxas = dias.map((data) => {
    const mes = mesReferenciaIpca(data);
    const n = Math.max(1, contarPeriodo(mes));
    const inflacao = Math.pow(1 + ipcaDoMes(mes) / 100, 1 / n);
    return { data, taxa: (real * inflacao - 1) * 100 };
  });

  return { taxas, mesesIpcaEstimados: [...estimados].sort() };
}
