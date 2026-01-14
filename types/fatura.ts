// src/types/fatura.ts

import { TransacaoFatura } from "./cartao";

// ========================================
// TIPOS: Fatura de Cartão
// ========================================

/**
 * Interface principal de Fatura
 * Representa uma fatura de cartão de crédito
 */
export interface Fatura {
  id: number;
  userId?: string;
  cartaoId: number;
  mes: number;        // 1-12
  ano: number;
  total: number;
  paga: boolean;
  dataPagamento: string | null;
  contaPagamentoId: string | null;
  createdAt: string | Date;
  updatedAt?: string | Date;
}

/**
 * Status da fatura (calculado dinamicamente)
 */
export type StatusFatura = "PAGA" | "EM_ABERTO" | "ATRASADA";

/**
 * Resumo de fatura com status calculado
 * Usado em listagens e cards
 */
export interface FaturaResumo extends Fatura {
  status: StatusFatura;
  dataVencimento: string;
  diasAteVencimento?: number;
}

/**
 * Resposta detalhada da API de fatura
 * GET /api/cartoes/[id]/fatura
 * 
 * Inclui dados do cartão, período, transações e totais
 */
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
    inicio: string;      // ISO date string
    fim: string;         // ISO date string
    descricao: string;   // Ex: "11/12/2025 - 10/01/2026"
  };
  transacoes: TransacaoFatura[];
  totalTransacoes: number;
  porCategoria?: Record<string, number>; // { "Alimentação": 150.00, ... }
}

/**
 * DTO para pagar fatura
 * POST /api/cartoes/[id]/fatura
 */
export interface PagarFaturaDTO {
  contaId: string;
  dataPagamento?: string; // ISO date, opcional (usa data atual se não fornecido)
}

/**
 * DTO para criar fatura (usado internamente pela API)
 */
export interface CreateFaturaDTO {
  cartaoId: number;
  mes: number;
  ano: number;
  total: number;
}

/**
 * DTO para atualizar fatura (usado internamente pela API)
 */
export interface UpdateFaturaDTO {
  total?: number;
  paga?: boolean;
  dataPagamento?: string | null;
  contaPagamentoId?: string | null;
}

// ========================================
// TIPOS AUXILIARES
// ========================================

/**
 * Filtros para buscar faturas
 * Usado em queries de listagem
 */
export interface FiltrosFatura {
  cartaoId?: number;
  mes?: number;
  ano?: number;
  paga?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * Resposta de listagem de faturas
 */
export interface ListaFaturasResponse {
  faturas: FaturaResumo[];
  total: number;
  page: number;
  pageSize: number;
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