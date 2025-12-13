import { Cartao } from "@/types/cartao";

export const cartaoService = {
  async listar(): Promise<Cartao[]> {
    const res = await fetch("/api/cartoes");
    return res.json();
  },

  async criar(dados: Cartao) {
    await fetch("/api/cartoes", {
      method: "POST",
      body: JSON.stringify(dados),
    });
  },

  async atualizar(id: number, dados: Cartao) {
    await fetch(`/api/cartoes/${id}`, {
      method: "PUT",
      body: JSON.stringify(dados),
    });
  },

  async remover(id: number) {
    await fetch(`/api/cartoes/${id}`, {
      method: "DELETE",
    });
  },
};
