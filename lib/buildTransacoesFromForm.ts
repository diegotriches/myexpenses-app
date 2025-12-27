import {
  Transacao,
  TransacaoBase,
  TransacaoUpdate,
} from "@/types/transacao";
import { buildCreateTransacoesFromForm } from "@/lib/buildCreateTransacoesFromForm";
import { buildUpdateTransacoesFromForm } from "@/lib/buildUpdateTransacoesFromForm";

export type ModoEdicao = "unica" | "todas_parcelas" | "toda_recorrencia";

export interface FormMovimentacao {
  contaId: string;
  tipo: "entrada" | "saida";
  categoria: string;
  valor: string;
  data: string;
  descricao: string;

  formaPagamento: "dinheiro" | "pix" | "cartao";
  cartaoId?: string;

  parcelas: number;
  repeticoes: number;

  parcelado: boolean;
  recorrente: boolean;
}

interface BuildTransacoesParams {
  form: FormMovimentacao;
  contaId?: string;
  transacaoEdicao: Transacao | null;
}

export function buildTransacoesFromForm({
  form,
  contaId,
  transacaoEdicao,
}: BuildTransacoesParams): (TransacaoBase | TransacaoUpdate)[] {

  // EDIÇÃO
  if (transacaoEdicao) {
    return buildUpdateTransacoesFromForm({
      form,
      transacaoEdicao,
    });
  }

  // CRIAÇÃO - Validar se contaId existe
  if (!contaId) {
    throw new Error('contaId é obrigatório para criar uma nova transação');
  }

  return buildCreateTransacoesFromForm({
    form,
    contaId, // Agora TypeScript sabe que não é undefined
  });
}