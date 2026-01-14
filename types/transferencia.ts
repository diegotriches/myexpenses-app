// src/types/transferencia.ts

// ========================================
// TIPOS: Transferência entre Contas
// ========================================

/**
 * Interface principal de Transferência
 */
export interface Transferencia {
  id: string;
  userId: string;
  contaOrigemId: string;
  contaDestinoId: string;
  valor: number | string; // NUMERIC do PostgreSQL pode vir como string
  data: string | Date;
  descricao: string;
  createdAt: string | Date;
  
  // ✅ Campos extras retornados pela API (JOIN com contas)
  contaOrigem?: {
    id: string;
    nome: string;
    banco?: string;
  };
  contaDestino?: {
    id: string;
    nome: string;
    banco?: string;
  };
}

/**
 * DTO para criar transferência
 */
export interface CreateTransferenciaDTO {
  contaOrigemId: string;
  contaDestinoId: string;
  valor: number;
  data: string; // ISO date: YYYY-MM-DD
  descricao?: string;
}

/**
 * Filtros para listagem de transferências
 */
export interface FiltrosTransferencia {
  ano?: number;
  mes?: number; // 1-12
  contaOrigemId?: string;
  contaDestinoId?: string;
}

/**
 * Resposta da API ao criar/remover transferência
 */
export interface TransferenciaResponse {
  message: string;
  transferencia?: Transferencia;
}

// ========================================
// HELPERS
// ========================================

/**
 * Converte valor de transferência para number
 */
export function transferenciaValorAsNumber(
  transferencia: Transferencia
): number {
  return typeof transferencia.valor === 'string'
    ? parseFloat(transferencia.valor)
    : transferencia.valor;
}

/**
 * Formata data de transferência
 */
export function formatarDataTransferencia(data: string | Date): string {
  try {
    const date = typeof data === 'string' ? new Date(data) : data;
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return String(data);
  }
}

/**
 * Valida se transferência é válida
 */
export function validarTransferencia(
  dados: CreateTransferenciaDTO
): { valido: boolean; erro?: string } {
  if (!dados.contaOrigemId || !dados.contaDestinoId) {
    return { valido: false, erro: "Selecione as contas de origem e destino" };
  }

  if (dados.contaOrigemId === dados.contaDestinoId) {
    return { valido: false, erro: "Conta de origem e destino não podem ser iguais" };
  }

  if (!dados.valor || dados.valor <= 0) {
    return { valido: false, erro: "Valor deve ser maior que zero" };
  }

  if (!dados.data) {
    return { valido: false, erro: "Selecione uma data" };
  }

  return { valido: true };
}