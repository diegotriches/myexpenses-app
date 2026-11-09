// ========================================
// TIPOS: Estabelecimentos
// ========================================

/**
 * Entidade persistida (GET / DB)
 */
export interface Estabelecimento {
  id: string;
  userId: string;
  nome: string;
  icone: string;
  localizacao?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  // Campos calculados retornados pela API (não persistidos)
  totalTransacoes?: number;
  totalEntrada?: number;  // soma das transações tipo "entrada"
  totalSaida?: number;    // soma das transações tipo "saida"
}

/**
 * Payload de criação (POST)
 */
export interface CreateEstabelecimentoDTO {
  nome: string;
  icone: string;
  localizacao?: string;
}

/**
 * Payload de atualização (PUT)
 */
export interface UpdateEstabelecimentoDTO {
  nome?: string;
  icone?: string;
  localizacao?: string | null;
}