// Seletor Todas / Receitas / Despesas da página de Movimentações.
// Estorno é dinheiro que volta de uma compra: fica em Despesas, junto da compra,
// abatendo o gasto. Não é receita.

export type FiltroTipo = "todas" | "entrada" | "saida";

export function passaFiltroTipo(tipoMovimentacao: string, filtro: FiltroTipo): boolean {
  if (filtro === "todas") return true;
  if (filtro === "entrada") return tipoMovimentacao === "entrada";
  return tipoMovimentacao === "saida" || tipoMovimentacao === "estorno";
}

/** Quantas movimentações cada opção do seletor mostraria. */
export function contarPorTipo(lista: { tipo: string }[]): Record<FiltroTipo, number> {
  const contagem: Record<FiltroTipo, number> = { todas: lista.length, entrada: 0, saida: 0 };
  for (const m of lista) {
    if (passaFiltroTipo(m.tipo, "entrada")) contagem.entrada++;
    if (passaFiltroTipo(m.tipo, "saida")) contagem.saida++;
  }
  return contagem;
}
