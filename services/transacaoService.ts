import { Transacao } from "@/types/transacao";

export const transacaoService = {
  /**
   * Lista transações (opcionalmente filtrando por período)
   */
  async listar(params?: { ano?: number; mes?: number }): Promise<Transacao[]> {
    const searchParams = new URLSearchParams();
    if (params?.ano) searchParams.set("ano", params.ano.toString());
    if (params?.mes) searchParams.set("mes", params.mes.toString());

    const res = await fetch(`/api/transacoes?${searchParams}`);
    if (!res.ok) throw new Error("Erro ao listar transações");
    return res.json();
  },

  /**
   * Cria uma nova transação
   */
  async criar(dados: {
    tipo: "entrada" | "saida";
    valor: number;
    data: string;
    descricao?: string;
    categoria?: string;
    formaPagamento?: "dinheiro" | "pix" | "cartao";
    contaId?: string;
    cartaoId?: number;
  }): Promise<Transacao> {
    const res = await fetch("/api/transacoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Erro ao criar transação");
    }
    return res.json();
  },

  /**
   * Atualiza uma transação existente
   */
  async atualizar(
    id: string,
    dados: {
      modoEdicao: "unica" | "todas_parcelas";
      tipo?: string;
      descricao?: string;
      valor?: number;
      data?: string;
      categoria?: string;
      contaId?: string;
      formaPagamento?: string;
      cartaoId?: number | null;
      parcelamentoId?: string;
      parcelas?: number;
    }
  ): Promise<Transacao | Transacao[]> {
    const res = await fetch(`/api/transacoes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });
    if (!res.ok) throw new Error("Erro ao atualizar transação");
    return res.json();
  },

  /**
   * Remove uma transação
   */
  async remover(
    id: string,
    tipo?: "unica" | "todas_parcelas" | "toda_recorrencia"
  ): Promise<void> {
    const searchParams = new URLSearchParams();
    if (tipo) searchParams.set("tipo", tipo);

    const res = await fetch(`/api/transacoes/${id}?${searchParams}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Erro ao remover transação");
  },

  /**
   * Cria uma transação no cartão (com ou sem parcelamento)
   */
  async criarNoCartao(dados: {
    cartaoId: number;
    contaId: string;
    descricao: string;
    valor: number;
    data?: string;
    categoria?: string;
    parcelado?: boolean;
    parcelas?: number;
  }): Promise<{ success: boolean; message: string }> {
    const res = await fetch("/api/transacao-cartao", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Erro ao criar transação no cartão");
    }
    return res.json();
  },
};