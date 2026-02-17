// src/types/cartao.ts

// ========================================
// TIPOS: Cartão de Crédito/Débito
// ========================================

/**
 * Interface principal de Cartão
 */
export interface Cartao {
  id: number;
  userId: string;
  nome: string;
  tipo: "credito" | "debito";
  limite: string;           // Ex: "1000.00" (NUMERIC do PostgreSQL)
  limiteDisponivel: string; // Ex: "850.50" (NUMERIC do PostgreSQL)
  diaFechamento: number | null;    // 1-31
  diaVencimento: number | null;    // 1-31
  bandeira: string;
  empresa: string;
  observacoes: string | null;
  contaVinculadaId: string | null;
  ativo: boolean;
  createdAt: string | Date;
  
  // ✅ CAMPOS CALCULADOS PELA API (GET /api/cartoes)
  emUso?: number; // Total de faturas não pagas
  faturaAtual?: FaturaAtual | null;
}

/**
 * Fatura atual do cartão (calculada pela API)
 */
export interface FaturaAtual {
  id?: number;
  ano: number;
  mes: number;
  total: number;
  paga: boolean;
  dataVencimento: string;
  status: "PAGA" | "EM_ABERTO" | "ATRASADA";
  dataPagamento?: string | null;
  contaPagamentoId?: string | null;
}

/**
 * DTO para criar cartão (sem id, userId, timestamps, campos calculados)
 */
export interface CreateCartaoDTO {
  nome: string;
  tipo: "credito" | "debito";
  limite: number; // Frontend envia como number
  diaFechamento?: number | null;
  diaVencimento?: number | null;
  bandeira?: string;
  empresa?: string;
  observacoes?: string | null;
  contaVinculadaId?: string | null;
  ativo?: boolean;
}

/**
 * DTO para atualizar cartão (todos campos opcionais)
 */
export interface UpdateCartaoDTO {
  nome?: string;
  tipo?: "credito" | "debito";
  limite?: number; // Frontend envia como number
  diaFechamento?: number | null;
  diaVencimento?: number | null;
  bandeira?: string;
  empresa?: string;
  observacoes?: string | null;
  contaVinculadaId?: string | null;
  ativo?: boolean;
}

/**
 * Resposta detalhada da fatura (GET /api/cartoes/[id]/fatura)
 */
export interface FaturaResponse {
  fatura: FaturaAtual;
  cartao: {
    id: number;
    nome: string;
    diaFechamento: number | null;
    diaVencimento: number | null;
  };
  periodo: {
    inicio: string;
    fim: string;
    descricao: string;
  };
  transacoes: TransacaoFatura[];
  totalTransacoes: number;
}

/**
 * Transação vinculada à fatura
 */
export interface TransacaoFatura {
  id: string;
  data: string | Date;
  descricao: string;
  valor: number;
  categoria: string;
  parcelas?: number;
  parcelaAtual?: number;
}

// ========================================
// HELPER: Converter string para number
// ========================================
export function cartaoLimiteAsNumber(cartao: Cartao): {
  limite: number;
  limiteDisponivel: number;
  emUso: number;
} {
  return {
    limite: Number(cartao.limite) || 0,
    limiteDisponivel: Number(cartao.limiteDisponivel) || 0,
    emUso: Number(cartao.emUso) || 0,
  };
}

/**
 * Helper para formatar limite como moeda
 */
export function formatarLimite(cartao: Cartao): {
  limite: string;
  disponivel: string;
  usado: string;
  percentualUsado: number;
} {
  const { limite, limiteDisponivel, emUso } = cartaoLimiteAsNumber(cartao);
  
  return {
    limite: limite.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
    disponivel: limiteDisponivel.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
    usado: emUso.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
    percentualUsado: limite > 0 ? (emUso / limite) * 100 : 0,
  };
}

// ========================================
// TIPOS AUXILIARES
// ========================================
export type TipoCartao = "credito" | "debito";

export type StatusFatura = "PAGA" | "EM_ABERTO" | "ATRASADA";