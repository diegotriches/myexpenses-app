"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { estabelecimentoService } from "@/services/estabelecimentoService";
import { useToast } from "@/hooks/use-toast";
import type {
  CreateEstabelecimentoDTO,
  UpdateEstabelecimentoDTO,
} from "@/types/estabelecimento";

const QUERY_KEY = ["estabelecimentos"] as const;

export function useEstabelecimentos() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => estabelecimentoService.listar(),
    staleTime: 5 * 60 * 1000, // 5 min — muda com menos frequência que transações
  });
}

export function useCriarEstabelecimento() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (dados: CreateEstabelecimentoDTO) =>
      estabelecimentoService.criar(dados),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast({
        title: "Estabelecimento criado!",
        description: "O estabelecimento foi cadastrado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar estabelecimento",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useAtualizarEstabelecimento() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, dados }: { id: string; dados: UpdateEstabelecimentoDTO }) =>
      estabelecimentoService.atualizar(id, dados),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast({
        title: "Estabelecimento atualizado!",
        description: "As alterações foram salvas.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar estabelecimento",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useRemoverEstabelecimento() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => estabelecimentoService.remover(id),
    onSuccess: () => {
      // Invalida estabelecimentos e transações (que podem ter o campo zerado)
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["transacoes"] });
      toast({
        title: "Estabelecimento removido!",
        description: "As transações vinculadas foram mantidas sem estabelecimento.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao remover estabelecimento",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}