// src/services/rendaVariavelService.ts

import type { CotacaoRv, EventoOperacao, OperacaoRv, TipoAtivo, TipoOperacao } from "@/utils/rendaVariavelUtils";
import type { ProventoImportavel, ProventoRv, TipoProvento } from "@/utils/proventosUtils";

export interface OperacaoRvApi extends OperacaoRv {
  contaId: string | null;
  movimentouConta: boolean;
  dataEstimada: boolean;
  instituicao: string | null;
  origemImportacao: string | null;
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

export interface CriarProventoRvDTO {
  ticker: string;
  tipo: TipoProvento;
  data: string; // YYYY-MM-DD (pagamento)
  valorLiquido: number;
  quantidade?: number;
  contaId?: string;
  movimentarConta?: boolean;
}

export interface ImportarProventosDTO {
  proventos: ProventoImportavel[];
  creditarConta?: boolean;
  contaId?: string;
}

export interface ResultadoImportacaoProventos {
  inseridos: number;
  duplicados: number;
  invalidos: number;
  total: number;
}

export interface OperacaoParaImportar {
  chave: string;
  ticker: string;
  tipoAtivo: TipoAtivo;
  tipo: TipoOperacao;
  evento: EventoOperacao | null;
  data: string;
  quantidade: number;
  precoUnitario: number;
  dataEstimada: boolean;
  instituicao: string | null;
}

export interface ResultadoImportacaoOperacoes {
  inseridos: number;
  duplicados: number;
  invalidos: number;
  total: number;
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

  async importarOperacoes(operacoes: OperacaoParaImportar[]): Promise<ResultadoImportacaoOperacoes> {
    return tratar(
      await fetch("/api/renda-variavel/operacoes/importar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operacoes }),
      }),
      "Erro ao importar operações",
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

  async listarProventos(): Promise<ProventoRv[]> {
    return tratar(await fetch("/api/renda-variavel/proventos"), "Erro ao carregar proventos");
  },

  async criarProvento(dados: CriarProventoRvDTO): Promise<ProventoRv> {
    return tratar(
      await fetch("/api/renda-variavel/proventos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados),
      }),
      "Erro ao registrar provento",
    );
  },

  async excluirProvento(id: string): Promise<{ ok: boolean }> {
    return tratar(
      await fetch(`/api/renda-variavel/proventos/${id}`, { method: "DELETE" }),
      "Erro ao excluir provento",
    );
  },

  async importarProventos(dados: ImportarProventosDTO): Promise<ResultadoImportacaoProventos> {
    return tratar(
      await fetch("/api/renda-variavel/proventos/importar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados),
      }),
      "Erro ao importar proventos",
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