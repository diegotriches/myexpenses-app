// src/hooks/useProfile.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { profileService } from "@/services/profileService";
import type {
  Usuario,
  AtualizarUsuarioDTO,
  AlterarSenhaDTO,
} from "@/types/profile";

// ========================================
// QUERY KEYS
// ========================================

export const QUERY_KEYS = {
  profile: ["profile"] as const,
};

// ========================================
// HOOK: useProfile - Buscar dados do perfil
// ========================================

export function useProfile() {
  return useQuery({
    queryKey: QUERY_KEYS.profile,
    queryFn: () => profileService.buscarPerfil(),
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  });
}

// ========================================
// HOOK: useAtualizarProfile - Atualizar nome/email
// ========================================

export function useAtualizarProfile() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ userId, dados }: { userId: string; dados: AtualizarUsuarioDTO }) =>
      profileService.atualizarPerfil(userId, dados),

    // Optimistic Update
    onMutate: async ({ dados }) => {
      // Cancela queries em andamento
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.profile });

      // Salva estado anterior
      const previousProfile = queryClient.getQueryData<Usuario>(QUERY_KEYS.profile);

      // Atualiza otimisticamente
      if (previousProfile) {
        queryClient.setQueryData<Usuario>(QUERY_KEYS.profile, {
          ...previousProfile,
          ...dados,
        });
      }

      return { previousProfile };
    },

    onSuccess: (data) => {
      // Atualiza com dados reais da API
      queryClient.setQueryData(QUERY_KEYS.profile, data);

      toast({
        title: "Perfil atualizado!",
        description: "Suas informações foram salvas com sucesso.",
      });
    },

    onError: (error: Error, _variables, context) => {
      // Rollback em caso de erro
      if (context?.previousProfile) {
        queryClient.setQueryData(QUERY_KEYS.profile, context.previousProfile);
      }

      toast({
        title: "Erro ao atualizar perfil",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// ========================================
// HOOK: useAlterarSenha - Alterar senha
// ========================================

export function useAlterarSenha() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ userId, dados }: { userId: string; dados: AlterarSenhaDTO }) =>
      profileService.alterarSenha(userId, dados),

    onSuccess: () => {
      toast({
        title: "Senha alterada!",
        description: "Sua senha foi atualizada com sucesso.",
      });
    },

    onError: (error: Error) => {
      toast({
        title: "Erro ao alterar senha",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// ========================================
// HOOK: useUploadFoto - Upload de foto
// ========================================

export function useUploadFoto() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ userId, file }: { userId: string; file: File }) =>
      profileService.uploadFoto(userId, file),

    onSuccess: (data) => {
      // Atualiza cache do perfil
      queryClient.setQueryData(QUERY_KEYS.profile, data);

      toast({
        title: "Foto atualizada!",
        description: "Sua foto de perfil foi alterada com sucesso.",
      });
    },

    onError: (error: Error) => {
      toast({
        title: "Erro ao fazer upload",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// ========================================
// HOOK: useRemoverFoto - Remover foto
// ========================================

export function useRemoverFoto() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (userId: string) => profileService.removerFoto(userId),

    onSuccess: (data) => {
      // Atualiza cache do perfil
      queryClient.setQueryData(QUERY_KEYS.profile, data);

      toast({
        title: "Foto removida!",
        description: "Sua foto de perfil foi removida com sucesso.",
      });
    },

    onError: (error: Error) => {
      toast({
        title: "Erro ao remover foto",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// ========================================
// HOOK: useDeletarConta - Deletar conta
// ========================================

export function useDeletarConta() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ userId, senha }: { userId: string; senha: string }) =>
      profileService.deletarConta(userId, senha),

    onSuccess: () => {
      toast({
        title: "Conta deletada",
        description: "Sua conta foi excluída permanentemente.",
      });

      // Redireciona para login após 2s
      setTimeout(() => {
        window.location.href = "/login";
      }, 2000);
    },

    onError: (error: Error) => {
      toast({
        title: "Erro ao deletar conta",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}