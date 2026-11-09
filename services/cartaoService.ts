// src/services/cartaoService.ts

import {
  Cartao,
  CreateCartaoDTO,
  UpdateCartaoDTO,
} from "@/types/cartao";

export const cartaoService = {
  /**
   * Lista todos os cartões do usuário autenticado
   */
  async listar(): Promise<Cartao[]> {
    const res = await fetch("/api/cartoes");
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: "Erro ao listar cartões" }));
      throw new Error(error.message || error.error || "Erro ao listar cartões");
    }
    return res.json();
  },

  /**
   * Cria um novo cartão
   */
  async criar(dados: CreateCartaoDTO): Promise<Cartao> {
    const res = await fetch("/api/cartoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });
    
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: "Erro ao criar cartão" }));
      throw new Error(error.message || error.error || "Erro ao criar cartão");
    }
    
    return res.json();
  },

  /**
   * Atualiza um cartão existente
   */
  async atualizar(id: number, dados: UpdateCartaoDTO): Promise<Cartao> {
    const res = await fetch(`/api/cartoes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });
    
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: "Erro ao atualizar cartão" }));
      throw new Error(error.message || error.error || "Erro ao atualizar cartão");
    }
    
    return res.json();
  },

  /**
   * Remove um cartão
   */
  async remover(id: number): Promise<void> {
    const res = await fetch(`/api/cartoes/${id}`, {
      method: "DELETE",
    });
    
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: "Erro ao remover cartão" }));
      throw new Error(error.message || error.error || "Erro ao remover cartão");
    }
  },

};