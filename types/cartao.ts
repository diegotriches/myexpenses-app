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
  tipo?: string;
  totalmenteEstornada?: boolean;
  parcelas?: number;
  parcelaAtual?: number;
}

// ========================================
// HELPER: Converter string para number
// ========================================
// ========================================
// TIPOS AUXILIARES
// ========================================
export type TipoCartao = "credito" | "debito";

export type StatusFatura = "PAGA" | "EM_ABERTO" | "ATRASADA";

// ── Gastos anuais (GET /api/cartoes/gastos-anuais) ──
export interface GastosAnuaisPorMes {
  mes: number;
  label: string;
  total: number;
  pago: number;
  pendente: number;
}

export interface GastosAnuaisPorCartao {
  id: number;
  nome: string;
  empresa: string | null;
  totalGasto: number;
  totalPago: number;
  totalPendente: number;
}

export interface GastosAnuaisCartoes {
  ano: number;
  totalGasto: number;
  totalPago: number;
  totalPendente: number;
  porMes: GastosAnuaisPorMes[];
  porCartao: GastosAnuaisPorCartao[];
}
