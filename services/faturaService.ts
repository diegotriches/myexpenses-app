// src/services/faturaService.ts

import { FaturaDetalhada, PagarFaturaDTO } from "@/types/fatura";

export const faturaService = {
  /**
   * Busca detalhes da fatura de um cartão em um mês/ano específico
   * 
   * @param cartaoId - ID do cartão
   * @param ano - Ano da fatura
   * @param mes - Mês da fatura (1-12)
   * @returns Dados detalhados da fatura
   */
  async buscarFatura(
    cartaoId: number | string,
    ano: number,
    mes: number
  ): Promise<FaturaDetalhada> {
    const res = await fetch(
      `/api/cartoes/${cartaoId}/fatura?ano=${ano}&mes=${mes}`,
      {
        method: "GET",
      }
    );
    
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: "Erro ao buscar fatura" }));
      throw new Error(error.error || error.message || "Erro ao buscar fatura");
    }
    
    return res.json();
  },

  /**
   * Paga uma fatura
   * 
   * @param cartaoId - ID do cartão
   * @param ano - Ano da fatura
   * @param mes - Mês da fatura (1-12)
   * @param dados - Dados do pagamento (contaId, dataPagamento)
   * @returns Dados atualizados da fatura
   */
  async pagar(
    cartaoId: number | string,
    ano: number,
    mes: number,
    dados: PagarFaturaDTO
  ): Promise<FaturaDetalhada> {
    const res = await fetch(
      `/api/cartoes/${cartaoId}/fatura?ano=${ano}&mes=${mes}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados),
      }
    );
    
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: "Erro ao pagar fatura" }));
      throw new Error(error.error || error.message || "Erro ao pagar fatura");
    }
    
    return res.json();
  },

  async estornarPagamento(cartaoId: number | string, ano: number, mes: number): Promise<void> {
    const res = await fetch(`/api/cartoes/${cartaoId}/fatura?ano=${ano}&mes=${mes}`, { method: "DELETE" });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: "Erro ao cancelar pagamento" }));
      throw new Error(error.error || error.message || "Erro ao cancelar pagamento");
    }
  },

};