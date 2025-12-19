import { Cartao } from "@/types/cartao";

export const cartaoService = {
  async listar(): Promise<Cartao[]> {
    const res = await fetch("/api/cartoes");
    if (!res.ok) throw new Error("Erro ao listar cartões");
    return res.json();
  },

  async criar(dados: Cartao) {
    const res = await fetch("/api/cartoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });
    if (!res.ok) throw new Error("Erro ao criar cartão");
    return res.json();
  },

  async atualizar(id: number, dados: Cartao) {
    const res = await fetch(`/api/cartoes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });
    if (!res.ok) throw new Error("Erro ao atualizar cartão");
    return res.json();
  },

  async remover(id: number) {
    const res = await fetch(`/api/cartoes/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Erro ao remover cartão");
    return res.json();
  },

  // ✅ Nova função para fatura
  async fatura(cartaoId: number | string, ano: number, mes: number) {
    const res = await fetch(
      `/api/cartoes/${cartaoId}/fatura?ano=${ano}&mes=${mes}`
    );
    if (!res.ok) throw new Error("Erro ao buscar fatura do cartão");
    return res.json();
  },
};