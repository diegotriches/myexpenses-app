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
  /** Valor original da compra parcelada (soma das parcelas, com as antecipadas), calculado pela listagem */
  totalParcelamento?: number | null;
  /** Parcelas antecipadas desse parcelamento (o total de parcelas da linha já vem reduzido) */
  parcelasAntecipadas?: number;

  // Recorrência
  recorrente?: boolean;
  recorrenciaId?: string | null;
  totalmenteEstornada?: boolean;
  emFaturaPaga?: boolean;
  repeticoes?: number | null;

  // Transferência
  transferenciaId?: string | null;

  // Estorno: compra de origem
  estornoDeId?: string | null;
  // Ocorrência gerada pelo template de recorrência (modelo atual)
  origemRecorrenciaId?: string | null;
}

/**
 * Entidade persistida (GET / DB)
 */
export interface Transacao extends TransacaoBase {
  id: string;
  userId?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date | null;
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

/** O que o formulário de movimentação entrega para salvar: criação (uma ou várias parcelas) ou edição. */
export type DadosSalvarTransacao = CreateTransacaoDTO | CreateTransacaoDTO[] | UpdateTransacaoDTO;

export const ehAtualizacaoTransacao = (d: DadosSalvarTransacao): d is UpdateTransacaoDTO =>
  !Array.isArray(d) && "modoEdicao" in d;

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

