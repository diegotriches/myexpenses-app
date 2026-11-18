export interface AporteAplicacao {
  id: string;
  aplicacaoId: string;
  data: string; // YYYY-MM-DD
  valor: string;
  principalRestante: string;
  valorAtual: string;
  contaId: string | null;
  historico: boolean;
  createdAt: string;
}

export interface ResgateAplicacao {
  id: string;
  aplicacaoId: string;
  data: string;
  valorBruto: string;
  tipo: "parcial" | "total";
  impostoRetido: string | null;
  valorLiquido: string | null;
  historico: boolean;
  createdAt: string;
}

export interface Aplicacao {
  id: string;
  userId: string;
  contaId: string;
  descricao: string | null;
  valorPrincipal: string; // principal ainda investido
  valorAtual: string;     // bruto, confirmado pelo BCB
  indexador: "cdi" | "selic";
  percentualIndexador: string;
  tributacao: "isento" | "tributavel";
  rendeNoDiaAporte: boolean; // true = cada aporte já rende a taxa do próprio dia
  dataAplicacao: string;
  dataVencimento: string | null; // null = liquidez diária
  resgatada: boolean;
  dataResgate: string | null;
  valorResgatado: string | null;
  impostoRetido: string | null;
  createdAt: string;
  updatedAt: string;
  aportes: AporteAplicacao[];
  resgates: ResgateAplicacao[];
  ultimaTaxa: { data: string; taxa: number } | null; // última taxa publicada do indexador
}

export interface CreateAplicacaoDTO {
  contaId: string;
  descricao?: string;
  valor: number;
  indexador: "cdi" | "selic";
  percentualIndexador: number;
  tributacao: "isento" | "tributavel";
  rendeNoDiaAporte?: boolean; // omitido = rende a partir do dia útil seguinte
  dataVencimento?: string; // YYYY-MM-DD — omitido = liquidez diária
  dataAplicacao?: string;  // YYYY-MM-DD — omitido = hoje
  movimentarConta?: boolean; // false + data passada = só histórico, sem descontar da conta
}

export interface AportarDTO {
  valor: number;
  data?: string;
  contaId?: string;
  movimentarConta?: boolean; // false + data passada = só histórico, sem descontar da conta
}

export interface ResgatarDTO {
  total?: boolean;
  valor?: number; // resgate parcial, valor BRUTO
}

async function tratar<T>(res: Response, fallback: string): Promise<T> {
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: fallback }));
    throw new Error(error.error || fallback);
  }
  return res.json();
}

export const aplicacaoService = {
  async listar(contaId?: string): Promise<Aplicacao[]> {
    const url = contaId ? `/api/aplicacoes?contaId=${contaId}` : "/api/aplicacoes";
    return tratar(await fetch(url), "Erro ao listar aplicações");
  },

  async criar(dados: CreateAplicacaoDTO): Promise<Aplicacao> {
    return tratar(
      await fetch("/api/aplicacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados),
      }),
      "Erro ao criar aplicação"
    );
  },

  async aportar(id: string, dados: AportarDTO): Promise<AporteAplicacao> {
    return tratar(
      await fetch(`/api/aplicacoes/${id}/aportes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados),
      }),
      "Erro ao registrar aporte"
    );
  },

  async resgatar(id: string, dados: ResgatarDTO) {
    return tratar<{ ok: boolean; detalhamento: { valorLiquido: number; impostoRetido: number; tipo: "parcial" | "total" } }>(
      await fetch(`/api/aplicacoes/${id}/resgatar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados),
      }),
      "Erro ao resgatar aplicação"
    );
  },

  async recalcular(id: string) {
    return tratar<{ ok: boolean; statusBcb: string; valorAtual: number }>(
      await fetch(`/api/aplicacoes/${id}/recalcular`, { method: "POST" }),
      "Erro ao atualizar rendimentos"
    );
  },
};