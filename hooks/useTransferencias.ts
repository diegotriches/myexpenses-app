// src/hooks/useTransferencias.ts
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { transferenciaService } from "@/services/transferenciaService";
import { usePeriodo } from "@/contexts/PeriodoContext";
import { useToast } from "@/hooks/use-toast";

// ✅ Importar tipos corretos
import type { 
  Transferencia, 
  CreateTransferenciaDTO, 
  FiltrosTransferencia 
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
 * Hook para listar transferências com filtros customizados
 * 
 * @example
 * const { data: transferencias } = useTransferenciasComFiltros({
 *   ano: 2026,
 *   mes: 1,
 *   contaOrigemId: "123"
 * });
 */
export function useTransferenciasComFiltros(filtros: FiltrosTransferencia) {
  return useQuery({
    queryKey: transferenciasKeys.filtered(filtros),
    queryFn: () => transferenciaService.listar(filtros),
    staleTime: 3 * 60 * 1000,
    enabled: !!(filtros.ano || filtros.mes || filtros.contaOrigemId || filtros.contaDestinoId),
  });
}

/**
 * Hook para buscar uma transferência por ID
 * 
 * @example
 * const { data: transferencia } = useTransferencia("transfer-123");
 */
export function useTransferencia(id: string) {
  return useQuery({
    queryKey: transferenciasKeys.byId(id),
    queryFn: () => transferenciaService.buscarPorId(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
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

/**
 * Hook para excluir transferência
 * 
 * @example
 * const excluirTransferencia = useExcluirTransferencia();
 * await excluirTransferencia.mutateAsync("transfer-123");
 */
export function useExcluirTransferencia() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => transferenciaService.remover(id),
    onSuccess: () => {
      // Invalida cache de transferências
      queryClient.invalidateQueries({ queryKey: ["transferencias"] });
      
      // Invalida contas (saldo das duas contas voltou ao normal)
      queryClient.invalidateQueries({ queryKey: ["contas"] });
      
      // Invalida dashboard (totais mudaram)
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      
      // Invalida extrato (movimentações removidas)
      queryClient.invalidateQueries({ queryKey: ["extrato"] });
      
      toast({
        title: "Transferência removida!",
        description: "A transferência foi removida com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao remover transferência",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}