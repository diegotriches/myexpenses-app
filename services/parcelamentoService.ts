// src/services/parcelamentoService.ts

export interface AntecipacaoResultado {
  antecipacaoId: string;
  quantidadeAntecipada: number;
  valorFaceAntecipado: number;
  desconto: number;
  valorLancadoNaFaturaAtual: number;
  mesclada: boolean;
  faturaAtual: { mes: number; ano: number };
  novoTotalParcelas: number;
}

export interface AntecipacaoRegistro {
  id: string;
  parcelamentoId: string;
  cartaoId: number;
  faturaAtualId: number;
  transacaoSinteticaId: string;
  valorOriginalTransacaoMesclada: string | null;
  quantidadeAntecipada: number;
  valorFaceAntecipado: string;
  desconto: string;
  valorComDesconto: string;
  totalParcelasOriginal: number;
  createdAt: string;
  podeDesfazer: boolean;
  parcelasRemovidas: Array<{
    parcelaAtual: number | null;
    valor: string;
    data: string;
    descricao: string | null;
    categoria: string | null;
    estabelecimentoId: string | null;
    mes: number;
    ano: number;
  }>;
}

export const parcelamentoService = {
  /**
   * Antecipa as últimas N parcelas ainda não vencidas de um parcelamento
   * POST /api/parcelamentos/[parcelamentoId]/antecipar
   */
  async antecipar(
    parcelamentoId: string,
    dados: { quantidadeParcelas: number; desconto?: number }
  ): Promise<AntecipacaoResultado> {
    const res = await fetch(`/api/parcelamentos/${parcelamentoId}/antecipar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: "Erro ao antecipar parcelas" }));
      throw new Error(error.error || "Erro ao antecipar parcelas");
    }
    return res.json();
  },

  /**
   * Lista antecipações de um parcelamento específico
   * GET /api/parcelamentos/[parcelamentoId]/antecipacoes
   */
  async listarAntecipacoes(parcelamentoId: string): Promise<AntecipacaoRegistro[]> {
    const res = await fetch(`/api/parcelamentos/${parcelamentoId}/antecipacoes`);
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: "Erro ao listar antecipações" }));
      throw new Error(error.error || "Erro ao listar antecipações");
    }
    return res.json();
  },

  /**
   * Lista TODAS as antecipações do usuário, sem escopo de parcelamento
   * GET /api/antecipacoes
   */
  async listarTodasAntecipacoes(): Promise<AntecipacaoRegistro[]> {
    const res = await fetch(`/api/antecipacoes`);
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: "Erro ao listar antecipações" }));
      throw new Error(error.error || "Erro ao listar antecipações");
    }
    return res.json();
  },

  /**
   * Desfaz uma antecipação — só funciona se a fatura atual não foi paga
   * POST /api/antecipacoes/[antecipacaoId]/desfazer
   */
  async desfazerAntecipacao(antecipacaoId: string): Promise<{ sucesso: boolean; parcelasRestauradas: number }> {
    const res = await fetch(`/api/antecipacoes/${antecipacaoId}/desfazer`, { method: "POST" });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: "Erro ao desfazer antecipação" }));
      throw new Error(error.error || "Erro ao desfazer antecipação");
    }
    return res.json();
  },
};