// ========================================
// TIPOS: Cartão de Crédito/Débito
// ========================================

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
  emUso?: number;
  faturaAtual?: {
    ano: number;
    mes: number;
    total: number;
    paga: boolean;
    dataVencimento: string;
    status: "PAGA" | "EM_ABERTO" | "ATRASADA";
  } | null;
}

export interface CartaoCreate {
  nome: string;
  tipo: "credito" | "debito";
  limite: number | string;
  diaFechamento?: number | null;
  diaVencimento?: number | null;
  bandeira?: string;
  empresa?: string;
  observacoes?: string | null;
  contaVinculadaId?: string | null;
  ativo?: boolean;
}

export interface CartaoUpdate {
  nome?: string;
  tipo?: "credito" | "debito";
  limite?: number | string;
  diaFechamento?: number | null;
  diaVencimento?: number | null;
  bandeira?: string;
  empresa?: string;
  observacoes?: string | null;
  contaVinculadaId?: string | null;
  ativo?: boolean;
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

// ========================================
// TIPOS AUXILIARES
// ========================================
export type TipoCartao = "credito" | "debito";

export type StatusFatura = "PAGA" | "EM_ABERTO" | "ATRASADA";