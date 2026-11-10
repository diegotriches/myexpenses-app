// Valor da renda variável para a evolução do patrimônio.
//
// O app guarda só a cotação atual de cada ativo, não o histórico de preços.
// Por isso os meses passados usam o custo de aquisição da carteira naquela
// data (sai das operações, com o mesmo motor do IR), e o mês atual usa o
// valor de mercado. A diferença no mês atual é o ganho ainda não realizado.

import { calcularPosicoes, r2, resumirCarteira, type CotacaoRv, type OperacaoApuravel } from "./rendaVariavelUtils";

/** Custo de aquisição das posições abertas ao fim do dia `data` (inclusive). */
export function custoRendaVariavelEm(ops: OperacaoApuravel[], data: string): number {
  const posicoes = calcularPosicoes(ops.filter((o) => o.data <= data));
  return r2(posicoes.filter((p) => p.quantidade > 0).reduce((s, p) => s + p.custoTotal, 0));
}

/** Valor de mercado da carteira hoje (ativo sem cotação entra pelo custo), como na página Contas. */
export function mercadoRendaVariavel(ops: OperacaoApuravel[], cotacoes: CotacaoRv[]): number {
  return resumirCarteira(ops, cotacoes).valorMercado;
}
