// src/utils/aplicacaoSimulacao.ts
//
// Funções PURAS (sem banco, sem Node) — importáveis tanto no servidor
// (cron, rotas) quanto no navegador (preview de resgate, estimativas).
//
// Modelo: uma aplicação é composta por APORTES (lotes). Cada lote:
//  - rende a partir do dia útil seguinte à data do aporte (taxa com
//    data > data do aporte);
//  - tem a sua própria idade pra tabela regressiva de IR;
//  - nos resgates, sai do lote mais ANTIGO primeiro (FIFO), que é também o
//    de menor alíquota — é o critério usado pelas corretoras.

import { calcularAliquotaIR, type Tributacao } from "./aplicacaoUtils";

export interface LoteEntrada {
  id: string;
  data: string;  // YYYY-MM-DD
  valor: number; // valor aportado
}

export interface LoteEstado {
  id: string;
  data: string;
  aportado: number;
  principal: number;  // principal AINDA investido neste lote (cai nos resgates)
  valorAtual: number; // principal + rendimento bruto acumulado
}

export interface ResgateEntrada {
  id: string;
  data: string;
  valorBruto: number;
  total?: boolean; // true = leva tudo que existir naquela data
}

export interface TaxaDia {
  data: string;  // dia útil de referência
  taxa: number;  // taxa diária em % (ex: 0.050788)
}

export interface ConsumoLote {
  loteId: string;
  retirado: number;
  rendimento: number;
  aliquota: number;
  imposto: number;
}

export interface ResultadoResgate {
  bruto: number;
  rendimentoBruto: number;
  impostoRetido: number;
  valorLiquido: number;
  consumo: ConsumoLote[];
  lotesApos: LoteEstado[];
  excedeSaldo: boolean;
}

export interface ResgateSimulado {
  id: string;
  data: string;
  bruto: number;
  rendimentoBruto: number;
  impostoRetido: number;
  valorLiquido: number;
}

export interface ResultadoSimulacao {
  lotes: LoteEstado[];
  rendimentosDiarios: Array<{ data: string; valor: number; taxa: number }>;
  resgates: ResgateSimulado[];
  valorAtual: number;
  principal: number;
}

const EPS = 1e-8;

export const arredondar2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Data de hoje no fuso de Brasília, YYYY-MM-DD (funciona no servidor e no navegador) */
export function hojeBrt(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

const paraUtc = (iso: string) => Date.parse(`${iso}T00:00:00Z`);

export function diasEntre(inicioIso: string, fimIso: string): number {
  return Math.max(0, Math.round((paraUtc(fimIso) - paraUtc(inicioIso)) / 86_400_000));
}

export function somarDias(iso: string, dias: number): string {
  const d = new Date(paraUtc(iso));
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().split("T")[0];
}

/**
 * Resgate de um valor BRUTO sobre os lotes (FIFO). O IR incide só sobre a
 * parcela de rendimento do que foi retirado, com a alíquota da idade de
 * cada lote na data do resgate.
 */
export function simularResgateFifo(
  lotes: LoteEstado[],
  valorBruto: number,
  dataResgate: string,
  tributacao: Tributacao
): ResultadoResgate {
  const ordenados = [...lotes]
    .map((l) => ({ ...l }))
    .sort((a, b) => (a.data === b.data ? a.id.localeCompare(b.id) : a.data < b.data ? -1 : 1));

  const totalDisponivel = ordenados.reduce((s, l) => s + l.valorAtual, 0);
  const alvo = Math.min(valorBruto, totalDisponivel);
  let restante = alvo;

  const consumo: ConsumoLote[] = [];
  let rendimentoBruto = 0;
  let impostoRetido = 0;

  for (const lote of ordenados) {
    if (restante <= EPS) break;
    if (lote.valorAtual <= EPS) continue;

    const retirado = Math.min(lote.valorAtual, restante);
    const proporcao = retirado / lote.valorAtual;
    const principalConsumido = lote.principal * proporcao;
    const rendimento = retirado - principalConsumido;

    const aliquota =
      tributacao === "isento" ? 0 : calcularAliquotaIR(diasEntre(lote.data, dataResgate));
    const imposto = Math.max(0, rendimento) * (aliquota / 100);

    lote.principal -= principalConsumido;
    lote.valorAtual -= retirado;
    if (lote.valorAtual < EPS) { lote.valorAtual = 0; lote.principal = 0; }

    restante -= retirado;
    rendimentoBruto += rendimento;
    impostoRetido += imposto;
    consumo.push({ loteId: lote.id, retirado, rendimento, aliquota, imposto });
  }

  return {
    bruto: alvo,
    rendimentoBruto,
    impostoRetido,
    valorLiquido: alvo - impostoRetido,
    consumo,
    lotesApos: ordenados,
    excedeSaldo: valorBruto > totalDisponivel + 0.005,
  };
}

/**
 * Reproduz a vida inteira da aplicação, dia a dia: rendimento, aportes e
 * resgates em ordem cronológica. Determinística — por isso o cron pode
 * simplesmente "recalcular tudo" e corrigir qualquer inconsistência.
 *
 * Ordem dentro de um mesmo dia: (1) rende o que já estava aplicado,
 * (2) entram os aportes do dia, (3) saem os resgates do dia.
 */
export function simularAplicacao(p: {
  percentual: number;
  tributacao: Tributacao;
  aportes: LoteEntrada[];
  resgates: ResgateEntrada[];
  taxas: TaxaDia[];
  ate: string; // última data considerada (inclusive)
}): ResultadoSimulacao {
  const taxaPorData = new Map<string, number>();
  for (const t of p.taxas) if (t.data <= p.ate) taxaPorData.set(t.data, t.taxa);

  const aportesPorData = new Map<string, LoteEntrada[]>();
  for (const a of p.aportes) {
    if (a.data > p.ate) continue;
    const lista = aportesPorData.get(a.data) ?? [];
    lista.push(a);
    aportesPorData.set(a.data, lista);
  }

  const resgatesPorData = new Map<string, ResgateEntrada[]>();
  for (const r of p.resgates) {
    if (r.data > p.ate) continue;
    const lista = resgatesPorData.get(r.data) ?? [];
    lista.push(r);
    resgatesPorData.set(r.data, lista);
  }

  const datas = Array.from(
    new Set([...taxaPorData.keys(), ...aportesPorData.keys(), ...resgatesPorData.keys()])
  ).sort();

  let lotes: LoteEstado[] = [];
  const rendimentosDiarios: ResultadoSimulacao["rendimentosDiarios"] = [];
  const resgatesSimulados: ResgateSimulado[] = [];

  for (const data of datas) {
    // 1. rendimento do dia (só lotes aportados ANTES deste dia)
    const taxa = taxaPorData.get(data);
    if (taxa !== undefined) {
      let rendimentoDia = 0;
      for (const lote of lotes) {
        if (lote.data < data && lote.valorAtual > EPS) {
          const r = lote.valorAtual * (p.percentual / 100) * (taxa / 100);
          lote.valorAtual += r;
          rendimentoDia += r;
        }
      }
      if (rendimentoDia > 0) rendimentosDiarios.push({ data, valor: rendimentoDia, taxa });
    }

    // 2. aportes do dia
    for (const a of aportesPorData.get(data) ?? []) {
      lotes.push({ id: a.id, data: a.data, aportado: a.valor, principal: a.valor, valorAtual: a.valor });
    }

    // 3. resgates do dia
    for (const r of resgatesPorData.get(data) ?? []) {
      const totalAgora = lotes.reduce((s, l) => s + l.valorAtual, 0);
      const alvo = r.total ? totalAgora : r.valorBruto;
      const res = simularResgateFifo(lotes, alvo, data, p.tributacao);
      lotes = res.lotesApos;
      resgatesSimulados.push({
        id: r.id,
        data,
        bruto: res.bruto,
        rendimentoBruto: res.rendimentoBruto,
        impostoRetido: res.impostoRetido,
        valorLiquido: res.valorLiquido,
      });
    }
  }

  return {
    lotes,
    rendimentosDiarios,
    resgates: resgatesSimulados,
    valorAtual: lotes.reduce((s, l) => s + l.valorAtual, 0),
    principal: lotes.reduce((s, l) => s + l.principal, 0),
  };
}

/**
 * ESTIMATIVA: o BCB só publica a taxa de um dia depois. Pra não deixar o
 * valor exibido 1–2 dias atrás da corretora, projeta os dias úteis ainda
 * não publicados (de segunda a sexta, ANTES de hoje) repetindo a última
 * taxa conhecida. Feriados não são conhecidos aqui, então a projeção pode
 * passar um pouco — por isso é sempre mostrada como "estimado".
 */
export function projetarLotes(
  lotes: LoteEstado[],
  percentual: number,
  ultimaTaxa: TaxaDia | null,
  hoje: string
): { lotes: LoteEstado[]; diasProjetados: number } {
  const copia = lotes.map((l) => ({ ...l }));
  if (!ultimaTaxa) return { lotes: copia, diasProjetados: 0 };

  let diasProjetados = 0;
  for (let d = somarDias(ultimaTaxa.data, 1); d < hoje; d = somarDias(d, 1)) {
    const diaSemana = new Date(paraUtc(d)).getUTCDay(); // 0 dom, 6 sáb
    if (diaSemana === 0 || diaSemana === 6) continue;

    let rendeu = false;
    for (const lote of copia) {
      if (lote.data < d && lote.valorAtual > EPS) {
        lote.valorAtual += lote.valorAtual * (percentual / 100) * (ultimaTaxa.taxa / 100);
        rendeu = true;
      }
    }
    if (rendeu) diasProjetados++;
  }
  return { lotes: copia, diasProjetados };
}

/** IR estimado + líquido, caso TUDO fosse resgatado na data informada */
export function estimarLiquidoTotal(lotes: LoteEstado[], data: string, tributacao: Tributacao) {
  const total = lotes.reduce((s, l) => s + l.valorAtual, 0);
  const r = simularResgateFifo(lotes, total, data, tributacao);
  return {
    valorBruto: total,
    principal: lotes.reduce((s, l) => s + l.principal, 0),
    rendimentoBruto: r.rendimentoBruto,
    impostoRetido: r.impostoRetido,
    valorLiquido: r.valorLiquido,
    consumo: r.consumo,
  };
}