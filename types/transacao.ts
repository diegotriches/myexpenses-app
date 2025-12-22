export type TipoTransacao = "entrada" | "saida";

export type FormaPagamento =
  | "dinheiro"
  | "pix"
  | "cartao"
  | "transferencia";

export type TipoPagamento = "avista" | "parcelado" | "recorrente";

/*Campos comuns a qualquer transação, independentemente de existir no banco ou não*/
export interface TransacaoBase {
  data: string;
  tipo: TipoTransacao;

  descricao?: string | null;
  valor: string;

  categoria?: string | null;

  formaPagamento?: FormaPagamento | null;
  cartaoId?: number | null;

  recorrente?: boolean;
  recorrenciaId?: string;
  repeticoes?: number;

  parcelado?: boolean;
  parcelamentoId?: string;
  parcelas?: number;
  parcelaAtual?: number;

  contaId: string;

  transferenciaId?: string;
}

/*Entidade persistida (GET / DB)*/
export interface Transacao extends TransacaoBase {
  id: string;
}

/* Payload de criação (POST) */
export type TransacaoCreate = TransacaoBase;

/*Payload de atualização (PUT) * Sempre precisa de ID*/
export type TransacaoUpdate = Partial<TransacaoBase> & {
  id: string;
};