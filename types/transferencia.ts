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

