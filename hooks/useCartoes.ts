// src/hooks/useCartoes.ts
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cartaoService } from "@/services/cartaoService";
import { useToast } from "@/hooks/use-toast";
import type { Cartao, CreateCartaoDTO, UpdateCartaoDTO } from "@/types/cartao";

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
 * Hook para buscar cartão por ID (com cache inteligente)
 * 
 * ✅ MELHORADO: Usa initialData da lista se disponível, senão faz fetch individual
 * 
 * @param id - ID do cartão
 * @example
 * const { data: cartao, isLoading } = useCartao(1);
 */
export function useCartao(id: number) {
  const queryClient = useQueryClient();
  
  return useQuery({
    queryKey: cartoesKeys.byId(id),
    queryFn: () => cartaoService.buscarPorId(id),
    initialData: () => {
      // Tenta buscar da lista em cache primeiro (evita request desnecessário)
      const cartoes = queryClient.getQueryData<Cartao[]>(cartoesKeys.all);
      return cartoes?.find(c => c.id === id);
    },
    staleTime: 3 * 60 * 1000, // 3 minutos
  });
}

/**
 * Hook para buscar fatura de cartão (com cache)
 * 
 * @param cartaoId - ID do cartão
 * @param ano - Ano da fatura
 * @param mes - Mês da fatura (1-12)
 * @example
 * const { data: fatura, isLoading } = useFaturaCartao(1, 2026, 1);
 */
export function useFaturaCartao(cartaoId: number | string, ano: number, mes: number) {
  return useQuery({
    queryKey: cartoesKeys.fatura(cartaoId, ano, mes),
    queryFn: () => cartaoService.fatura(cartaoId, ano, mes),
    enabled: !!(cartaoId && ano && mes), // Só executa se todos os params existirem
    staleTime: 2 * 60 * 1000, // 2 minutos (faturas mudam mais)
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

/**
 * Hook para pagar fatura de cartão
 * 
 * @example
 * const pagarFatura = usePagarFatura();
 * await pagarFatura.mutateAsync({
 *   cartaoId: 1,
 *   ano: 2026,
 *   mes: 1,
 *   contaPagamentoId: "conta-123"
 * });
 */
export function usePagarFatura() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      cartaoId,
      ano,
      mes,
      contaPagamentoId,
      dataPagamento,
    }: {
      cartaoId: number | string;
      ano: number;
      mes: number;
      contaPagamentoId: string;
      dataPagamento?: string;
    }) => cartaoService.pagarFatura(cartaoId, ano, mes, { contaPagamentoId, dataPagamento }),
    onSuccess: (_, variables) => {
      // Invalida fatura, cartões, contas e dashboard
      queryClient.invalidateQueries({ 
        queryKey: cartoesKeys.fatura(variables.cartaoId, variables.ano, variables.mes) 
      });
      queryClient.invalidateQueries({ queryKey: cartoesKeys.all });
      queryClient.invalidateQueries({ queryKey: ["contas"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      
      toast({
        title: "Fatura paga!",
        description: "O pagamento foi registrado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao pagar fatura",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook para estornar pagamento de fatura
 * 
 * @example
 * const estornarPagamento = useEstornarPagamento();
 * await estornarPagamento.mutateAsync({
 *   cartaoId: 1,
 *   ano: 2026,
 *   mes: 1
 * });
 */
export function useEstornarPagamento() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      cartaoId,
      ano,
      mes,
    }: {
      cartaoId: number | string;
      ano: number;
      mes: number;
    }) => cartaoService.estornarPagamento(cartaoId, ano, mes),
    onSuccess: (_, variables) => {
      // Invalida fatura, cartões, contas e dashboard
      queryClient.invalidateQueries({ 
        queryKey: cartoesKeys.fatura(variables.cartaoId, variables.ano, variables.mes) 
      });
      queryClient.invalidateQueries({ queryKey: cartoesKeys.all });
      queryClient.invalidateQueries({ queryKey: ["contas"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      
      toast({
        title: "Pagamento estornado!",
        description: "O estorno foi registrado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao estornar pagamento",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}