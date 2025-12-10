import { useState, useMemo } from "react";
import { Transacao } from "@/types/transacao";

export function useMovimentacaoFiltro(transacoes: Transacao[]) {
  const [categoria, setCategoria] = useState<string | null>(null);
  const [busca, setBusca] = useState<string>("");
  const [valorMin, setValorMin] = useState<number | null>(null);
  const [valorMax, setValorMax] = useState<number | null>(null);
  const [aba, setAba] = useState<"todas" | "entrada" | "saida">("todas");

  const limparFiltros = () => {
    setCategoria(null);
    setBusca("");
    setValorMin(null);
    setValorMax(null);
    setAba("todas");
  };

  const transacoesFiltradas = useMemo(() => {
    return transacoes.filter((t) => {
      if (aba === "entrada" && t.tipo !== "Entrada") return false;
      if (aba === "saida" && t.tipo !== "Saída") return false;

      if (categoria && t.categoria !== categoria) return false;

      if (busca && !t.descricao.toLowerCase().includes(busca.toLowerCase()))
        return false;

      if (valorMin !== null && t.valor < valorMin) return false;
      if (valorMax !== null && t.valor > valorMax) return false;

      return true;
    });
  }, [transacoes, categoria, busca, valorMin, valorMax, aba]);

  return {
    categoria,
    setCategoria,
    busca,
    setBusca,
    valorMin,
    setValorMin,
    valorMax,
    setValorMax,
    aba,
    setAba,
    limparFiltros,
    transacoesFiltradas,
  };
}
