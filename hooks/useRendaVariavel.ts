// src/hooks/useRendaVariavel.ts
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { rendaVariavelService, type CriarOperacaoRvDTO } from "@/services/rendaVariavelService";
import { useToast } from "@/hooks/use-toast";

export function useRendaVariavel() {
  return useQuery({
    queryKey: ["renda-variavel"],
    queryFn: () => rendaVariavelService.listar(),
    staleTime: 2 * 60 * 1000,
  });
}

function useInvalidar() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["renda-variavel"] });
    queryClient.invalidateQueries({ queryKey: ["contas"] });
    queryClient.invalidateQueries({ queryKey: ["extrato"] });
  };
}

export function useCriarOperacaoRv() {
  const invalidar = useInvalidar();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (dados: CriarOperacaoRvDTO) => rendaVariavelService.criar(dados),
    onSuccess: (op) => {
      invalidar();
      toast({
        title: op.tipo === "compra" ? "Compra registrada!" : "Venda registrada!",
        description: op.movimentouConta
          ? "O valor foi lançado no saldo e no extrato da conta."
          : "Registrada sem alterar o saldo da conta.",
      });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao registrar operação", description: error.message, variant: "destructive" });
    },
  });
}

export function useExcluirOperacaoRv() {
  const invalidar = useInvalidar();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => rendaVariavelService.excluir(id),
    onSuccess: () => {
      invalidar();
      toast({ title: "Operação excluída", description: "Posição e preço médio foram recalculados." });
    },
    onError: (error: Error) => {
      toast({ title: "Não foi possível excluir", description: error.message, variant: "destructive" });
    },
  });
}

export function useSalvarCotacaoRv() {
  const invalidar = useInvalidar();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ ticker, preco }: { ticker: string; preco: number }) =>
      rendaVariavelService.salvarCotacao(ticker, preco),
    onSuccess: () => {
      invalidar();
      toast({ title: "Cotação atualizada" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao salvar cotação", description: error.message, variant: "destructive" });
    },
  });
}