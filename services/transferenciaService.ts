export const transferenciaService = {
  /**
   * Lista transferências de um período
   */
  async listar(params: { ano: number; mes: number }) {
    const searchParams = new URLSearchParams({
      ano: params.ano.toString(),
      mes: params.mes.toString(),
    });

    const res = await fetch(`/api/transferencias?${searchParams}`);
    if (!res.ok) throw new Error("Erro ao listar transferências");
    return res.json();
  },

  /**
   * Cria uma nova transferência entre contas
   */
  async criar(dados: {
    contaOrigemId: string;
    contaDestinoId: string;
    valor: number;
    descricao?: string;
    data: string; // YYYY-MM-DD
  }) {
    const res = await fetch("/api/transferencias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Erro ao criar transferência");
    }
    return res.json();
  },

  /**
   * Remove (estorna) uma transferência
   */
  async remover(id: string): Promise<{ message: string }> {
    const res = await fetch(`/api/transferencias/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Erro ao remover transferência");
    }
    return res.json();
  },
};