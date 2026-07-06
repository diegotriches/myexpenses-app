// src/types/profile.ts

/**
 * Interface do Usuário (completa)
 */
export interface Usuario {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  emailVerified?: string | Date | null;
  createdAt: string | Date;
  // ✅ NOVO: indica se o usuário tem senha cadastrada (false = conta OAuth)
  hasPassword: boolean;
}

/**
 * DTO para atualizar dados do usuário (nome/email)
 */
export interface AtualizarUsuarioDTO {
  name?: string;
  email?: string;
}

/**
 * DTO para alterar senha do usuário
 */
export interface AlterarSenhaDTO {
  senhaAtual: string;
  senhaNova: string;
  confirmarSenha: string;
}

/**
 * Response padrão de mensagem
 */
export interface MessageResponse {
  message: string;
}