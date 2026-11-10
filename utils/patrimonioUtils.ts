// Patrimônio e investimentos para o dashboard e a página Contas.
//
// Renda variável: o app guarda só a cotação atual de cada ativo, não o
// histórico de preços. Por isso os meses passados usam o custo de aquisição da
// carteira naquela data (sai das operações, com o mesmo motor do IR), e o mês
// atual usa o valor de mercado. A diferença no mês atual é o ganho ainda não
// realizado.
//
// Renda fixa: valor LÍQUIDO estimado (rendimento confirmado pelo BCB + projeção
// dos dias úteis ainda não publicados, descontado o IR que seria retido se tudo
// fosse resgatado hoje), o mesmo cálculo da aba Aplicações.

import { calcularPosicoes, r2, resumirCarteira, type CotacaoRv, type OperacaoApuravel } from "./rendaVariavelUtils";
import { estimarLiquidoTotal, projetarLotes, type LoteEstado, type TaxaDia } from "./aplicacaoSimulacao";
import type { Tributacao } from "./aplicacaoUtils";

/** Custo de aquisição das posições abertas ao fim do dia `data` (inclusive). */
export function custoRendaVariavelEm(ops: OperacaoApuravel[], data: string): number {
  const posicoes = calcularPosicoes(ops.filter((o) => o.data <= data));
  return r2(posicoes.filter((p) => p.quantidade > 0).reduce((s, p) => s + p.custoTotal, 0));
}

/** Valor de mercado da carteira hoje (ativo sem cotação entra pelo custo), como na página Contas. */
export function mercadoRendaVariavel(ops: OperacaoApuravel[], cotacoes: CotacaoRv[]): number {
  return resumirCarteira(ops, cotacoes).valorMercado;
}

/** Campos da aplicação usados no valor atual (o tipo da API tem mais campos). */
export interface AplicacaoParaPatrimonio {
  percentualIndexador: string | number;
  tributacao: Tributacao;
  rendeNoDiaAporte: boolean;
  resgatada: boolean;
  ultimaTaxa: TaxaDia | null;
  aportes?: { id: string; data: string; valor: string | number; principalRestante: string | number; valorAtual: string | number }[];
}

/** Valor líquido estimado de uma aplicação hoje. */
export function liquidoAtualAplicacao(a: AplicacaoParaPatrimonio, hoje: string): number {
  const lotes: LoteEstado[] = (a.aportes ?? []).map((x) => ({
    id: x.id,
    data: x.data,
    aportado: Number(x.valor),
    principal: Number(x.principalRestante),
    valorAtual: Number(x.valorAtual),
  }));
  const proj = projetarLotes(lotes, Number(a.percentualIndexador), a.ultimaTaxa, hoje, a.rendeNoDiaAporte);
  return estimarLiquidoTotal(proj.lotes, hoje, a.tributacao).valorLiquido;
}

export interface ResumoRendaFixa {
  quantidade: number;
  principal: number; // o que ainda está aplicado (principal dos aportes, já descontados os resgates)
  liquido: number;
  rendimentoLiquido: number;
}

/** Aplicações ativas: principal ainda aplicado, valor líquido hoje e o rendimento líquido entre os dois. */
export function resumirRendaFixa(aplicacoes: AplicacaoParaPatrimonio[], hoje: string): ResumoRendaFixa {
  const ativas = aplicacoes.filter((a) => !a.resgatada);
  const principal = ativas.reduce((s, a) => s + (a.aportes ?? []).reduce((t, x) => t + Number(x.principalRestante), 0), 0);
  const liquido = ativas.reduce((s, a) => s + liquidoAtualAplicacao(a, hoje), 0);
  return {
    quantidade: ativas.length,
    principal: r2(principal),
    liquido: r2(liquido),
    rendimentoLiquido: r2(liquido - principal),
  };
}
