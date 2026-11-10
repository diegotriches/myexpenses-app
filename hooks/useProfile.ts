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
    gcTime: 10 * 60 * 1000,
  });
}

export function useAtualizarProfile() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      userId,
      dados,
    }: {
      userId: string;
      dados: AtualizarUsuarioDTO;
    }) => profileService.atualizarPerfil(userId, dados),

    onMutate: async ({ dados }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.profile });
      const previousProfile = queryClient.getQueryData<Usuario>(
        QUERY_KEYS.profile,
      );
      if (previousProfile) {
        // Só o nome muda na hora; o e-mail espera a confirmação pelo link
        queryClient.setQueryData<Usuario>(QUERY_KEYS.profile, {
          ...previousProfile,
          ...(dados.name !== undefined && { name: dados.name }),
        });
      }
      return { previousProfile };
    },

    onSuccess: (data, { dados }) => {
      queryClient.setQueryData(QUERY_KEYS.profile, data);
      const pediuTroca = !!dados.email && dados.email === data.emailPendente;
      toast({
        title: pediuTroca ? "Confirme o novo e-mail" : "Perfil atualizado!",
        description: pediuTroca
          ? `Enviamos um link para ${data.emailPendente}. O e-mail da conta só muda depois que você abrir o link.`
          : "Suas informações foram salvas com sucesso.",
      });
    },

    onError: (error: Error, _variables, context) => {
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

export function useCancelarTrocaEmail() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (userId: string) => profileService.cancelarTrocaEmail(userId),
    onSuccess: (data) => {
      queryClient.setQueryData(QUERY_KEYS.profile, data);
      toast({ title: "Troca de e-mail cancelada", description: "O link enviado deixou de valer." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao cancelar a troca", description: error.message, variant: "destructive" });
    },
  });
}

export function useAlterarSenha() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      userId,
      dados,
    }: {
      userId: string;
      dados: AlterarSenhaDTO;
    }) => profileService.alterarSenha(userId, dados),
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

export function useUploadFoto() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ userId, file }: { userId: string; file: File }) =>
      profileService.uploadFoto(userId, file),
    onSuccess: (data) => {
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

export function useRemoverFoto() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (userId: string) => profileService.removerFoto(userId),
    onSuccess: (data) => {
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

export function useDeletarConta() {
  const { toast } = useToast();

  return useMutation({
    // ✅ CORRIGIDO: senha agora é opcional — usuários OAuth não enviam senha
    mutationFn: ({ userId, senha }: { userId: string; senha?: string }) =>
      profileService.deletarConta(userId, senha),

    onSuccess: async () => {
      toast({
        title: "Conta deletada",
        description: "Sua conta foi excluída permanentemente.",
      });

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
