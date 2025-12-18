export type TipoTransacao =
  | "entrada"
  | "saida";

export type FormaPagamento =
  | "dinheiro"
  | "pix"
  | "cartao"
  | "transferencia";

export interface Transacao {
  id: number;

  data: string;
  tipo: TipoTransacao;

  descricao?: string | null;
  valor: number;

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