// src/services/profileService.ts

import type {
  Usuario,
  AtualizarUsuarioDTO,
  AlterarSenhaDTO,
  MessageResponse,
} from "@/types/profile";

const API_URL = "/api/users";

export const profileService = {
  /**
   * Busca dados do usuário logado
   * GET /api/users/me
   */
  async buscarPerfil(): Promise<Usuario> {
    const res = await fetch(`${API_URL}/me`);
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || "Erro ao buscar perfil");
    }
    return res.json();
  },

  /**
   * Atualiza dados do usuário (nome/email)
   * PUT /api/users/[id]
   */
  async atualizarPerfil(userId: string, dados: AtualizarUsuarioDTO): Promise<Usuario> {
    const res = await fetch(`${API_URL}/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || "Erro ao atualizar perfil");
    }
    return res.json();
  },

  /**
   * Altera senha do usuário
   * PUT /api/users/[id]/password
   */
  async alterarSenha(userId: string, dados: AlterarSenhaDTO): Promise<MessageResponse> {
    const res = await fetch(`${API_URL}/${userId}/password`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || "Erro ao alterar senha");
    }
    return res.json();
  },

  /**
   * Upload de foto de perfil
   * POST /api/users/[id]/foto
   */
  async uploadFoto(userId: string, file: File): Promise<Usuario> {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API_URL}/${userId}/foto`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || "Erro ao fazer upload da foto");
    }
    return res.json();
  },

  /**
   * Remove foto de perfil
   * DELETE /api/users/[id]/foto
   */
  async removerFoto(userId: string): Promise<Usuario> {
    const res = await fetch(`${API_URL}/${userId}/foto`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || "Erro ao remover foto");
    }
    return res.json();
  },

  /**
   * Deleta conta do usuário
   * DELETE /api/users/[id]
   */
  async deletarConta(userId: string, senha: string): Promise<MessageResponse> {
    const res = await fetch(`${API_URL}/${userId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ senha }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || "Erro ao deletar conta");
    }
    return res.json();
  },
};