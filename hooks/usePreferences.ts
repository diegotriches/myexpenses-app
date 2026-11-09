import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { preferencesService } from "@/services/preferencesService";
import type {
  Preferencias,
  AtualizarPreferenciasDTO,
} from "@/types/preferences";

// ========================================
// QUERY KEYS
// ========================================

export const QUERY_KEYS = {
  preferences: ["preferences"] as const,
};

// ========================================
// HOOK: usePreferences - Buscar preferências
// ========================================

export function usePreferences() {
  return useQuery({
    queryKey: QUERY_KEYS.preferences,
    queryFn: () => preferencesService.buscar(),
    staleTime: 10 * 60 * 1000, // 10 minutos (mudam raramente)
    gcTime: 30 * 60 * 1000, // 30 minutos
    retry: 1,
  });
}

// ========================================
// HOOK: useAtualizarPreferences - Atualizar preferências
// ========================================

export function useAtualizarPreferences() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (dados: AtualizarPreferenciasDTO) =>
      preferencesService.atualizar(dados),

    // Optimistic Update
    onMutate: async (novasDados) => {
      // Cancela queries em andamento
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.preferences });

      // Salva estado anterior
      const previousData = queryClient.getQueryData<Preferencias>(QUERY_KEYS.preferences);

      // Atualiza otimisticamente
      if (previousData) {
        queryClient.setQueryData<Preferencias>(QUERY_KEYS.preferences, {
          ...previousData,
          ...novasDados,
        });
      }

      return { previousData };
    },

    onSuccess: (data) => {
      // Atualiza com dados reais da API
      queryClient.setQueryData(QUERY_KEYS.preferences, data);

      toast({
        title: "Preferências salvas!",
        description: "Suas configurações foram atualizadas com sucesso.",
      });
    },

    onError: (error: Error, _variables, context) => {
      // Rollback em caso de erro
      if (context?.previousData) {
        queryClient.setQueryData(QUERY_KEYS.preferences, context.previousData);
      }

      toast({
        title: "Erro ao salvar preferências",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// ========================================
// HOOK: useDeletarPreferences - Deletar preferências
// ========================================

