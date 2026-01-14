// src/services/preferencesService.ts

import type {
  Preferencias,
  AtualizarPreferenciasDTO,
  MessageResponse,
} from "@/types/preferences";

const API_URL = "/api/preferences";

export const preferencesService = {
  /**
   * Busca preferências do usuário logado
   * GET /api/preferences
   */
  async buscar(): Promise<Preferencias> {
    const res = await fetch(API_URL);
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || "Erro ao buscar preferências");
    }
    return res.json();
  },

  /**
   * Atualiza preferências do usuário
   * PUT /api/preferences
   */
  async atualizar(dados: AtualizarPreferenciasDTO): Promise<Preferencias> {
    const res = await fetch(API_URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || "Erro ao atualizar preferências");
    }
    return res.json();
  },

  /**
   * Deleta preferências do usuário (restaura padrão)
   * DELETE /api/preferences
   */
  async deletar(): Promise<MessageResponse> {
    const res = await fetch(API_URL, {
      method: "DELETE",
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || "Erro ao deletar preferências");
    }
    return res.json();
  },
};