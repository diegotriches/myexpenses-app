// src/services/aplicacaoService.ts

export interface Aplicacao {
  id: string;
  userId: string;
  contaId: string;
  descricao: string | null;
  valorPrincipal: string;
  valorAtual: string;
  indexador: "cdi" | "selic";
  percentualIndexador: string;
  tributacao: "isento" | "tributavel";
  dataAplicacao: string;
  dataVencimento: string | null; // null = liquidez diária
  resgatada: boolean;
  dataResgate: string | null;
  valorResgatado: string | null;
  impostoRetido: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAplicacaoDTO {
  contaId: string;
  descricao?: string;
  valor: number;
  indexador: "cdi" | "selic";
  percentualIndexador: number;
  tributacao: "isento" | "tributavel";
  dataVencimento?: string; // YYYY-MM-DD — omitido = liquidez diária
}

export const aplicacaoService = {
  async listar(contaId?: string): Promise<Aplicacao[]> {
    const url = contaId ? `/api/aplicacoes?contaId=${contaId}` : "/api/aplicacoes";
    const res = await fetch(url);
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: "Erro ao listar aplicações" }));
      throw new Error(error.error || "Erro ao listar aplicações");
    }
    return res.json();
  },

  async criar(dados: CreateAplicacaoDTO): Promise<Aplicacao> {
    const res = await fetch("/api/aplicacoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: "Erro ao criar aplicação" }));
      throw new Error(error.error || "Erro ao criar aplicação");
    }
    return res.json();
  },

  async resgatar(id: string): Promise<Aplicacao> {
    const res = await fetch(`/api/aplicacoes/${id}/resgatar`, { method: "POST" });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: "Erro ao resgatar aplicação" }));
      throw new Error(error.error || "Erro ao resgatar aplicação");
    }
    return res.json();
  },
};