// src/services/rendaVariavelService.ts

import type { CotacaoRv, OperacaoRv, TipoAtivo, TipoOperacao } from "@/utils/rendaVariavelUtils";

export interface OperacaoRvApi extends OperacaoRv {
  contaId: string | null;
  movimentouConta: boolean;
  createdAt: string;
}

export interface RendaVariavelData {
  operacoes: OperacaoRvApi[];
  cotacoes: CotacaoRv[];
}

export interface ResultadoAtualizacaoCotacoes {
  atualizados: string[];
  ignorados: string[];
  falhas: { ticker: string; motivo: string }[];
  interrompido: "sem-chave" | "chave-invalida" | "limite" | null;
}

export interface CriarOperacaoRvDTO {
  ticker: string;
  tipoAtivo: TipoAtivo;
  tipo: TipoOperacao;
  data: string; // YYYY-MM-DD
  quantidade: number;
  precoUnitario: number;
  taxas?: number;
  contaId?: string;
  movimentarConta?: boolean;
}

async function tratar<T>(res: Response, fallback: string): Promise<T> {
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: fallback }));
    throw new Error(error.error || fallback);
  }
  return res.json();
}

export const rendaVariavelService = {
  async listar(): Promise<RendaVariavelData> {
    return tratar(await fetch("/api/renda-variavel"), "Erro ao carregar renda variável");
  },

  async criar(dados: CriarOperacaoRvDTO): Promise<OperacaoRvApi> {
    return tratar(
      await fetch("/api/renda-variavel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados),
      }),
      "Erro ao registrar operação",
    );
  },

  async excluir(id: string): Promise<{ ok: boolean }> {
    return tratar(
      await fetch(`/api/renda-variavel/${id}`, { method: "DELETE" }),
      "Erro ao excluir operação",
    );
  },

  async atualizarCotacoes(forcar = false): Promise<ResultadoAtualizacaoCotacoes> {
    return tratar(
      await fetch("/api/renda-variavel/cotacoes/atualizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forcar }),
      }),
      "Erro ao atualizar cotações",
    );
  },

  async salvarCotacao(ticker: string, preco: number): Promise<{ ok: boolean }> {
    return tratar(
      await fetch("/api/renda-variavel/cotacoes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker, preco }),
      }),
      "Erro ao salvar cotação",
    );
  },
};