import { Transacao } from "@/types/transacao";

interface FaturaDetalhes {
  total: number;
  porCategoria: Record<string, number>;
  transacoesDoMes: Transacao[];
}

export function calcularFatura(transacoes: Transacao[], ano: number, mes: number): FaturaDetalhes {
  const transacoesDoMes = transacoes.filter((t) => {
    const data = new Date(t.data);
    return data.getFullYear() === ano && data.getMonth() + 1 === mes; // getMonth() 0-indexed
  });

  const porCategoria: Record<string, number> = {};
  let total = 0;

  transacoesDoMes.forEach((t) => {
    const valor = Number(t.valor) || 0;
    total += valor;

    if (t.categoria) {
      porCategoria[t.categoria] = (porCategoria[t.categoria] || 0) + valor;
    }
  });

  return { total, porCategoria, transacoesDoMes };
}