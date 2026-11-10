"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificacaoService } from "@/services/notificacaoService";
import { useToast } from "@/hooks/use-toast";
import type { Notificacao, NotificacoesResponse, PreferenciasNotificacao } from "@/types/notificacao";

// ========================================
// QUERY KEYS
// ========================================

const QUERY_KEYS = {
  all: (lidas?: boolean, limite?: number) => ["notificacoes", lidas, limite] as const,
  preferencias: ["notificacoes", "preferencias"] as const,
};

// ========================================
// HOOK: useNotificacoes
// ========================================

export function useNotificacoes(lidas?: boolean, limite?: number) {
  return useQuery({
    queryKey: QUERY_KEYS.all(lidas, limite),
    queryFn: () => notificacaoService.listar(lidas, limite),
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}

// ========================================
// HOOKS: preferências dos avisos automáticos
// ========================================

export function usePreferenciasNotificacao() {
  return useQuery({
    queryKey: QUERY_KEYS.preferencias,
    queryFn: () => notificacaoService.obterPreferencias(),
    staleTime: 5 * 60 * 1000,
  });
}

/** Salva ao mudar (sem botão): aplica na hora e desfaz se a API recusar. */
export function useSalvarPreferenciasNotificacao() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (dados: Partial<PreferenciasNotificacao>) => notificacaoService.salvarPreferencias(dados),
    onMutate: async (dados) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.preferencias });
      const anterior = queryClient.getQueryData<PreferenciasNotificacao>(QUERY_KEYS.preferencias);
      if (anterior) queryClient.setQueryData<PreferenciasNotificacao>(QUERY_KEYS.preferencias, { ...anterior, ...dados });
      return { anterior };
    },
    onError: (error: Error, _dados, contexto) => {
      if (contexto?.anterior) queryClient.setQueryData(QUERY_KEYS.preferencias, contexto.anterior);
      toast({ title: "Não foi possível salvar", description: error.message, variant: "destructive" });
    },
    onSuccess: (salvas) => {
      queryClient.setQueryData(QUERY_KEYS.preferencias, salvas);
    },
  });
}

// ========================================
// HOOK: useMarcarNotificacaoLida
// ========================================

export function useMarcarNotificacaoLida() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => notificacaoService.marcarComoLida(id),

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["notificacoes"] });
      const previousQueries = queryClient.getQueriesData({ queryKey: ["notificacoes"] });

      // Só as listas: ["notificacoes", "preferencias"] tem outro formato
      queryClient.setQueriesData<NotificacoesResponse>({ queryKey: ["notificacoes"] }, (old) => {
        if (!old || !Array.isArray(old.notificacoes)) return old;
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

    onError: (err, id, context) => {
      if (context?.previousQueries) {
        context.previousQueries.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notificacoes"] });
    },
  });
}

// ========================================
// HOOK: useMarcarTodasNotificacoesLidas
// ========================================

export function useMarcarTodasNotificacoesLidas() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: () => notificacaoService.marcarTodasComoLidas(),

    onSuccess: (data) => {
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
// HOOK: useVerificarNotificacoes
// ========================================

export function useVerificarNotificacoes() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: () => notificacaoService.verificarNotificacoes(),

    onSuccess: (data) => {
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

// ========================================
// HOOK: useAtualizarPreferenciasNotificacao
// ========================================

