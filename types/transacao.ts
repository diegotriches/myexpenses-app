// src/types/transacao.ts

// ========================================
// TIPOS: Transações
// ========================================

export type TipoTransacao = "entrada" | "saida" | "estorno";

export type FormaPagamento = "dinheiro" | "pix" | "cartao" | "transferencia";

export type ModoEdicao = "unica" | "todas_parcelas" | "toda_recorrencia";

/**
 * Campos comuns a qualquer transação
 */
export interface TransacaoBase {
  data: string | Date;
  tipo: TipoTransacao;
  descricao?: string | null;
  valor: number | string;
  categoria?: string | null;
  formaPagamento?: FormaPagamento | null;
  contaId: string;
  cartaoId?: number | null;
  estabelecimentoId?: string | null;

  // Parcelamento
  parcelado?: boolean;
  parcelamentoId?: string | null;
  parcelas?: number | null;
  parcelaAtual?: number | null;

  // Recorrência
  recorrente?: boolean;
  recorrenciaId?: string | null;
  totalmenteEstornada?: boolean;
  repeticoes?: number | null;

  // Transferência
  transferenciaId?: string | null;
}

/**
 * Entidade persistida (GET / DB)
 */
export interface Transacao extends TransacaoBase {
  id: string;
  userId?: string;
  createdAt?: string | Date;
}

/**
 * Payload de criação (POST)
 */
export interface CreateTransacaoDTO {
  tipo: TipoTransacao;
  valor: number;
  data: string;
  descricao?: string;
  categoria?: string;
  formaPagamento?: FormaPagamento;
  contaId: string;
  cartaoId?: number;
  estabelecimentoId?: string;

  // Parcelamento
  parcelado?: boolean;
  parcelas?: number;

  // Recorrência
  recorrente?: boolean;
  repeticoes?: number;
}

/**
 * Payload de atualização (PUT)
 */
export interface UpdateTransacaoDTO {
  modoEdicao: ModoEdicao;
  tipo?: TipoTransacao;
  valor?: number;
  data?: string;
  descricao?: string;
  categoria?: string;
  formaPagamento?: FormaPagamento;
  contaId?: string;
  cartaoId?: number | null;
  estabelecimentoId?: string | null;

  parcelado?: boolean;
  parcelas?: number | null;
  parcelamentoId?: string | null;

  recorrente?: boolean;
  repeticoes?: number | null;
  recorrenciaId?: string | null;
}

/**
 * Filtros para listagem de transações
 */
export interface FiltrosTransacao {
  ano?: number;
  mes?: number;
  tipo?: TipoTransacao;
  categoria?: string;
  formaPagamento?: FormaPagamento;
  contaId?: string;
  cartaoId?: number;
  estabelecimentoId?: string;
  busca?: string;
}

/**
 * Payload para criar transação no cartão (com parcelamento)
 */
export interface CreateTransacaoCartaoDTO {
  cartaoId: number;
  contaId: string;
  descricao: string;
  valor: number;
  data?: string;
  categoria?: string;
  estabelecimentoId?: string;
  parcelado?: boolean;
  parcelas?: number;
}

/**
 * Resposta da API ao criar transação no cartão
 */
export interface TransacaoCartaoResponse {
  success: boolean;
  message: string;
  transacoes?: Transacao[];
}

// ========================================
// HELPERS
// ========================================

export function transacaoValorAsNumber(transacao: Transacao): number {
  return typeof transacao.valor === 'string'
    ? parseFloat(transacao.valor)
    : transacao.valor;
}

export function formatarDataTransacao(data: string | Date): string {
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

export function isTransacaoParcelada(transacao: Transacao): boolean {
  return !!transacao.parcelado && !!transacao.parcelas && transacao.parcelas > 1;
}

export function isTransacaoRecorrente(transacao: Transacao): boolean {
  return !!transacao.recorrente && !!transacao.recorrenciaId;
}

export function isTransferenciaManual(transacao: Transacao): boolean {
  return transacao.formaPagamento === 'transferencia' && !!transacao.transferenciaId;
}

export function validarTransacao(
  dados: CreateTransacaoDTO
): { valido: boolean; erro?: string } {
  if (!dados.tipo) return { valido: false, erro: "Tipo é obrigatório" };
  if (!dados.valor || dados.valor <= 0) return { valido: false, erro: "Valor deve ser maior que zero" };
  if (!dados.data) return { valido: false, erro: "Data é obrigatória" };
  if (!dados.contaId && !dados.cartaoId) return { valido: false, erro: "Selecione uma conta ou cartão" };
  if (dados.parcelado && (!dados.parcelas || dados.parcelas < 2))
    return { valido: false, erro: "Parcelamento deve ter pelo menos 2 parcelas" };
  if (dados.recorrente && (!dados.repeticoes || dados.repeticoes < 2))
    return { valido: false, erro: "Recorrência deve ter pelo menos 2 repetições" };
  return { valido: true };
}

export function formatarDescricaoTransacao(transacao: Transacao): string {
  const base = transacao.descricao || "Sem descrição";
  if (isTransacaoParcelada(transacao)) return `${base} (${transacao.parcelaAtual}/${transacao.parcelas})`;
  if (isTransacaoRecorrente(transacao)) return `${base} (Recorrente)`;
  return base;
}