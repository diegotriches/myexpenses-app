"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { transacaoService } from "@/services/transacaoService";
import type { EstornarDTO } from "@/services/transacaoService";
import { usePeriodo } from "@/contexts/PeriodoContext";
import { useToast } from "@/hooks/use-toast";

import type {
  CreateTransacaoDTO,
  UpdateTransacaoDTO,
  FiltrosTransacao,
  ModoEdicao,
} from "@/types/transacao";

export const transacoesKeys = {
  all:      (ano: number, mes: number)    => ["transacoes", ano, mes]  as const,
  byId:     (id: string)                  => ["transacoes", id]        as const,
  filtered: (filters: FiltrosTransacao)   => ["transacoes", filters]   as const,
  periodo:  (periodoMeses: number)        => ["transacoes", "periodo", periodoMeses] as const,
  ano:      (ano: number)                 => ["transacoes", "ano", ano] as const,
  todas:    ()                            => ["transacoes", "todas"] as const,
};

export function useTransacoesTodas() {
  return useQuery({
    queryKey: transacoesKeys.todas(),
    queryFn:  () => transacaoService.listarTodas(),
    staleTime: 2 * 60 * 1000,
  });
}

// Transações do ano (janeiro até o mês atual no ano vigente; janeiro a dezembro
// nos anos passados). Usado pelos cards de categorias do dashboard.
export function useTransacoesAno(ano: number) {
  return useQuery({
    queryKey: transacoesKeys.ano(ano),
    queryFn:  () => transacaoService.listarPorAno(ano),
    staleTime: 2 * 60 * 1000,
  });
}

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
  // Totais anuais têm chave própria, fora do prefixo de transações
  queryClient.invalidateQueries({ queryKey: ["cartoes-gastos-anuais"] });
  queryClient.invalidateQueries({ queryKey: ["categorias-totais"] });
  queryClient.invalidateQueries({ queryKey: ["resumo-anual"] });
}

export function useTransacoes() {
  const { mesSelecionado, anoSelecionado } = usePeriodo();

  return useQuery({
    queryKey: transacoesKeys.all(anoSelecionado, mesSelecionado + 1),
    queryFn:  () => transacaoService.listar({ ano: anoSelecionado, mes: mesSelecionado + 1 }),
    staleTime: 2 * 60 * 1000,
  });
}

export function useCriarTransacao() {
  const queryClient = useQueryClient();
  const { toast }   = useToast();

  return useMutation({
    mutationFn: (dados: CreateTransacaoDTO | CreateTransacaoDTO[]) => transacaoService.criar(dados),
    onSuccess: () => {
      invalidarTudo(queryClient);
      toast({ title: "Transação criada!", description: "A transação foi registrada com sucesso." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao criar transação", description: error.message, variant: "destructive" });
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

export function useEstornoPrevia(id: string, valor: number, data: string) {
  return useQuery({
    queryKey: ["estorno-previa", id, valor, data],
    queryFn:  () => transacaoService.previaEstorno(id, valor, data),
    placeholderData: (anterior) => anterior,
  });
}

export function useRegistrarEstorno() {
  const queryClient = useQueryClient();
  const { toast }   = useToast();

  return useMutation({
    mutationFn: ({ id, ...dados }: EstornarDTO & { id: string }) => transacaoService.estornar(id, dados),
    onSuccess: () => {
      invalidarTudo(queryClient);
      // Remove em vez de recalcular: a compra pode ter sido apagada pelo cancelamento
      queryClient.removeQueries({ queryKey: ["estorno-previa"] });
      toast({ title: "Estorno registrado!", description: "A fatura e o limite foram atualizados." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao estornar", description: error.message, variant: "destructive" });
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