"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { extratoAgrupadoService } from "@/services/extratoAgrupadoService";
import type { FiltrosExtratoAgrupado, OrigemExtratoAgrupado } from "@/types/extratoAgrupado";

const CHAVE: Record<OrigemExtratoAgrupado, string> = {
  categorias: "categoria-extrato",
  estabelecimentos: "estabelecimento-extrato",
};

/** Extrato paginado de uma categoria ou estabelecimento. */
export function useExtratoAgrupado(origem: OrigemExtratoAgrupado, id: string, filtros: FiltrosExtratoAgrupado) {
  return useInfiniteQuery({
    // Prefixo "transacoes": é invalidado junto com qualquer mudança em transações
    queryKey: ["transacoes", CHAVE[origem], id, filtros.ano, filtros.mes, filtros.tipo, filtros.busca],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => extratoAgrupadoService.buscar(origem, id, filtros, pageParam),
    getNextPageParam: (ultima, todas) =>
      ultima.temMais ? todas.reduce((s, p) => s + p.lancamentos.length, 0) : undefined,
    staleTime: 2 * 60 * 1000,
  });
}
