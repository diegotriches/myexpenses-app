// src/hooks/useProfile.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { profileService } from "@/services/profileService";
import type {
  Usuario,
  AtualizarUsuarioDTO,
  AlterarSenhaDTO,
} from "@/types/profile";

export const QUERY_KEYS = {
  profile: ["profile"] as const,
};

export function useProfile() {
  return useQuery({
    queryKey: QUERY_KEYS.profile,
    queryFn: () => profileService.buscarPerfil(),
    staleTime: 5 * 60 * 1000,
    gcTime:    10 * 60 * 1000,
  });
}

export function useAtualizarProfile() {
  const queryClient = useQueryClient();
  const { toast }   = useToast();

  return useMutation({
    mutationFn: ({ userId, dados }: { userId: string; dados: AtualizarUsuarioDTO }) =>
      profileService.atualizarPerfil(userId, dados),

    onMutate: async ({ dados }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.profile });
      const previousProfile = queryClient.getQueryData<Usuario>(QUERY_KEYS.profile);
      if (previousProfile) {
        queryClient.setQueryData<Usuario>(QUERY_KEYS.profile, { ...previousProfile, ...dados });
      }
      return { previousProfile };
    },

    onSuccess: (data) => {
      queryClient.setQueryData(QUERY_KEYS.profile, data);
      toast({ title: "Perfil atualizado!", description: "Suas informações foram salvas com sucesso." });
    },

    onError: (error: Error, _variables, context) => {
      if (context?.previousProfile) {
        queryClient.setQueryData(QUERY_KEYS.profile, context.previousProfile);
      }
      toast({ title: "Erro ao atualizar perfil", description: error.message, variant: "destructive" });
    },
  });
}

export function useAlterarSenha() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ userId, dados }: { userId: string; dados: AlterarSenhaDTO }) =>
      profileService.alterarSenha(userId, dados),
    onSuccess: () => {
      toast({ title: "Senha alterada!", description: "Sua senha foi atualizada com sucesso." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao alterar senha", description: error.message, variant: "destructive" });
    },
  });
}

export function useUploadFoto() {
  const queryClient = useQueryClient();
  const { toast }   = useToast();

  return useMutation({
    mutationFn: ({ userId, file }: { userId: string; file: File }) =>
      profileService.uploadFoto(userId, file),
    onSuccess: (data) => {
      queryClient.setQueryData(QUERY_KEYS.profile, data);
      toast({ title: "Foto atualizada!", description: "Sua foto de perfil foi alterada com sucesso." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao fazer upload", description: error.message, variant: "destructive" });
    },
  });
}

export function useRemoverFoto() {
  const queryClient = useQueryClient();
  const { toast }   = useToast();

  return useMutation({
    mutationFn: (userId: string) => profileService.removerFoto(userId),
    onSuccess: (data) => {
      queryClient.setQueryData(QUERY_KEYS.profile, data);
      toast({ title: "Foto removida!", description: "Sua foto de perfil foi removida com sucesso." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao remover foto", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeletarConta() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ userId, senha }: { userId: string; senha: string }) =>
      profileService.deletarConta(userId, senha),

    onSuccess: async () => {
      toast({
        title: "Conta deletada",
        description: "Sua conta foi excluída permanentemente.",
      });

      // ✅ CORRIGIDO: signOut primeiro para invalidar o cookie JWT no browser.
      // Sem isso, o token continua válido e o AutoLoginWrapper redireciona o
      // usuário para /dashboard mesmo após a exclusão da conta no banco.
      const { signOut } = await import("next-auth/react");
      await signOut({ redirect: false });

      setTimeout(() => {
        window.location.href = "/";
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