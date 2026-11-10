import { comJson, requisicao } from "@/services/http";

interface Mensagem {
  message?: string;
}

interface ValidacaoTokenReset {
  valid: boolean;
  email?: string;
  error?: string;
}

export const authService = {
  registrar(dados: { name: string; email: string; password: string }) {
    return requisicao<Mensagem>("/api/auth/register", comJson("POST", dados), "Tente novamente mais tarde.");
  },

  solicitarRecuperacaoSenha(email: string) {
    return requisicao<Mensagem>(
      "/api/auth/forgot-password",
      comJson("POST", { email }),
      "Não foi possível enviar o e-mail de recuperação. Tente novamente.",
    );
  },

  validarTokenReset(token: string) {
    return requisicao<ValidacaoTokenReset>(
      `/api/auth/verify-reset-token?token=${encodeURIComponent(token)}`,
      undefined,
      "Token inválido",
    );
  },

  redefinirSenha(token: string, password: string) {
    return requisicao<Mensagem>("/api/auth/reset-password", comJson("POST", { token, password }), "Tente novamente mais tarde.");
  },

  verificarEmail(token: string) {
    return requisicao<Mensagem>(`/api/auth/verify-email?token=${encodeURIComponent(token)}`, undefined, "Token inválido ou expirado.");
  },

  /** Aplica a troca de e-mail pedida no perfil (link enviado ao endereço novo) */
  confirmarTrocaEmail(token: string) {
    return requisicao<{ message?: string; email: string }>(
      "/api/auth/confirmar-troca-email",
      comJson("POST", { token }),
      "Não foi possível confirmar a troca de e-mail.",
    );
  },

  reenviarVerificacao(email: string) {
    return requisicao<Mensagem>("/api/auth/resend-verification", comJson("POST", { email }), "Erro ao reenviar. Tente novamente.");
  },
};
