// src/types/fatura.ts

import { TransacaoFatura } from "./cartao";

// ========================================
// TIPOS: Fatura de Cartão
// ========================================

export interface Fatura {
  id: number;
  userId?: string;
  cartaoId: number;
  mes: number;
  ano: number;
  total: number;
  paga: boolean;
  dataPagamento: string | null;
  contaPagamentoId: string | null;
  createdAt: string | Date;
  updatedAt?: string | Date;
}

export type StatusFatura = "PAGA" | "EM_ABERTO" | "ATRASADA";

export interface FaturaResumo extends Fatura {
  status: StatusFatura;
  dataVencimento: string;
  diasAteVencimento?: number;
}

export interface FaturaDetalhada {
  fatura: FaturaResumo;
  cartao: {
    id: number;
    nome: string;
    diaFechamento: number | null;
    diaVencimento: number | null;
    limite: number;
    limiteDisponivel: number;
  };
  periodo: {
    inicio: string;
    fim: string;
    descricao: string;
  };
  transacoes: TransacaoFatura[];
  totalTransacoes: number;
  porCategoria?: Record<string, number>;
}

export interface PagarFaturaDTO {
  contaId: string;
  dataPagamento?: string;
}

export interface CreateFaturaDTO {
  cartaoId: number;
  mes: number;
  ano: number;
  total: number;
}

export interface UpdateFaturaDTO {
  total?: number;
  paga?: boolean;
  dataPagamento?: string | null;
  contaPagamentoId?: string | null;
}

export interface FiltrosFatura {
  cartaoId?: number;
  mes?: number;
  ano?: number;
  paga?: boolean;
  limit?: number;
  offset?: number;
}

export interface ListaFaturasResponse {
  faturas: FaturaResumo[];
  total: number;
  page: number;
  pageSize: number;
}

// ========================================
// TIPOS: Adiantamento de Fatura
// ========================================

/**
 * Adiantamento de fatura
 * Pagamento parcial ou total antecipado de uma fatura aberta.
 * A fatura não é fechada — apenas o total é reduzido e o limite restaurado.
 */
export interface AdiantamentoFatura {
  id:        string;
  userId:    string;
  faturaId:  number;
  contaId:   string;
  valor:     string;   // numeric vem como string do Drizzle/Postgres
  descricao: string | null;
  createdAt: string;
}

/**
 * DTO para registrar adiantamento
 * POST /api/cartoes/[id]/fatura/adiantamento
 */
export interface RegistrarAdiantamentoDTO {
  cartaoId:   number | string;
  mes:        number;
  ano:        number;
  contaId:    string;
  valor:      number;
  descricao?: string;
}

/**
 * DTO para cancelar adiantamento
 * DELETE /api/cartoes/[id]/fatura/adiantamento/[adiantamentoId]
 */
export interface CancelarAdiantamentoDTO {
  cartaoId:       number | string;
  adiantamentoId: string;
  mes:            number;
  ano:            number;
}

// ========================================
// NOTAS SOBRE FUNÇÕES UTILITÁRIAS
// ========================================

/**
 * ⚠️ IMPORTANTE:
 *
 * Todas as funções utilitárias relacionadas a faturas
 * foram movidas para @/utils/faturaUtils.ts
 *
 * Funções disponíveis:
 * - calcularFaturaDaTransacao()
 * - calcularPeriodoFatura()
 * - formatarPeriodoFatura()
 * - calcularDataVencimento()
 * - calcularDiasAteVencimento()
 * - calcularStatusFatura()
 * - faturaEstaFechada()
 * - validarAdicaoTransacao()
 * - formatarNomeFatura()
 * - formatarNomeFaturaAbreviado()
 *
 * @example
 * import { calcularStatusFatura } from "@/utils/faturaUtils";
 *
 * const status = calcularStatusFatura(fatura, cartao.diaVencimento);
 */