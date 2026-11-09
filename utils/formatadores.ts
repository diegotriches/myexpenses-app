const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/**
 * Valor em reais no padrão brasileiro ("R$ 1.234,50").
 * Aceita o decimal em texto que vem do banco ("1234.5"); valor ausente ou inválido vira R$ 0,00.
 */
export function formatarMoeda(valor: number | string | null | undefined): string {
  const numero = typeof valor === "string" ? parseFloat(valor) : Number(valor ?? 0);
  return BRL.format(Number.isFinite(numero) ? numero : 0);
}
