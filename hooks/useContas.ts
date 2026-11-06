// src/hooks/useContas.ts
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { contaService } from "@/services/contaService";
import { useToast } from "@/hooks/use-toast";
import type { CreateContaDTO, UpdateContaDTO, FiltrosExtrato } from "@/types/conta";

/**
 * Query Keys para contas
 */
export const contasKeys = {
  all: ["contas"] as const,
  byId: (id: string) => ["contas", id] as const,
  extrato: (id: string, filters?: FiltrosExtrato) => ["contas", id, "extrato", filters] as const,
};

/**
 * Hook para listar todas as contas (com cache)
 * 
 * @example
 * const { data: contas, isLoading, error } = useContas();
 */
export function useContas() {
  return useQuery({
    queryKey: contasKeys.all,
    queryFn: () => contaService.listar(),
    // Contas mudam com transações, cache de 3 minutos
    staleTime: 3 * 60 * 1000,
  });
}

/**
 * Hook para buscar conta por ID (com cache)
 * 
 * @param id - ID da conta
 * @example
 * const { data: conta, isLoading } = useConta("123");
 */
export function useConta(id: string) {
  return useQuery({
    queryKey: contasKeys.byId(id),
    queryFn: () => contaService.buscarPorId(id),
    enabled: !!id, // Só executa se ID existir
    staleTime: 3 * 60 * 1000,
  });
}

/**
 * ✅ ATUALIZADO: Hook para buscar extrato de uma conta (com cache)
 * Agora retorna ExtratoContaData (formato simplificado)
 * 
 * @param contaId - ID da conta
 * @param filters - Filtros opcionais
 * @example
 * const { data, isLoading } = useExtratoConta("123", { 
 *   inicio: "2026-01-01",
 *   fim: "2026-01-31"
 * });
 * 
 * // data.conta - Dados da conta
 * // data.movimentacoes - Array de movimentações
 * // data.resumo - Resumo financeiro do período
 */
export function useExtratoConta(contaId: string, filters?: FiltrosExtrato) {
  return useQuery({
    queryKey: contasKeys.extrato(contaId, filters),
    queryFn: () => contaService.buscarExtrato(contaId, filters),
    enabled: !!contaId,
    staleTime: 2 * 60 * 1000, // Extrato muda frequentemente
  });
}

/**
 * Hook para criar conta
 * 
 * @example
 * const criarConta = useCriarConta();
 * await criarConta.mutateAsync({ 
 *   nome: "Nubank", 
 *   saldoInicial: 1000 
 * });
 */
export function useCriarConta() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (dados: CreateContaDTO) => contaService.criar(dados),
    onSuccess: () => {
      // Invalida cache de contas
      queryClient.invalidateQueries({ queryKey: contasKeys.all });
      
      // Invalida também dashboard (saldo total mudou)
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      
      toast({
        title: "Conta criada!",
        description: "A conta foi criada com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar conta",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook para atualizar conta
 * 
 * @example
 * const atualizarConta = useAtualizarConta();
 * await atualizarConta.mutateAsync({ 
 *   id: "123", 
 *   dados: { nome: "Novo nome" } 
 * });
 */
export function useAtualizarConta() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, dados }: { id: string; dados: UpdateContaDTO }) =>
      contaService.atualizar(id, dados),
    onSuccess: (_, variables) => {
      // Invalida conta específica, extrato e lista
      queryClient.invalidateQueries({ queryKey: contasKeys.byId(variables.id) });
      queryClient.invalidateQueries({ queryKey: contasKeys.extrato(variables.id) });
      queryClient.invalidateQueries({ queryKey: contasKeys.all });
      
      // Invalida dashboard
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      
      toast({
        title: "Conta atualizada!",
        description: "As alterações foram salvas.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar conta",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export interface UsoConta {
  transacoes: number;          // pix/dinheiro vinculadas (ficam no histórico, sem conta)
  transferencias: number;      // apagadas junto com a conta
  lancamentosExtrato: number;  // apagados junto com a conta
  aplicacoes: number;          // apagadas junto (inclui aportes e resgates)
  aplicacoesAtivas: number;
  valorAplicado: number;       // valor atual das aplicações ativas
  faturasPagas: number;        // ficam no histórico, sem conta de pagamento
  cartoesVinculados: number;   // só perdem o vínculo
  recorrencias: number;        // só perdem o vínculo
  saldoAtual: number;
}

/**
 * Resumo do que a exclusão definitiva vai afetar (só busca com enabled=true)
 */
export function useUsoConta(id?: string, enabled = true) {
  return useQuery({
    queryKey: ["uso-conta", id],
    queryFn: async (): Promise<UsoConta> => {
      const res = await fetch(`/api/contas/${id}/uso`);
      if (!res.ok) {
        const e = await res.json().catch(() => ({ error: "Erro ao carregar dados da conta" }));
        throw new Error(e.error || "Erro ao carregar dados da conta");
      }
      return res.json();
    },
    enabled: !!id && enabled,
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook para excluir conta DEFINITIVAMENTE
 * 
 * @example
 * const removerConta = useRemoverConta();
 * await removerConta.mutateAsync("123");
 */
export function useRemoverConta() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => contaService.remover(id),
    onSuccess: () => {
      // Invalida cache de contas
      queryClient.invalidateQueries({ queryKey: contasKeys.all });

      // A exclusão apaga extrato/aplicações/transferências e desvincula
      // transações e faturas, então tudo isso precisa ser recarregado
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["extrato"] });
      queryClient.invalidateQueries({ queryKey: ["aplicacoes"] });
      queryClient.invalidateQueries({ queryKey: ["transacoes"] });
      queryClient.invalidateQueries({ queryKey: ["transferencias"] });
      
      toast({
        title: "Conta excluída!",
        description: "A conta foi excluída definitivamente.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao remover conta",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook para ajustar saldo manualmente
 * 
 * @example
 * const ajustarSaldo = useAjustarSaldo();
 * await ajustarSaldo.mutateAsync({
 *   contaId: "123",
 *   valor: 1500.00,
 *   descricao: "Ajuste de saldo inicial"
 * });
 */
export function useAjustarSaldo() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ 
      contaId, 
      valor, 
      descricao 
    }: { 
      contaId: string; 
      valor: number; 
      descricao?: string;
    }) => contaService.ajustarSaldo(contaId, valor, descricao),
    onSuccess: (_, variables) => {
      // Invalida conta específica, extrato e lista
      queryClient.invalidateQueries({ queryKey: contasKeys.byId(variables.contaId) });
      queryClient.invalidateQueries({ queryKey: contasKeys.extrato(variables.contaId) });
      queryClient.invalidateQueries({ queryKey: contasKeys.all });
      
      // Invalida dashboard e extrato geral
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["extrato"] });
      
      toast({
        title: "Saldo ajustado!",
        description: "O saldo foi atualizado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao ajustar saldo",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * ✅ NOVO: Hook para remover movimentação do extrato
 * 
 * @example
 * const removerExtrato = useRemoverExtrato();
 * await removerExtrato.mutateAsync({
 *   contaId: "123",
 *   extratoId: "456"
 * });
 */
export function useRemoverExtrato() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      contaId, 
      extratoId 
    }: { 
      contaId: string; 
      extratoId: string;
    }) => {
      const res = await fetch(`/api/contas/${contaId}/extrato/${extratoId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "Erro ao excluir lançamento" }));
        throw new Error(error.message || error.error || "Erro ao excluir lançamento");
      }
    },
    onSuccess: (_, variables) => {
      // Invalida extrato da conta específica
      queryClient.invalidateQueries({ queryKey: contasKeys.extrato(variables.contaId) });
      
      // Invalida conta (saldo mudou)
      queryClient.invalidateQueries({ queryKey: contasKeys.byId(variables.contaId) });
      queryClient.invalidateQueries({ queryKey: contasKeys.all });
      
      // Invalida dashboard e extrato geral
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["extrato"] });
      
      toast({
        title: "Lançamento excluído!",
        description: "A movimentação foi removida do extrato.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir lançamento",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}