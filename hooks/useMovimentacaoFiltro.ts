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
      // Filtro por tipo (aba)
      if (aba === "entrada" && t.tipo !== "entrada") return false;
      if (aba === "saida" && t.tipo !== "saida") return false;

      // Filtro por categoria
      if (categoria && t.categoria !== categoria) return false;

      // Filtro por busca na descrição
      if (busca && !(t.descricao?.toLowerCase().includes(busca.toLowerCase()) ?? false))
        return false;

      // Filtro por valor mínimo - converter string para number
      if (valorMin !== null && Number(t.valor) < valorMin) return false;
      
      // Filtro por valor máximo - converter string para number
      if (valorMax !== null && Number(t.valor) > valorMax) return false;

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