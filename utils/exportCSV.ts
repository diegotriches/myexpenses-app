import type { Transacao } from "../types/transacao";

export function exportarCSV(transacoes: Transacao[], nomeArquivo = "movimentacoes.csv") {
  if (transacoes.length === 0) {
    alert("Não há movimentações para exportar.");
    return;
  }

  const headers = [
    "id",
    "descricao",
    "valor",
    "tipo",
    "categoria",
    "data",
    "parcela",
    "recorrente",
    "formaPagamento",
    "cartaoId",
  ];

  const linhas = transacoes.map((t) => [
    t.id,
    t.descricao,
    t.valor,
    t.tipo,
    t.categoria,
    t.data,
    t.parcela || "",
    t.recorrente ? "true" : "false",
    t.formaPagamento,
    t.cartaoId ?? "",
  ]);

  const csvContent =
    "data:text/csv;charset=utf-8," +
    [headers.join(","), ...linhas.map((linha) => linha.join(","))].join("\n");

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", nomeArquivo);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}