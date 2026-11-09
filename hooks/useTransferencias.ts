"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { transferenciaService } from "@/services/transferenciaService";
import { usePeriodo } from "@/contexts/PeriodoContext";
import { useToast } from "@/hooks/use-toast";

// ✅ Importar tipos corretos
import type {
  CreateTransferenciaDTO,
  FiltrosTransferencia,
} from "@/types/transferencia";

/**
 * Query Keys para transferências
 */
export const transferenciasKeys = {
  all: (ano: number, mes: number) => ["transferencias", ano, mes] as const,
  byId: (id: string) => ["transferencias", id] as const,
  filtered: (filters: FiltrosTransferencia) => ["transferencias", filters] as const,
};

/**
 * Hook para listar transferências do período (com cache)
 * Usa automaticamente mesSelecionado e anoSelecionado do PeriodoContext
 * 
 * @example
 * const { data: transferencias, isLoading, error } = useTransferencias();
 */
export function useTransferencias() {
  const { mesSelecionado, anoSelecionado } = usePeriodo();

  return useQuery({
    queryKey: transferenciasKeys.all(anoSelecionado, mesSelecionado + 1),
    queryFn: () =>
      transferenciaService.listar({
        ano: anoSelecionado,
        mes: mesSelecionado + 1,
      }),
    // Transferências mudam menos que transações, cache de 3 minutos
    staleTime: 3 * 60 * 1000,
  });
}

/**
 * Hook para criar transferência
 * 
 * @example
 * const criarTransferencia = useCriarTransferencia();
 * await criarTransferencia.mutateAsync({
 *   contaOrigemId: "123",
 *   contaDestinoId: "456",
 *   valor: 500,
 *   descricao: "Transferência entre contas",
 *   data: "2026-01-08"
 * });
 */
export function useCriarTransferencia() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (dados: CreateTransferenciaDTO) => 
      transferenciaService.criar(dados),
    onSuccess: () => {
      // Invalida cache de transferências (todas as queries)
      queryClient.invalidateQueries({ queryKey: ["transferencias"] });
      
      // Invalida contas (saldo das duas contas mudou)
      queryClient.invalidateQueries({ queryKey: ["contas"] });
      
      // Invalida dashboard (totais mudaram)
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      
      // Invalida extrato (novas movimentações)
      queryClient.invalidateQueries({ queryKey: ["extrato"] });
      
      toast({
        title: "Transferência realizada!",
        description: "A transferência foi registrada com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao realizar transferência",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

