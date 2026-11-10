// Investimentos no ano e dados para a declaração de IR (Resumo Anual).
//
// Período: de 31/12 do ano anterior até 31/12 do ano (anos fechados) ou até
// hoje (ano corrente). Os valores passados são reconstruídos:
//  - contas: saldo atual menos o extrato depois da data (vem da rota);
//  - renda fixa: simulação com a última taxa publicada (estimativa);
//  - renda variável: custo de aquisição (não há histórico de cotações); hoje,
//    valor de mercado.
// A declaração junta o que costuma ser preenchido à mão: bens e direitos em
// 31/12, rendimentos isentos, tributação exclusiva e os DARFs do ano. É uma
// conferência; os informes de rendimentos de bancos e corretoras prevalecem.

import { liquidoAtualAplicacao, valorAplicacaoEm, custoRendaVariavelEm, mercadoRendaVariavel, type AplicacaoParaPatrimonio } from "./patrimonioUtils";
import { apurarMeses, apurarVendas, bensEDireitosEm, type BemDireito, type ConfigIr, type OperacaoIr } from "./irRendaVariavelUtils";
import { r2, type CotacaoRv } from "./rendaVariavelUtils";
import type { TipoProvento } from "./proventosUtils";

export interface AplicacaoResumo extends AplicacaoParaPatrimonio {
  id: string;
  descricao: string | null;
}

export interface ContaNoPeriodo {
  id: string;
  nome: string;
  ativo: boolean;
  saldoInicio: number;
  saldoFim: number;
}

export interface EntradaInvestimentosAno {
  ano: number;
  hoje: string;
  contas: ContaNoPeriodo[];
  aplicacoes: AplicacaoResumo[];
  operacoes: OperacaoIr[];
  cotacoes: CotacaoRv[];
  proventos: { ticker: string; tipo: TipoProvento; data: string; valorLiquido: number }[];
  configIr: ConfigIr;
  darfsPagos: string[];
}

export interface FotoPatrimonio {
  contas: number;
  rendaFixa: number;
  rendaVariavel: number;
  total: number;
}

export interface InvestimentosAno {
  inicio: string; // 31/12 do ano anterior
  fim: string; // 31/12 do ano ou hoje
  fimEhHoje: boolean;
  patrimonio: { inicio: FotoPatrimonio; fim: FotoPatrimonio; variacao: number };
  rendaFixa: { inicio: number; fim: number; aportes: number; resgates: number; rendimento: number };
  rendaVariavel: { custoInicio: number; valorFim: number; resultadoRealizado: number; ganhoIsento: number; impostoApurado: number };
  proventos: { dividendos: number; rendimentos: number; jcp: number; total: number };
  darfs: { competencia: string; valor: number; vencimento: string; pago: boolean }[];
  declaracao: {
    rendaVariavel: BemDireito[];
    aplicacoes: { descricao: string; bruto: number }[];
    contas: { nome: string; saldo: number }[];
    isentos: { dividendos: number; rendimentosFii: number; ganhoIsentoAcoes: number };
    exclusivos: { jcp: number };
  };
}

const noPeriodo = (data: string, inicio: string, fim: string) => data > inicio && data <= fim;

function foto(contas: number, rendaFixa: number, rendaVariavel: number): FotoPatrimonio {
  return { contas: r2(contas), rendaFixa: r2(rendaFixa), rendaVariavel: r2(rendaVariavel), total: r2(contas + rendaFixa + rendaVariavel) };
}

export function resumirInvestimentosDoAno(e: EntradaInvestimentosAno): InvestimentosAno {
  const anoHoje = Number(e.hoje.slice(0, 4));
  const fimEhHoje = e.ano >= anoHoje;
  const inicio = `${e.ano - 1}-12-31`;
  const fim = fimEhHoje ? e.hoje : `${e.ano}-12-31`;
  const prefixoAno = `${e.ano}-`;

  // ── Renda fixa
  const rfInicio = e.aplicacoes.reduce((s, a) => s + valorAplicacaoEm(a, inicio).liquido, 0);
  const rfFim = fimEhHoje
    ? e.aplicacoes.filter((a) => !a.resgatada).reduce((s, a) => s + liquidoAtualAplicacao(a, e.hoje), 0)
    : e.aplicacoes.reduce((s, a) => s + valorAplicacaoEm(a, fim).liquido, 0);
  const aportes = e.aplicacoes.reduce(
    (s, a) => s + (a.aportes ?? []).filter((x) => noPeriodo(x.data, inicio, fim)).reduce((t, x) => t + Number(x.valor), 0), 0);
  const resgates = e.aplicacoes.reduce(
    (s, a) => s + (a.resgates ?? []).filter((r) => noPeriodo(r.data, inicio, fim)).reduce((t, r) => t + Number(r.valorLiquido ?? r.valorBruto), 0), 0);

  // ── Renda variável
  const rvInicio = custoRendaVariavelEm(e.operacoes, inicio);
  const rvFim = fimEhHoje ? mercadoRendaVariavel(e.operacoes, e.cotacoes) : custoRendaVariavelEm(e.operacoes, fim);
  const vendasDoAno = apurarVendas(e.operacoes).filter((v) => v.data.startsWith(prefixoAno));
  const mesesIr = apurarMeses(apurarVendas(e.operacoes), e.configIr).filter((m) => m.competencia.startsWith(prefixoAno));
  const pagos = new Set(e.darfsPagos);

  // ── Proventos do ano, por tipo
  const doAno = e.proventos.filter((p) => p.data.startsWith(prefixoAno));
  const somaTipo = (tipo: TipoProvento) => r2(doAno.filter((p) => p.tipo === tipo).reduce((s, p) => s + p.valorLiquido, 0));
  const proventos = { dividendos: somaTipo("dividendo"), rendimentos: somaTipo("rendimento"), jcp: somaTipo("jcp"), total: 0 };
  proventos.total = r2(proventos.dividendos + proventos.rendimentos + proventos.jcp);

  // ── Contas (patrimônio considera as ativas, como o resto do app)
  const ativas = e.contas.filter((c) => c.ativo);
  const contasInicio = ativas.reduce((s, c) => s + c.saldoInicio, 0);
  const contasFim = ativas.reduce((s, c) => s + c.saldoFim, 0);

  const fotoInicio = foto(contasInicio, rfInicio, rvInicio);
  const fotoFim = foto(contasFim, rfFim, rvFim);
  const ganhoIsento = r2(mesesIr.reduce((s, m) => s + m.ganhoIsento, 0));

  return {
    inicio,
    fim,
    fimEhHoje,
    patrimonio: { inicio: fotoInicio, fim: fotoFim, variacao: r2(fotoFim.total - fotoInicio.total) },
    rendaFixa: {
      inicio: r2(rfInicio),
      fim: r2(rfFim),
      aportes: r2(aportes),
      resgates: r2(resgates),
      rendimento: r2(rfFim - rfInicio - aportes + resgates),
    },
    rendaVariavel: {
      custoInicio: r2(rvInicio),
      valorFim: r2(rvFim),
      resultadoRealizado: r2(vendasDoAno.reduce((s, v) => s + v.resultado, 0)),
      ganhoIsento,
      impostoApurado: r2(mesesIr.reduce((s, m) => s + m.imposto.total, 0)),
    },
    proventos,
    darfs: mesesIr
      .filter((m) => m.darf)
      .map((m) => ({ competencia: m.competencia, valor: m.darf!.valor, vencimento: m.darf!.vencimento, pago: pagos.has(m.competencia) })),
    declaracao: {
      rendaVariavel: bensEDireitosEm(e.operacoes, fim),
      aplicacoes: e.aplicacoes
        .map((a) => ({
          descricao: a.descricao || "Aplicação",
          // Hoje: valor bruto real dos aportes; 31/12 passado: reconstruído pela simulação
          bruto: fimEhHoje
            ? (a.resgatada ? 0 : r2((a.aportes ?? []).reduce((s, x) => s + Number(x.valorAtual), 0)))
            : valorAplicacaoEm(a, fim).bruto,
        }))
        .filter((a) => a.bruto > 0)
        .sort((a, b) => b.bruto - a.bruto),
      contas: e.contas
        .filter((c) => Math.abs(c.saldoFim) >= 0.01)
        .map((c) => ({ nome: c.nome, saldo: r2(c.saldoFim) }))
        .sort((a, b) => b.saldo - a.saldo),
      isentos: { dividendos: proventos.dividendos, rendimentosFii: proventos.rendimentos, ganhoIsentoAcoes: ganhoIsento },
      exclusivos: { jcp: proventos.jcp },
    },
  };
}
