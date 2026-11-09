"use client";

import { useQueries } from "@tanstack/react-query";
import { faturaService } from "@/services/faturaService";
import { faturasKeys } from "@/hooks/useFaturas";
import type { FaturaDetalhada } from "@/types/fatura";

// ============================================================================
// HELPERS
// ============================================================================

/** Retorna os últimos N meses incluindo o atual, em ordem do mais antigo ao mais recente */
function gerarUltimosMeses(n: number): { mes: number; ano: number }[] {
  const resultado: { mes: number; ano: number }[] = [];
  const hoje = new Date();

  for (let i = n - 1; i >= 0; i--) {
    const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    resultado.push({ mes: data.getMonth() + 1, ano: data.getFullYear() });
  }

  return resultado;
}

// ============================================================================
// TIPOS
// ============================================================================

export interface FaturaPendente {
  mes: number;       // 1-12
  ano: number;
  total: number;
  status: "EM_ABERTO" | "ATRASADA";
  dataVencimento: string | null;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Busca os últimos 4 meses de faturas de um cartão em paralelo
 * e retorna apenas as que estão pendentes (não pagas).
 *
 * Aproveita o cache do React Query — sem requisições duplicadas.
 */
export function useFaturasPendentes(cartaoId: string | number) {
  const periodos = gerarUltimosMeses(4);

  const queries = useQueries({
    queries: periodos.map(({ mes, ano }) => ({
      queryKey: faturasKeys.byCartao(cartaoId, ano, mes),
      queryFn: async (): Promise<FaturaDetalhada> =>
        faturaService.buscarFatura(cartaoId, ano, mes),
      enabled: !!cartaoId,
      staleTime: 2 * 60 * 1000,
      // Não lançar erro se fatura não existir (mês sem transações)
      retry: false,
    })),
  });

  const isLoading = queries.some((q) => q.isLoading);

  const pendentes: FaturaPendente[] = queries
    .map((q, i): FaturaPendente | null => {
      const data = q.data as FaturaDetalhada | undefined;
      if (!data?.fatura) return null;
      if (data.fatura.paga) return null;
      if (data.transacoes.length === 0) return null;

      return {
        mes: periodos[i].mes,
        ano: periodos[i].ano,
        total: Number(data.fatura.total ?? 0),
        status: data.fatura.status === "ATRASADA" ? "ATRASADA" : "EM_ABERTO",
        dataVencimento: data.fatura.dataVencimento ?? null,
      };
    })
    .filter((p): p is FaturaPendente => p !== null)
    // Mais antigas primeiro
    .sort((a, b) => {
      if (a.ano !== b.ano) return a.ano - b.ano;
      return a.mes - b.mes;
    });

  return { pendentes, isLoading };
}