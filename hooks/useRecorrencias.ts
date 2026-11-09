// src/hooks/useRecorrencias.ts
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { recorrenciaService } from "@/services/recorrenciaService";
import { useToast } from "@/hooks/use-toast";
import type { CreateRecorrenciaDTO, UpdateRecorrenciaDTO } from "@/types/recorrencia";

export const recorrenciasKeys = {
  all: ["recorrencias"] as const,
};

export function useRecorrencias() {
  return useQuery({
    queryKey: recorrenciasKeys.all,
    queryFn: () => recorrenciaService.listar(),
    staleTime: 2 * 60 * 1000,
  });
}

export function useCriarRecorrencia() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (dados: CreateRecorrenciaDTO) => recorrenciaService.criar(dados),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recorrenciasKeys.all });
      // A criação pode gerar a primeira ocorrência imediatamente (se a
      // data for hoje) e afetar saldo/fatura — invalida tudo que depende disso
      queryClient.invalidateQueries({ queryKey: ["transacoes"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["contas"] });
      queryClient.invalidateQueries({ queryKey: ["cartoes"] });
      queryClient.invalidateQueries({ queryKey: ["faturas"] });
      queryClient.invalidateQueries({ queryKey: ["cartoes-gastos-anuais"] });
      queryClient.invalidateQueries({ queryKey: ["categorias-totais"] });
      queryClient.invalidateQueries({ queryKey: ["resumo-anual"] });
      // A primeira ocorrência pode ter gerado aviso de saldo/limite
      queryClient.invalidateQueries({ queryKey: ["notificacoes"] });
      toast({
        title: "Recorrência criada!",
        description: "As próximas ocorrências serão geradas automaticamente todo mês.",
      });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao criar recorrência", description: error.message, variant: "destructive" });
    },
  });
}

export function useAtualizarRecorrencia() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, dados }: { id: string; dados: UpdateRecorrenciaDTO }) =>
      recorrenciaService.atualizar(id, dados),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: recorrenciasKeys.all });
      const pausou = variables.dados.ativa === false;
      const retomou = variables.dados.ativa === true;
      toast({
        title: pausou ? "Recorrência pausada" : retomou ? "Recorrência retomada" : "Recorrência atualizada!",
      });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao atualizar recorrência", description: error.message, variant: "destructive" });
    },
  });
}

export function useCancelarRecorrencia() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => recorrenciaService.cancelar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recorrenciasKeys.all });
      toast({
        title: "Recorrência cancelada",
        description: "Nenhuma nova ocorrência será gerada. O histórico já criado permanece.",
      });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao cancelar recorrência", description: error.message, variant: "destructive" });
    },
  });
}