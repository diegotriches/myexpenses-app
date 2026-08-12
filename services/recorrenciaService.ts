// src/services/recorrenciaService.ts

import type {
  Recorrencia,
  CreateRecorrenciaDTO,
  UpdateRecorrenciaDTO,
} from "@/types/recorrencia";

const API_URL = "/api/recorrencias";

export const recorrenciaService = {
  /**
   * Lista todas as recorrências (templates) do usuário
   * GET /api/recorrencias
   */
  async listar(): Promise<Recorrencia[]> {
    const res = await fetch(API_URL);
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: "Erro ao listar recorrências" }));
      throw new Error(error.error || "Erro ao listar recorrências");
    }
    return res.json();
  },

  /**
   * Cria uma nova recorrência (template). Se a data escolhida for hoje,
   * a rota já gera a primeira ocorrência imediatamente.
   * POST /api/recorrencias
   */
  async criar(dados: CreateRecorrenciaDTO): Promise<Recorrencia> {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: "Erro ao criar recorrência" }));
      throw new Error(error.error || "Erro ao criar recorrência");
    }
    return res.json();
  },

  /**
   * Atualiza campos permitidos de uma recorrência (pausar/retomar via
   * `ativa`, ou editar descrição/categoria). Não permite alterar valor
   * ou data — isso afetaria ocorrências futuras de forma imprevisível.
   * PATCH /api/recorrencias/[id]
   */
  async atualizar(id: string, dados: UpdateRecorrenciaDTO): Promise<Recorrencia> {
    const res = await fetch(`${API_URL}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: "Erro ao atualizar recorrência" }));
      throw new Error(error.error || "Erro ao atualizar recorrência");
    }
    return res.json();
  },

  /**
   * Cancela a recorrência — para de gerar novas ocorrências. Não afeta
   * as transações já criadas por ela (permanecem no histórico).
   * DELETE /api/recorrencias/[id]
   */
  async cancelar(id: string): Promise<void> {
    const res = await fetch(`${API_URL}/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: "Erro ao cancelar recorrência" }));
      throw new Error(error.error || "Erro ao cancelar recorrência");
    }
  },
};