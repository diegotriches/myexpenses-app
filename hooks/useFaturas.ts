// src/hooks/useFaturas.ts
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { faturaService } from "@/services/faturaService";
import { useToast } from "@/hooks/use-toast";

// ✅ Importar tipos corretos
import type { FaturaDetalhada, PagarFaturaDTO } from "@/types/fatura";

/**
 * Query Keys para faturas
 * ⚠️ EXPORTADO para uso em outros módulos (invalidação de cache)
 */
export const faturasKeys = {
  byCartao: (cartaoId: string | number, ano: number, mes: number) => 
    ["faturas", "cartao", String(cartaoId), ano, mes] as const,
};

/**
 * Hook para buscar fatura de um cartão específico (com cache)
 * 
 * @param cartaoId - ID do cartão
 * @param ano - Ano da fatura
 * @param mes - Mês da fatura (1-12)
 * 
 * @example
 * const { fatura, transacoes, porCategoria, isLoading } = useFaturaCartao({
 *   cartaoId: "1",
 *   ano: 2026,
 *   mes: 1
 * });
 */
export function useFaturaCartao({
  cartaoId,
  ano,
  mes,
}: {
  cartaoId: string | number;
  ano: number;
  mes: number;
}) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: faturasKeys.byCartao(cartaoId, ano, mes),
    queryFn: async (): Promise<FaturaDetalhada> => {
      return faturaService.buscarFatura(cartaoId, ano, mes);
    },
    enabled: !!(cartaoId && ano && mes !== undefined),
    // Faturas mudam frequentemente, cache de 2 minutos
    staleTime: 2 * 60 * 1000,
  });

  return {
    // Dados
    fatura: data?.fatura || null,
    cartao: data?.cartao || null,
    periodo: data?.periodo || null,
    transacoes: data?.transacoes || [],
    totalTransacoes: data?.totalTransacoes || 0,
    porCategoria: data?.porCategoria || {},
    
    // Estados
    isLoading,
    error,
    
    // Ações
    refetch,
  };
}

/**
 * Hook para pagar fatura
 * 
 * @example
 * const pagarFatura = usePagarFatura();
 * await pagarFatura.mutateAsync({
 *   cartaoId: 1,
 *   ano: 2026,
 *   mes: 1,
 *   contaId: "123",
 *   dataPagamento: "2026-01-15"
 * });
 */
export function usePagarFatura() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      cartaoId,
      ano,
      mes,
      contaId,
      dataPagamento,
    }: {
      cartaoId: number | string;
      ano: number;
      mes: number;
      contaId: string;
      dataPagamento?: string;
    }) => {
      const dados: PagarFaturaDTO = {
        contaId,
        dataPagamento: dataPagamento || new Date().toISOString().split('T')[0],
      };
      
      return faturaService.pagar(cartaoId, ano, mes, dados);
    },
    onSuccess: (_, variables) => {
      // Invalida fatura específica
      queryClient.invalidateQueries({ 
        queryKey: faturasKeys.byCartao(variables.cartaoId, variables.ano, variables.mes) 
      });
      
      // Invalida lista de cartões (limite disponível mudou)
      queryClient.invalidateQueries({ queryKey: ["cartoes"] });
      
      // Invalida contas (saldo foi debitado)
      queryClient.invalidateQueries({ queryKey: ["contas"] });
      
      // Invalida dashboard e extrato
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["extrato"] });
      
      toast({
        title: "Fatura paga!",
        description: "O pagamento foi registrado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao pagar fatura",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook para estornar pagamento de fatura
 * 
 * @example
 * const estornarPagamento = useEstornarPagamento();
 * await estornarPagamento.mutateAsync({
 *   cartaoId: 1,
 *   ano: 2026,
 *   mes: 1
 * });
 */
export function useEstornarPagamento() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      cartaoId,
      ano,
      mes,
    }: {
      cartaoId: number | string;
      ano: number;
      mes: number;
    }) => {
      return faturaService.estornarPagamento(cartaoId, ano, mes);
    },
    onSuccess: (_, variables) => {
      // Invalida fatura específica
      queryClient.invalidateQueries({ 
        queryKey: faturasKeys.byCartao(variables.cartaoId, variables.ano, variables.mes) 
      });
      
      // Invalida lista de cartões (limite disponível mudou)
      queryClient.invalidateQueries({ queryKey: ["cartoes"] });
      
      // Invalida contas (saldo foi devolvido)
      queryClient.invalidateQueries({ queryKey: ["contas"] });
      
      // Invalida dashboard e extrato
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["extrato"] });
      
      toast({
        title: "Pagamento estornado!",
        description: "O estorno foi registrado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao estornar pagamento",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook genérico para buscar qualquer fatura (menos usado)
 * Útil para casos onde você precisa buscar uma fatura sob demanda
 * 
 * @example
 * const { buscarFatura } = useFaturas();
 * const data = await buscarFatura(1, 2026, 1);
 */
export function useFaturas() {
  const queryClient = useQueryClient();

  const buscarFatura = async (
    cartaoId: number | string,
    ano: number,
    mes: number
  ): Promise<FaturaDetalhada> => {
    // Busca do cache primeiro
    const cached = queryClient.getQueryData<FaturaDetalhada>(
      faturasKeys.byCartao(cartaoId, ano, mes)
    );
    if (cached) return cached;

    // Se não estiver em cache, busca da API
    const data = await faturaService.buscarFatura(cartaoId, ano, mes);
    
    // Salva no cache
    queryClient.setQueryData(faturasKeys.byCartao(cartaoId, ano, mes), data);
    
    return data;
  };

  return {
    buscarFatura,
  };
}