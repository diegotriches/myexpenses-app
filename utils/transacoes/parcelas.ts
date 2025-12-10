import { Transacao } from "@/types/transacao";

export function gerarParcelas(
  base: Omit<Transacao, "id">,
  quantidade: number
): Omit<Transacao, "id">[] {
  const data = new Date(base.data);
  const parcelas: Omit<Transacao, "id">[] = [];

  for (let i = 1; i <= quantidade; i++) {
    const novaData = new Date(data);
    novaData.setMonth(data.getMonth() + (i - 1));

    parcelas.push({
      ...base,
      parcela: `${i}/${quantidade}`,
      data: novaData.toISOString().split("T")[0],
      recorrente: false,
    });
  }

  return parcelas;
}
