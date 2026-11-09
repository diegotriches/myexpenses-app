"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cartaoService } from "@/services/cartaoService";
import { useToast } from "@/hooks/use-toast";
import type { CreateCartaoDTO, UpdateCartaoDTO } from "@/types/cartao";

/**
 * Query Keys para cartões
 * ⚠️ EXPORTADO para uso em outros módulos (invalidação de cache)
 */
export const cartoesKeys = {
  all: ["cartoes"] as const,
  byId: (id: number) => ["cartoes", id] as const,
  fatura: (id: number | string, ano: number, mes: number) => 
    ["cartoes", id, "fatura", ano, mes] as const,
};

/**
 * Hook para listar todos os cartões (com cache)
 * 
 * @example
 * const { data: cartoes, isLoading } = useCartoes();
 */
export function useCartoes() {
  return useQuery({
    queryKey: cartoesKeys.all,
    queryFn: () => cartaoService.listar(),
    // Dados de cartões mudam com frequência (limites, faturas)
    staleTime: 3 * 60 * 1000, // 3 minutos
  });
}

/**
 * Hook para criar cartão
 * 
 * @example
 * const criarCartao = useCriarCartao();
 * await criarCartao.mutateAsync({
 *   nome: "Nubank",
 *   tipo: "credito",
 *   limite: 5000
 * });
 */
export function useCriarCartao() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (dados: CreateCartaoDTO) => cartaoService.criar(dados),
    onSuccess: () => {
      // Invalida cache de cartões e dashboard
      queryClient.invalidateQueries({ queryKey: cartoesKeys.all });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      
      toast({
        title: "Cartão criado!",
        description: "O cartão foi criado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar cartão",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook para atualizar cartão
 * 
 * @example
 * const atualizarCartao = useAtualizarCartao();
 * await atualizarCartao.mutateAsync({
 *   id: 1,
 *   dados: { nome: "Novo Nome" }
 * });
 */
export function useAtualizarCartao() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, dados }: { id: number; dados: UpdateCartaoDTO }) =>
      cartaoService.atualizar(id, dados),
    onSuccess: (_, variables) => {
      // Invalida cartão específico, lista e dashboard
      queryClient.invalidateQueries({ queryKey: cartoesKeys.byId(variables.id) });
      queryClient.invalidateQueries({ queryKey: cartoesKeys.all });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      
      toast({
        title: "Cartão atualizado!",
        description: "As alterações foram salvas.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar cartão",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook para remover cartão
 * 
 * @example
 * const removerCartao = useRemoverCartao();
 * await removerCartao.mutateAsync(1);
 */
export function useRemoverCartao() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: number) => cartaoService.remover(id),
    onSuccess: () => {
      // Invalida cache de cartões e dashboard
      queryClient.invalidateQueries({ queryKey: cartoesKeys.all });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      
      toast({
        title: "Cartão removido!",
        description: "O cartão foi removido com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao remover cartão",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/** Gastos do ano nos cartões de crédito; a chave é invalidada ao lançar, pagar ou estornar. */
export function useGastosAnuaisCartoes(ano: number) {
  return useQuery({
    queryKey: ["cartoes-gastos-anuais", ano],
    queryFn: () => cartaoService.gastosAnuais(ano),
    staleTime: 1000 * 60 * 5,
  });
}
