// src/services/transferenciaService.ts

import {
  Transferencia,
  CreateTransferenciaDTO,
  FiltrosTransferencia,
  TransferenciaResponse,
} from "@/types/transferencia";

export const transferenciaService = {
  /**
   * Lista transferências de um período
   * 
   * @param params - Filtros (ano, mes, contaOrigemId, contaDestinoId)
   * @returns Lista de transferências
   * 
   * @example
   * const transferencias = await transferenciaService.listar({ ano: 2026, mes: 1 });
   */
  async listar(params?: FiltrosTransferencia): Promise<Transferencia[]> {
    const searchParams = new URLSearchParams();

    if (params?.ano) searchParams.set("ano", params.ano.toString());
    if (params?.mes) searchParams.set("mes", params.mes.toString());
    if (params?.contaOrigemId) searchParams.set("contaOrigemId", params.contaOrigemId);
    if (params?.contaDestinoId) searchParams.set("contaDestinoId", params.contaDestinoId);

    const res = await fetch(`/api/transferencias?${searchParams}`);
    
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: "Erro ao listar transferências" }));
      throw new Error(error.error || error.message || "Erro ao listar transferências");
    }
    
    return res.json();
  },

  /**
   * Busca uma transferência específica por ID
   * 
   * @param id - ID da transferência
   * @returns Transferência encontrada
   * 
   * @example
   * const transferencia = await transferenciaService.buscarPorId("transfer-123");
   */
  async buscarPorId(id: string): Promise<Transferencia> {
    const res = await fetch(`/api/transferencias/${id}`);
    
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: "Transferência não encontrada" }));
      throw new Error(error.error || error.message || "Transferência não encontrada");
    }
    
    return res.json();
  },

  /**
   * Cria uma nova transferência entre contas
   * 
   * @param dados - Dados da transferência
   * @returns Transferência criada
   * 
   * @example
   * const transferencia = await transferenciaService.criar({
   *   contaOrigemId: "123",
   *   contaDestinoId: "456",
   *   valor: 500,
   *   data: "2026-01-08",
   *   descricao: "Transferência entre contas"
   * });
   */
  async criar(dados: CreateTransferenciaDTO): Promise<Transferencia> {
    const res = await fetch("/api/transferencias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });
    
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: "Erro ao criar transferência" }));
      throw new Error(error.error || error.message || "Erro ao criar transferência");
    }
    
    return res.json();
  },

  /**
   * Remove (estorna) uma transferência
   * Reverte saldo das contas e remove do extrato
   * 
   * @param id - ID da transferência
   * @returns Mensagem de sucesso
   * 
   * @example
   * await transferenciaService.remover("transfer-123");
   */
  async remover(id: string): Promise<TransferenciaResponse> {
    const res = await fetch(`/api/transferencias/${id}`, {
      method: "DELETE",
    });
    
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: "Erro ao remover transferência" }));
      throw new Error(error.error || error.message || "Erro ao remover transferência");
    }
    
    return res.json();
  },
};