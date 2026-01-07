// src/services/faturaService.ts

export interface PagarFaturaDTO {
  contaId: string;
  dataPagamento?: string;
}

export const faturaService = {
  /**
   * Busca detalhes da fatura de um cartão em um mês/ano específico
   */
  async buscarFatura(cartaoId: number, ano: number, mes: number) {
    const res = await fetch(
      `/api/cartoes/${cartaoId}/fatura?ano=${ano}&mes=${mes}`,
      {
        method: "GET",
      }
    );
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Erro ao buscar fatura");
    }
    
    return res.json();
  },

  /**
   * Paga uma fatura
   */
  async pagar(
    cartaoId: number,
    ano: number,
    mes: number,
    dados: PagarFaturaDTO
  ) {
    const res = await fetch(
      `/api/cartoes/${cartaoId}/fatura?ano=${ano}&mes=${mes}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados),
      }
    );
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Erro ao pagar fatura");
    }
    
    return res.json();
  },

  /**
   * Estorna o pagamento de uma fatura
   */
  async estornarPagamento(cartaoId: number, ano: number, mes: number) {
    const res = await fetch(
      `/api/cartoes/${cartaoId}/fatura?ano=${ano}&mes=${mes}`,
      {
        method: "DELETE",
      }
    );
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Erro ao estornar pagamento");
    }
    
    return res.json();
  },
};