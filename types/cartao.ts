// ========================================
// TIPOS: Cartão de Crédito/Débito
// ========================================

export interface Cartao {
  id: number;
  userId: string;
  nome: string;
  tipo: "credito" | "debito";
  limite: string;           // Ex: "1000.00"
  limiteDisponivel: string; // Ex: "850.50"
  diaFechamento: number;    // 1-31
  diaVencimento: number;    // 1-31
  bandeira: string;
  empresa: string;
  observacoes: string;
  contaVinculadaId: string | null;
  ativo: boolean;
  createdAt: string | Date;
}

export interface CartaoCreate {
  nome: string;
  tipo: "credito" | "debito";
  limite: number | string;
  diaFechamento: number;
  diaVencimento: number;
  empresa: string;
  contaVinculadaId?: string | null;
  ativo?: boolean;
}

export interface CartaoUpdate {
  nome?: string;
  tipo?: "credito" | "debito";
  limite?: number | string;
  diaFechamento?: number;
  diaVencimento?: number;
  empresa?: string;
  contaVinculadaId?: string | null;
  ativo?: boolean;
}

// ========================================
// HELPER: Converter string para number
// ========================================
export function cartaoLimiteAsNumber(cartao: Cartao): {
  limite: number;
  limiteDisponivel: number;
} {
  return {
    limite: Number(cartao.limite),
    limiteDisponivel: Number(cartao.limiteDisponivel),
  };
}