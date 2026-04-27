// src/hooks/useTransacoes.ts
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { transacaoService } from "@/services/transacaoService";
import { usePeriodo } from "@/contexts/PeriodoContext";
import { useToast } from "@/hooks/use-toast";

import type {
  Transacao,
  CreateTransacaoDTO,
  UpdateTransacaoDTO,
  FiltrosTransacao,
  CreateTransacaoCartaoDTO,
  ModoEdicao,
} from "@/types/transacao";

export const transacoesKeys = {
  all:      (ano: number, mes: number)    => ["transacoes", ano, mes]  as const,
  byId:     (id: string)                  => ["transacoes", id]        as const,
  filtered: (filters: FiltrosTransacao)   => ["transacoes", filters]   as const,
};

// ── Invalida todos os caches relacionados a uma mutação de transação ──────────
// Centralizado para não esquecer nenhuma query em nenhum dos três hooks.
function invalidarTudo(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["transacoes"]      });
  queryClient.invalidateQueries({ queryKey: ["dashboard"]       });
  queryClient.invalidateQueries({ queryKey: ["contas"]          });
  queryClient.invalidateQueries({ queryKey: ["cartoes"]         });
  queryClient.invalidateQueries({ queryKey: ["faturas"]         });
  queryClient.invalidateQueries({ queryKey: ["extrato"]         });
  queryClient.invalidateQueries({ queryKey: ["estabelecimentos"] });
}

export function useTransacoes() {
  const { mesSelecionado, anoSelecionado } = usePeriodo();

  return useQuery({
    queryKey: transacoesKeys.all(anoSelecionado, mesSelecionado + 1),
    queryFn:  () => transacaoService.listar({ ano: anoSelecionado, mes: mesSelecionado + 1 }),
    staleTime: 2 * 60 * 1000,
  });
}

export function useTransacoesComFiltros(filtros: FiltrosTransacao) {
  return useQuery({
    queryKey: transacoesKeys.filtered(filtros),
    queryFn:  () => transacaoService.listar(filtros),
    staleTime: 2 * 60 * 1000,
    enabled: !!(
      filtros.ano || filtros.mes || filtros.tipo || filtros.categoria ||
      filtros.formaPagamento || filtros.contaId || filtros.cartaoId || filtros.busca
    ),
  });
}

export function useTransacao(id: string) {
  return useQuery({
    queryKey: transacoesKeys.byId(id),
    queryFn:  () => transacaoService.buscarPorId(id),
    enabled:  !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCriarTransacao() {
  const queryClient = useQueryClient();
  const { toast }   = useToast();

  return useMutation({
    mutationFn: (dados: CreateTransacaoDTO) => transacaoService.criar(dados),
    onSuccess: () => {
      invalidarTudo(queryClient);
      toast({ title: "Transação criada!", description: "A transação foi registrada com sucesso." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao criar transação", description: error.message, variant: "destructive" });
    },
  });
}

export function useCriarTransacaoCartao() {
  const queryClient = useQueryClient();
  const { toast }   = useToast();

  return useMutation({
    mutationFn: (dados: CreateTransacaoCartaoDTO) => transacaoService.criarNoCartao(dados),
    onSuccess: (data) => {
      invalidarTudo(queryClient);
      toast({ title: "Compra registrada!", description: data.message || "A transação foi registrada no cartão." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao registrar compra", description: error.message, variant: "destructive" });
    },
  });
}

export function useAtualizarTransacao() {
  const queryClient = useQueryClient();
  const { toast }   = useToast();

  return useMutation({
    mutationFn: ({ id, dados }: { id: string; dados: UpdateTransacaoDTO }) =>
      transacaoService.atualizar(id, dados),
    onSuccess: () => {
      invalidarTudo(queryClient);
      toast({ title: "Transação atualizada!", description: "As alterações foram salvas." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao atualizar transação", description: error.message, variant: "destructive" });
    },
  });
}

export function useExcluirTransacao() {
  const queryClient = useQueryClient();
  const { toast }   = useToast();

  return useMutation({
    mutationFn: ({ id, tipo }: { id: string; tipo?: ModoEdicao }) =>
      transacaoService.remover(id, tipo),
    onSuccess: () => {
      invalidarTudo(queryClient);
      toast({ title: "Transação removida!", description: "A transação foi removida com sucesso." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao remover transação", description: error.message, variant: "destructive" });
    },
  });
}