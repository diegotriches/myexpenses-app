// src/hooks/useMovimentacaoFiltro.ts
"use client";

import { useState, useMemo } from "react";
import { Transacao } from "@/types/transacao";

/**
 * Hook para filtrar transações no lado do cliente
 * 
 * @param transacoes - Array de transações para filtrar
 * 
 * @example
 * const { data: transacoes } = useTransacoes();
 * const {
 *   transacoesFiltradas,
 *   busca,
 *   setBusca,
 *   categoria,
 *   setCategoria,
 *   limparFiltros
 * } = useMovimentacaoFiltro(transacoes || []);
 * 
 * // Usar filtros
 * <input value={busca} onChange={(e) => setBusca(e.target.value)} />
 * <select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
 *   ...
 * </select>
 * 
 * // Exibir resultados filtrados
 * {transacoesFiltradas.map(t => <TransacaoCard key={t.id} {...t} />)}
 */
export function useMovimentacaoFiltro(transacoes: Transacao[]) {
  // Estados dos filtros
  const [categoria, setCategoria] = useState<string | null>(null);
  const [busca, setBusca] = useState<string>("");
  const [valorMin, setValorMin] = useState<number | null>(null);
  const [valorMax, setValorMax] = useState<number | null>(null);
  const [aba, setAba] = useState<"todas" | "entrada" | "saida">("todas");

  /**
   * Limpa todos os filtros
   */
  const limparFiltros = () => {
    setCategoria(null);
    setBusca("");
    setValorMin(null);
    setValorMax(null);
    setAba("todas");
  };

  /**
   * Transações filtradas usando useMemo para performance
   * Só recalcula quando transacoes ou filtros mudarem
   */
  const transacoesFiltradas = useMemo(() => {
    return transacoes.filter((t) => {
      // Filtro por tipo (aba)
      if (aba === "entrada" && t.tipo !== "entrada") return false;
      if (aba === "saida" && t.tipo !== "saida") return false;

      // Filtro por categoria
      if (categoria && t.categoria !== categoria) return false;

      // Filtro por busca na descrição (case insensitive)
      if (busca && !(t.descricao?.toLowerCase().includes(busca.toLowerCase()) ?? false))
        return false;

      // Filtro por valor mínimo (converte string para number)
      if (valorMin !== null && Number(t.valor) < valorMin) return false;
      
      // Filtro por valor máximo (converte string para number)
      if (valorMax !== null && Number(t.valor) > valorMax) return false;

      return true;
    });
  }, [transacoes, categoria, busca, valorMin, valorMax, aba]);

  return {
    // Estados dos filtros
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
    
    // Funções
    limparFiltros,
    
    // Resultado
    transacoesFiltradas,
  };
}