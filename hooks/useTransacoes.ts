// src/hooks/useTransacoes.ts
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { transacaoService } from "@/services/transacaoService";
import { usePeriodo } from "@/contexts/PeriodoContext";
import { useToast } from "@/hooks/use-toast";

// ✅ Importar tipos corretos
import type {
  Transacao,
  CreateTransacaoDTO,
  UpdateTransacaoDTO,
  FiltrosTransacao,
  CreateTransacaoCartaoDTO,
  ModoEdicao,
} from "@/types/transacao";

/**
 * Query Keys para transações
 * ✅ EXPORTADO para uso em outros módulos (Dashboard, Faturas, Extrato)
 */
export const transacoesKeys = {
  all: (ano: number, mes: number) => ["transacoes", ano, mes] as const,
  byId: (id: string) => ["transacoes", id] as const,
  filtered: (filters: FiltrosTransacao) => ["transacoes", filters] as const,
};

/**
 * Hook para listar transações do período (com cache)
 * Usa automaticamente mesSelecionado e anoSelecionado do PeriodoContext
 * 
 * @example
 * const { data: transacoes, isLoading, error } = useTransacoes();
 */
export function useTransacoes() {
  const { mesSelecionado, anoSelecionado } = usePeriodo();

  return useQuery({
    queryKey: transacoesKeys.all(anoSelecionado, mesSelecionado + 1),
    queryFn: () =>
      transacaoService.listar({
        ano: anoSelecionado,
        mes: mesSelecionado + 1,
      }),
    // Transações mudam frequentemente, cache de 2 minutos
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook para listar transações com filtros customizados
 * 
 * @example
 * const { data: transacoes } = useTransacoesComFiltros({
 *   ano: 2026,
 *   mes: 1,
 *   tipo: "saida",
 *   categoria: "Alimentação"
 * });
 */
export function useTransacoesComFiltros(filtros: FiltrosTransacao) {
  return useQuery({
    queryKey: transacoesKeys.filtered(filtros),
    queryFn: () => transacaoService.listar(filtros),
    staleTime: 2 * 60 * 1000,
    enabled: !!(
      filtros.ano ||
      filtros.mes ||
      filtros.tipo ||
      filtros.categoria ||
      filtros.formaPagamento ||
      filtros.contaId ||
      filtros.cartaoId ||
      filtros.busca
    ),
  });
}

/**
 * Hook para buscar uma transação por ID
 * 
 * @example
 * const { data: transacao } = useTransacao("trans-123");
 */
export function useTransacao(id: string) {
  return useQuery({
    queryKey: transacoesKeys.byId(id),
    queryFn: () => transacaoService.buscarPorId(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para criar transação
 * 
 * @example
 * const criarTransacao = useCriarTransacao();
 * await criarTransacao.mutateAsync({
 *   tipo: "saida",
 *   valor: 100,
 *   descricao: "Supermercado",
 *   data: "2026-01-08",
 *   contaId: "123",
 *   formaPagamento: "pix"
 * });
 */
export function useCriarTransacao() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (dados: CreateTransacaoDTO) => transacaoService.criar(dados),
    onSuccess: () => {
      // Invalida cache de transações
      queryClient.invalidateQueries({ queryKey: ["transacoes"] });

      // Invalida dashboard (totais mudaram)
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });

      // Invalida contas (saldo mudou)
      queryClient.invalidateQueries({ queryKey: ["contas"] });

      // Invalida cartões (se for cartão)
      queryClient.invalidateQueries({ queryKey: ["cartoes"] });

      // Invalida faturas (se for cartão)
      queryClient.invalidateQueries({ queryKey: ["faturas"] });

      // Invalida extrato
      queryClient.invalidateQueries({ queryKey: ["extrato"] });

      toast({
        title: "Transação criada!",
        description: "A transação foi registrada com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar transação",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook para criar transação no cartão (com parcelamento)
 * 
 * @example
 * const criarTransacaoCartao = useCriarTransacaoCartao();
 * await criarTransacaoCartao.mutateAsync({
 *   cartaoId: 1,
 *   contaId: "123",
 *   descricao: "Compra parcelada",
 *   valor: 1200,
 *   parcelado: true,
 *   parcelas: 12
 * });
 */
export function useCriarTransacaoCartao() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (dados: CreateTransacaoCartaoDTO) =>
      transacaoService.criarNoCartao(dados),
    onSuccess: (data) => {
      // Invalida todos os caches relacionados
      queryClient.invalidateQueries({ queryKey: ["transacoes"] });
      queryClient.invalidateQueries({ queryKey: ["cartoes"] });
      queryClient.invalidateQueries({ queryKey: ["faturas"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });

      toast({
        title: "Compra registrada!",
        description: data.message || "A transação foi registrada no cartão.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao registrar compra",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook para atualizar transação
 * 
 * @example
 * const atualizarTransacao = useAtualizarTransacao();
 * await atualizarTransacao.mutateAsync({
 *   id: "123",
 *   dados: {
 *     modoEdicao: "unica",
 *     descricao: "Nova descrição"
 *   }
 * });
 */
export function useAtualizarTransacao() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, dados }: { id: string; dados: UpdateTransacaoDTO }) =>
      transacaoService.atualizar(id, dados),
    onSuccess: () => {
      // Invalida cache de transações
      queryClient.invalidateQueries({ queryKey: ["transacoes"] });

      // Invalida outros caches relacionados
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["contas"] });
      queryClient.invalidateQueries({ queryKey: ["cartoes"] });
      queryClient.invalidateQueries({ queryKey: ["faturas"] });
      queryClient.invalidateQueries({ queryKey: ["extrato"] });

      toast({
        title: "Transação atualizada!",
        description: "As alterações foram salvas.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar transação",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook para excluir transação
 * 
 * @example
 * const excluirTransacao = useExcluirTransacao();
 * await excluirTransacao.mutateAsync({
 *   id: "123",
 *   tipo: "unica"
 * });
 */
export function useExcluirTransacao() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, tipo }: { id: string; tipo?: ModoEdicao }) =>
      transacaoService.remover(id, tipo),
    onSuccess: () => {
      // Invalida cache de transações
      queryClient.invalidateQueries({ queryKey: ["transacoes"] });

      // Invalida outros caches relacionados
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["contas"] });
      queryClient.invalidateQueries({ queryKey: ["cartoes"] });
      queryClient.invalidateQueries({ queryKey: ["faturas"] });
      queryClient.invalidateQueries({ queryKey: ["extrato"] });

      toast({
        title: "Transação removida!",
        description: "A transação foi removida com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao remover transação",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}