// src/services/transacaoService.ts

import {
  Transacao,
  CreateTransacaoDTO,
  UpdateTransacaoDTO,
  FiltrosTransacao,
  CreateTransacaoCartaoDTO,
  TransacaoCartaoResponse,
  ModoEdicao,
} from "@/types/transacao";

export interface PreviaEstorno {
  parcelado: boolean;
  valorCompra: number;
  jaEstornado: number;
  disponivel: number;
  lancamentos: { mes: number; ano: number; valor: number; data: string }[];
  cancelamento: { bloqueado: boolean; parcelasExcluidas: number; valorEstorno: number };
}

export interface EstornarDTO {
  modo: "valor" | "cancelar";
  valor?: number;
  data: string;
  motivo?: string;
}

export const transacaoService = {
  /**
   * Lista transações com filtros opcionais
   *
   * @param params - Filtros (ano, mes, tipo, categoria, etc)
   * @returns Lista de transações
   *
   * @example
   * const transacoes = await transacaoService.listar({ ano: 2026, mes: 1 });
   */
  async listar(params?: FiltrosTransacao): Promise<Transacao[]> {
    const searchParams = new URLSearchParams();

    if (params?.ano) searchParams.set("ano", params.ano.toString());
    if (params?.mes) searchParams.set("mes", params.mes.toString());
    if (params?.tipo) searchParams.set("tipo", params.tipo);
    if (params?.categoria) searchParams.set("categoria", params.categoria);
    if (params?.formaPagamento)
      searchParams.set("formaPagamento", params.formaPagamento);
    if (params?.contaId) searchParams.set("contaId", params.contaId);
    if (params?.cartaoId)
      searchParams.set("cartaoId", params.cartaoId.toString());
    if (params?.busca) searchParams.set("busca", params.busca);

    const res = await fetch(`/api/transacoes?${searchParams}`);

    if (!res.ok) {
      const error = await res
        .json()
        .catch(() => ({ error: "Erro ao listar transações" }));
      throw new Error(
        error.error || error.message || "Erro ao listar transações",
      );
    }

    return res.json();
  },

  /**
   * Busca uma transação específica por ID
   *
   * @param id - ID da transação
   * @returns Transação encontrada
   *
   * @example
   * const transacao = await transacaoService.buscarPorId("trans-123");
   */
  async buscarPorId(id: string): Promise<Transacao> {
    const res = await fetch(`/api/transacoes/${id}`);

    if (!res.ok) {
      const error = await res
        .json()
        .catch(() => ({ error: "Transação não encontrada" }));
      throw new Error(
        error.error || error.message || "Transação não encontrada",
      );
    }

    return res.json();
  },

  /**
   * Cria uma nova transação
   *
   * @param dados - Dados da transação
   * @returns Transação(ões) criada(s)
   *
   * @example
   * const transacao = await transacaoService.criar({
   *   tipo: "saida",
   *   valor: 100,
   *   data: "2026-01-08",
   *   descricao: "Supermercado",
   *   contaId: "123",
   *   formaPagamento: "pix"
   * });
   */
  async criar(dados: CreateTransacaoDTO): Promise<Transacao | Transacao[]> {
    const res = await fetch("/api/transacoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });

    if (!res.ok) {
      const error = await res
        .json()
        .catch(() => ({ error: "Erro ao criar transação" }));
      throw new Error(
        error.error || error.message || "Erro ao criar transação",
      );
    }

    return res.json();
  },

  /**
   * Atualiza uma transação existente
   *
   * @param id - ID da transação
   * @param dados - Dados a atualizar (inclui modoEdicao)
   * @returns Transação(ões) atualizada(s)
   *
   * @example
   * const transacao = await transacaoService.atualizar("123", {
   *   modoEdicao: "unica",
   *   descricao: "Nova descrição"
   * });
   */
  async atualizar(
    id: string,
    dados: UpdateTransacaoDTO,
  ): Promise<Transacao | Transacao[]> {
    const res = await fetch(`/api/transacoes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });

    if (!res.ok) {
      const error = await res
        .json()
        .catch(() => ({ error: "Erro ao atualizar transação" }));
      throw new Error(
        error.error || error.message || "Erro ao atualizar transação",
      );
    }

    return res.json();
  },

  /**
   * Remove uma transação
   *
   * @param id - ID da transação
   * @param tipo - Modo de exclusão (unica, todas_parcelas, toda_recorrencia)
   * @returns void
   *
   * @example
   * await transacaoService.remover("123", "unica");
   */
  async previaEstorno(id: string, valor: number, data: string): Promise<PreviaEstorno> {
    const params = new URLSearchParams({ data });
    if (valor > 0) params.set("valor", valor.toFixed(2));
    const res = await fetch(`/api/transacoes/${id}/estornar?${params}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Erro ao calcular o estorno");
    return json;
  },

  async estornar(id: string, dados: EstornarDTO): Promise<void> {
    const res = await fetch(`/api/transacoes/${id}/estornar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error || "Erro ao registrar o estorno");
    }
  },

  async remover(id: string, tipo?: ModoEdicao): Promise<void> {
    const searchParams = new URLSearchParams();
    if (tipo) searchParams.set("tipo", tipo);

    const res = await fetch(`/api/transacoes/${id}?${searchParams}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const error = await res
        .json()
        .catch(() => ({ error: "Erro ao remover transação" }));
      throw new Error(
        error.error || error.message || "Erro ao remover transação",
      );
    }
  },

  /**
   * Cria uma transação no cartão (com ou sem parcelamento)
   *
   * @param dados - Dados da transação no cartão
   * @returns Resposta com sucesso e transações criadas
   *
   * @example
   * const result = await transacaoService.criarNoCartao({
   *   cartaoId: 1,
   *   contaId: "123",
   *   descricao: "Compra parcelada",
   *   valor: 1200,
   *   parcelado: true,
   *   parcelas: 12
   * });
   */
  async criarNoCartao(
    dados: CreateTransacaoCartaoDTO,
  ): Promise<TransacaoCartaoResponse> {
    const res = await fetch("/api/transacoes/cartao", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });

    if (!res.ok) {
      const error = await res
        .json()
        .catch(() => ({ error: "Erro ao criar transação no cartão" }));
      throw new Error(
        error.error || error.message || "Erro ao criar transação no cartão",
      );
    }

    return res.json();
  },

  /**
   * Lista as transações de um ano inteiro: de janeiro até o mês atual no ano
   * vigente, de janeiro a dezembro nos anos passados.
   * Usado pelos cards de categorias do dashboard (seletor de ano).
   */
  async listarPorAno(ano: number): Promise<Transacao[]> {
    const res = await fetch(`/api/transacoes?anoCompleto=${ano}`);

    if (!res.ok) {
      const error = await res
        .json()
        .catch(() => ({ error: "Erro ao listar transações" }));
      throw new Error(
        error.error || error.message || "Erro ao listar transações",
      );
    }

    return res.json();
  },

  /**
   * Lista TODAS as transações do usuário, sem filtro de período.
   * Usado pelo CardParcelados, que precisa do histórico completo de cada
   * parcelamento (incluindo parcelas fora da janela de qualquer filtro)
   * para calcular corretamente o progresso pago/total.
   */
  async listarTodas(): Promise<Transacao[]> {
    const res = await fetch(`/api/transacoes`);

    if (!res.ok) {
      const error = await res
        .json()
        .catch(() => ({ error: "Erro ao listar transações" }));
      throw new Error(
        error.error || error.message || "Erro ao listar transações",
      );
    }

    return res.json();
  },
};