// src/hooks/useNotificacoes.ts
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificacaoService } from "@/services/notificacaoService";
import { useToast } from "@/hooks/use-toast";
import type { Notificacao, PreferenciasNotificacao } from "@/types/notificacao";

// ========================================
// QUERY KEYS
// ========================================

const QUERY_KEYS = {
  all: (lidas?: boolean, limite?: number) => ["notificacoes", lidas, limite] as const,
  preferencias: ["notificacoes", "preferencias"] as const,
};

// ========================================
// HOOK: useNotificacoes - Listar notificações com polling
// ========================================

/**
 * Hook para listar notificações (com cache e polling automático)
 * 
 * @param lidas - Filtrar por lidas/não lidas (undefined = todas)
 * @param limite - Limite de resultados
 * 
 * @example
 * const { data, isLoading } = useNotificacoes();
 * const { data: naoLidas } = useNotificacoes(false, 5); // Últimas 5 não lidas
 */
export function useNotificacoes(lidas?: boolean, limite?: number) {
  return useQuery({
    queryKey: QUERY_KEYS.all(lidas, limite),
    queryFn: () => notificacaoService.listar(lidas, limite),
    // Cache curto para notificações (1 minuto)
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    // Polling automático a cada 5 minutos
    refetchInterval: 5 * 60 * 1000,
    // Refetch ao focar janela
    refetchOnWindowFocus: true,
    retry: 1,
  });
}

// ========================================
// HOOK: useMarcarNotificacaoLida - Marcar como lida
// ========================================

/**
 * Hook para marcar notificação como lida com optimistic update
 * 
 * @example
 * const marcarComoLida = useMarcarNotificacaoLida();
 * await marcarComoLida.mutateAsync("notif-123");
 */
export function useMarcarNotificacaoLida() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => notificacaoService.marcarComoLida(id),

    // Optimistic update: atualiza UI antes da resposta da API
    onMutate: async (id) => {
      // Cancela queries em andamento
      await queryClient.cancelQueries({ queryKey: ["notificacoes"] });

      // Salva estado anterior de todas as queries
      const previousQueries = queryClient.getQueriesData({ queryKey: ["notificacoes"] });

      // Atualiza otimisticamente todas as queries de notificações
      queryClient.setQueriesData({ queryKey: ["notificacoes"] }, (old: any) => {
        if (!old) return old;

        return {
          ...old,
          notificacoes: old.notificacoes.map((n: Notificacao) =>
            n.id === id ? { ...n, lida: true } : n
          ),
          naoLidas: Math.max(0, old.naoLidas - 1),
        };
      });

      return { previousQueries };
    },

    // Rollback em caso de erro
    onError: (err, id, context) => {
      if (context?.previousQueries) {
        context.previousQueries.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },

    // Invalida cache após sucesso
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notificacoes"] });
    },
  });
}

// ========================================
// HOOK: useMarcarTodasNotificacoesLidas
// ========================================

/**
 * Hook para marcar todas as notificações como lidas
 * 
 * @example
 * const marcarTodasLidas = useMarcarTodasNotificacoesLidas();
 * await marcarTodasLidas.mutateAsync();
 */
export function useMarcarTodasNotificacoesLidas() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: () => notificacaoService.marcarTodasComoLidas(),

    onSuccess: (data) => {
      // Invalida cache de notificações
      queryClient.invalidateQueries({ queryKey: ["notificacoes"] });

      toast({
        title: "Notificações marcadas como lidas",
        description: `${data.count} notificação(ões) atualizada(s).`,
      });
    },

    onError: (error: Error) => {
      toast({
        title: "Erro ao marcar notificações",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// ========================================
// HOOK: useRemoverNotificacao
// ========================================

/**
 * Hook para remover notificação
 * 
 * @example
 * const removerNotificacao = useRemoverNotificacao();
 * await removerNotificacao.mutateAsync("notif-123");
 */
export function useRemoverNotificacao() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => notificacaoService.remover(id),

    onSuccess: () => {
      // Invalida cache de notificações
      queryClient.invalidateQueries({ queryKey: ["notificacoes"] });

      toast({
        title: "Notificação removida",
      });
    },

    onError: (error: Error) => {
      toast({
        title: "Erro ao remover notificação",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// ========================================
// HOOK: useLimparNotificacoesLidas
// ========================================

/**
 * Hook para limpar notificações lidas
 * 
 * @example
 * const limparLidas = useLimparNotificacoesLidas();
 * await limparLidas.mutateAsync();
 */
export function useLimparNotificacoesLidas() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: () => notificacaoService.limparLidas(),

    onSuccess: (data) => {
      // Invalida cache de notificações
      queryClient.invalidateQueries({ queryKey: ["notificacoes"] });

      toast({
        title: "Notificações lidas removidas",
        description: `${data.count} notificação(ões) removida(s).`,
      });
    },

    onError: (error: Error) => {
      toast({
        title: "Erro ao limpar notificações",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// ========================================
// HOOK: useVerificarNotificacoes
// ========================================

/**
 * Hook para verificar e criar notificações automáticas
 * 
 * @example
 * const verificarNotificacoes = useVerificarNotificacoes();
 * await verificarNotificacoes.mutateAsync();
 */
export function useVerificarNotificacoes() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: () => notificacaoService.verificarNotificacoes(),

    onSuccess: (data) => {
      // Invalida cache para recarregar notificações
      queryClient.invalidateQueries({ queryKey: ["notificacoes"] });

      toast({
        title: "Notificações verificadas",
        description: data.criadas > 0 
          ? `${data.criadas} nova(s) notificação(ões) criada(s).`
          : "Nenhuma nova notificação.",
      });
    },

    onError: (error: Error) => {
      toast({
        title: "Erro ao verificar notificações",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// ========================================
// HOOK: usePreferenciasNotificacao
// ========================================

/**
 * Hook para buscar preferências de notificação (com cache longo)
 * 
 * @example
 * const { data: preferencias, isLoading } = usePreferenciasNotificacao();
 */
export function usePreferenciasNotificacao() {
  return useQuery({
    queryKey: QUERY_KEYS.preferencias,
    queryFn: () => notificacaoService.buscarPreferencias(),
    // Preferências mudam raramente, cache de 10 minutos
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
  });
}

// ========================================
// HOOK: useAtualizarPreferenciasNotificacao
// ========================================

/**
 * Hook para atualizar preferências de notificação
 * 
 * @example
 * const atualizarPreferencias = useAtualizarPreferenciasNotificacao();
 * await atualizarPreferencias.mutateAsync({ faturas: true });
 */
export function useAtualizarPreferenciasNotificacao() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (dados: Partial<PreferenciasNotificacao>) =>
      notificacaoService.atualizarPreferencias(dados),

    onSuccess: (data) => {
      // Atualiza cache com dados reais da API
      queryClient.setQueryData(QUERY_KEYS.preferencias, data);

      toast({
        title: "Preferências atualizadas!",
        description: "Suas preferências foram salvas com sucesso.",
      });
    },

    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar preferências",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}