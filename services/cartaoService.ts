// src/services/cartaoService.ts

import { 
  Cartao, 
  CreateCartaoDTO, 
  UpdateCartaoDTO,
  FaturaResponse 
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
   * Busca um cartão específico por ID
   */
  async buscarPorId(id: number): Promise<Cartao> {
    const res = await fetch(`/api/cartoes/${id}`);
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: "Cartão não encontrado" }));
      throw new Error(error.message || error.error || "Cartão não encontrado");
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

  /**
   * Busca a fatura de um cartão em um mês/ano específico
   */
  async fatura(
    cartaoId: number | string, 
    ano: number, 
    mes: number
  ): Promise<FaturaResponse> {
    const res = await fetch(
      `/api/cartoes/${cartaoId}/fatura?ano=${ano}&mes=${mes}`
    );
    
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: "Erro ao buscar fatura do cartão" }));
      throw new Error(error.message || error.error || "Erro ao buscar fatura do cartão");
    }
    
    return res.json();
  },

  /**
   * Paga uma fatura de cartão
   */
  async pagarFatura(
    cartaoId: number | string,
    ano: number,
    mes: number,
    dados: {
      contaPagamentoId: string;
      dataPagamento?: string;
    }
  ): Promise<FaturaResponse> {
    const res = await fetch(
      `/api/cartoes/${cartaoId}/fatura?ano=${ano}&mes=${mes}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados),
      }
    );
    
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: "Erro ao pagar fatura" }));
      throw new Error(error.message || error.error || "Erro ao pagar fatura");
    }
    
    return res.json();
  },

  /**
   * Estorna o pagamento de uma fatura
   */
  async estornarPagamento(
    cartaoId: number | string,
    ano: number,
    mes: number
  ): Promise<FaturaResponse> {
    const res = await fetch(
      `/api/cartoes/${cartaoId}/fatura?ano=${ano}&mes=${mes}`,
      {
        method: "DELETE",
      }
    );
    
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: "Erro ao estornar pagamento" }));
      throw new Error(error.message || error.error || "Erro ao estornar pagamento");
    }
    
    return res.json();
  },
};