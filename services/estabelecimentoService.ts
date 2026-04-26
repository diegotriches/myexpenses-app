// src/services/estabelecimentoService.ts
import type {
  Estabelecimento,
  CreateEstabelecimentoDTO,
  UpdateEstabelecimentoDTO,
} from "@/types/estabelecimento";

export const estabelecimentoService = {
  async listar(): Promise<Estabelecimento[]> {
    const res = await fetch("/api/estabelecimentos");
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: "Erro ao listar estabelecimentos" }));
      throw new Error(error.error || "Erro ao listar estabelecimentos");
    }
    return res.json();
  },

  async criar(dados: CreateEstabelecimentoDTO): Promise<Estabelecimento> {
    const res = await fetch("/api/estabelecimentos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: "Erro ao criar estabelecimento" }));
      throw new Error(error.error || "Erro ao criar estabelecimento");
    }
    return res.json();
  },

  async atualizar(id: string, dados: UpdateEstabelecimentoDTO): Promise<Estabelecimento> {
    const res = await fetch(`/api/estabelecimentos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: "Erro ao atualizar estabelecimento" }));
      throw new Error(error.error || "Erro ao atualizar estabelecimento");
    }
    return res.json();
  },

  async remover(id: string): Promise<void> {
    const res = await fetch(`/api/estabelecimentos/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: "Erro ao remover estabelecimento" }));
      throw new Error(error.error || "Erro ao remover estabelecimento");
    }
  },
};