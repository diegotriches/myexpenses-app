//
// Apuração mensal do imposto de renda sobre renda variável (ações, FIIs, ETFs, BDRs).
//
// Regras aplicadas (todas as alíquotas e o limite de isenção são configuráveis):
//  - Operações comuns (swing trade): resultado de cada venda = valor líquido − custo
//    baixado pelo preço médio.
//  - Ações: vendas totais (swing) no mês até o limite (R$ 20 mil) → ganho isento.
//    Acima do limite o ganho é tributado. Prejuízos sempre acumulam.
//  - ETFs e BDRs: sem isenção. FIIs: sem isenção, alíquota própria.
//  - Day trade (compra e venda do mesmo ativo no mesmo dia): apurado à parte, sem isenção.
//  - Compensação de prejuízo: três "caixas" independentes, sem prazo de validade:
//      comum (ações + ETFs + BDRs), FII e day trade. Ganho isento de ações não consome prejuízo.
//  - DARF (código 6015): vence no último dia útil do mês seguinte; abaixo de R$ 10,00
//    o imposto é acumulado para o mês seguinte.
//  - IRRF "dedo-duro" não é considerado (é só antecipação do imposto devido).
//
// Limitação: quando a data do negócio é estimada (importação da B3), day trade não é
// detectado e vendas perto da virada do mês podem cair no mês errado — o mês é sinalizado.

import {
  apurarTicker, calcularPosicoes, r2,
  type OperacaoRv, type TipoAtivo,
} from "./rendaVariavelUtils";
import { ehDiaUtilBancario } from "./calendarioB3";

export interface ConfigIr {
  aliquotaAcao: number; // % swing
  aliquotaEtf: number;
  aliquotaBdr: number;
  aliquotaFii: number;
  aliquotaDayTrade: number;
  limiteIsencaoAcoes: number; // R$ de vendas de ações no mês
  prejuizoInicialComum: number; // prejuízo acumulado de meses anteriores aos dados
  prejuizoInicialFii: number;
  prejuizoInicialDayTrade: number;
}

export const CONFIG_IR_PADRAO: ConfigIr = {
  aliquotaAcao: 15,
  aliquotaEtf: 15,
  aliquotaBdr: 15,
  aliquotaFii: 20,
  aliquotaDayTrade: 20,
  limiteIsencaoAcoes: 20000,
  prejuizoInicialComum: 0,
  prejuizoInicialFii: 0,
  prejuizoInicialDayTrade: 0,
};

export const DARF_MINIMO = 10;
export const DARF_CODIGO = "6015";

export type OperacaoIr = OperacaoRv & { dataEstimada?: boolean };

export interface VendaIr {
  ticker: string;
  tipoAtivo: TipoAtivo;
  data: string;
  quantidade: number;
  valorBruto: number; // quantidade × preço
  resultado: number; // líquido de taxas, depois do custo
  dayTrade: boolean;
  estimada: boolean;
}

/** Resultado de cada venda, separando day trade (mesmo ativo, mesmo dia) das operações comuns. */
export function apurarVendas(ops: OperacaoIr[]): VendaIr[] {
  const porTicker = new Map<string, OperacaoIr[]>();
  for (const o of ops) {
    const l = porTicker.get(o.ticker) ?? [];
    l.push(o);
    porTicker.set(o.ticker, l);
  }

  const vendas: VendaIr[] = [];
  for (const [ticker, lista] of Array.from(porTicker.entries())) {
    const tipoAtivo = lista[0].tipoAtivo;
    for (const v of apurarTicker(lista).vendas) {
      vendas.push({
        ticker, tipoAtivo, data: v.data, quantidade: v.quantidade,
        valorBruto: v.valorBruto, resultado: v.resultado,
        dayTrade: v.dayTrade, estimada: v.estimada,
      });
    }
  }

  return vendas.sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0));
}

// ── Apuração mensal ─────────────────────────────────────────────────────────

type Caixa = "comum" | "fii" | "day";

export interface MesIr {
  competencia: string; // YYYY-MM
  vendasAcoes: number; // swing, bruto
  resultado: { acao: number; etf: number; bdr: number; fii: number; dayTrade: number; total: number };
  acaoIsenta: boolean;
  ganhoIsento: number;
  compensado: Record<Caixa, number>;
  base: Record<Caixa, number>;
  imposto: Record<Caixa, number> & { total: number };
  prejuizoFinal: Record<Caixa, number>;
  darf: null | { valor: number; vencimento: string; codigo: string; acumuladoAnterior: number };
  impostoPendente: number; // < R$ 10 acumulado para o mês seguinte
  estimado: boolean;
}

function apurarCaixa(parcelas: { valor: number; aliq: number }[], pool: number) {
  const net = parcelas.reduce((s, p) => s + p.valor, 0);
  if (net <= 0) return { compensado: 0, base: 0, imposto: 0, pool: pool + -net };
  const comp = Math.min(pool, net);
  const base = net - comp;
  const pos = parcelas.filter((p) => p.valor > 0);
  const somaPos = pos.reduce((s, p) => s + p.valor, 0);
  const aliq = pos.reduce((s, p) => s + p.valor * p.aliq, 0) / somaPos; // média ponderada (%)
  return { compensado: comp, base, imposto: (base * aliq) / 100, pool: pool - comp };
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Último dia útil bancário do mês seguinte à competência. */
export function vencimentoDarf(competencia: string): string {
  const [a, m] = competencia.split("-").map(Number);
  let d = new Date(Date.UTC(a, m + 1, 0)); // último dia do mês seguinte (m é 1-based → m+1 index)
  while (!ehDiaUtilBancario(iso(d))) {
    d = new Date(d.getTime() - 86400000);
  }
  return iso(d);
}

export function apurarMeses(vendas: VendaIr[], cfg: ConfigIr): MesIr[] {
  const porMes = new Map<string, VendaIr[]>();
  for (const v of vendas) {
    const k = v.data.slice(0, 7);
    const l = porMes.get(k) ?? [];
    l.push(v);
    porMes.set(k, l);
  }

  const aliqTipo: Record<TipoAtivo, number> = {
    acao: cfg.aliquotaAcao, etf: cfg.aliquotaEtf, bdr: cfg.aliquotaBdr, fii: cfg.aliquotaFii,
  };

  const pool: Record<Caixa, number> = {
    comum: cfg.prejuizoInicialComum, fii: cfg.prejuizoInicialFii, day: cfg.prejuizoInicialDayTrade,
  };
  let pendente = 0;
  const out: MesIr[] = [];

  for (const competencia of Array.from(porMes.keys()).sort()) {
    const vs = porMes.get(competencia)!;
    const swing = vs.filter((v) => !v.dayTrade);
    const dt = vs.filter((v) => v.dayTrade);

    const res = { acao: 0, etf: 0, bdr: 0, fii: 0 };
    swing.forEach((v) => { res[v.tipoAtivo] += v.resultado; });
    const resDay = dt.reduce((s, v) => s + v.resultado, 0);
    const vendasAcoes = swing.filter((v) => v.tipoAtivo === "acao").reduce((s, v) => s + v.valorBruto, 0);

    const isenta = vendasAcoes <= cfg.limiteIsencaoAcoes && res.acao > 0;
    const ganhoIsento = isenta ? res.acao : 0;

    const comum = apurarCaixa(
      [
        { valor: isenta ? 0 : res.acao, aliq: aliqTipo.acao },
        { valor: res.etf, aliq: aliqTipo.etf },
        { valor: res.bdr, aliq: aliqTipo.bdr },
      ],
      pool.comum,
    );
    const fii = apurarCaixa([{ valor: res.fii, aliq: aliqTipo.fii }], pool.fii);
    const day = apurarCaixa([{ valor: resDay, aliq: cfg.aliquotaDayTrade }], pool.day);
    pool.comum = comum.pool; pool.fii = fii.pool; pool.day = day.pool;

    const imposto = { comum: r2(comum.imposto), fii: r2(fii.imposto), day: r2(day.imposto), total: 0 };
    imposto.total = r2(imposto.comum + imposto.fii + imposto.day);

    const acumulado = r2(imposto.total + pendente);
    let darf: MesIr["darf"] = null;
    if (acumulado >= DARF_MINIMO) {
      darf = { valor: acumulado, vencimento: vencimentoDarf(competencia), codigo: DARF_CODIGO, acumuladoAnterior: r2(pendente) };
      pendente = 0;
    } else {
      pendente = acumulado;
    }

    out.push({
      competencia,
      vendasAcoes: r2(vendasAcoes),
      resultado: {
        acao: r2(res.acao), etf: r2(res.etf), bdr: r2(res.bdr), fii: r2(res.fii), dayTrade: r2(resDay),
        total: r2(res.acao + res.etf + res.bdr + res.fii + resDay),
      },
      acaoIsenta: isenta,
      ganhoIsento: r2(ganhoIsento),
      compensado: { comum: r2(comum.compensado), fii: r2(fii.compensado), day: r2(day.compensado) },
      base: { comum: r2(comum.base), fii: r2(fii.base), day: r2(day.base) },
      imposto,
      prejuizoFinal: { comum: r2(pool.comum), fii: r2(pool.fii), day: r2(pool.day) },
      darf,
      impostoPendente: r2(pendente),
      estimado: vs.some((v) => v.estimada),
    });
  }
  return out;
}

// ── Resumo anual e bens e direitos ──────────────────────────────────────────

export interface ResumoAnualIr {
  ano: number;
  resultado: number;
  ganhoIsento: number;
  impostoDevido: number;
  vendasAcoes: number;
}

export function resumirAnos(meses: MesIr[]): ResumoAnualIr[] {
  const m = new Map<number, ResumoAnualIr>();
  for (const x of meses) {
    const ano = Number(x.competencia.slice(0, 4));
    const r = m.get(ano) ?? { ano, resultado: 0, ganhoIsento: 0, impostoDevido: 0, vendasAcoes: 0 };
    r.resultado = r2(r.resultado + x.resultado.total);
    r.ganhoIsento = r2(r.ganhoIsento + x.ganhoIsento);
    r.impostoDevido = r2(r.impostoDevido + x.imposto.total);
    r.vendasAcoes = r2(r.vendasAcoes + x.vendasAcoes);
    m.set(ano, r);
  }
  return Array.from(m.values()).sort((a, b) => b.ano - a.ano);
}

export interface BemDireito {
  ticker: string;
  tipoAtivo: TipoAtivo;
  quantidade: number;
  custoTotal: number; // custo de aquisição (valor a declarar)
}

/** Posições em uma data (normalmente 31/12), com o custo de aquisição. */
export function bensEDireitosEm(ops: OperacaoRv[], ate: string): BemDireito[] {
  return calcularPosicoes(ops.filter((o) => o.data <= ate))
    .filter((p) => p.quantidade > 0)
    .map((p) => ({ ticker: p.ticker, tipoAtivo: p.tipoAtivo, quantidade: p.quantidade, custoTotal: r2(p.custoTotal) }))
    .sort((a, b) => a.ticker.localeCompare(b.ticker));
}

/**
 * Meses com DARF gerado e ainda não marcado como pago (marcar é só controle do usuário).
 * Usado na seção de IR e no sinal da aba "Imposto de renda".
 */
export function darfsEmAberto<M extends Pick<MesIr, "competencia" | "darf">>(meses: M[], pagos: Iterable<string>): M[] {
  const jaPagos = new Set(pagos);
  return meses.filter((m) => m.darf && !jaPagos.has(m.competencia));
}
