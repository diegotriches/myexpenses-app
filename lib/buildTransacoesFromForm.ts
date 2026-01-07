import {
  Transacao,
  TransacaoCreate,
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
}: BuildTransacoesParams): (TransacaoCreate | TransacaoUpdate)[] {

  // ✅ EDIÇÃO
  if (transacaoEdicao) {
    return buildUpdateTransacoesFromForm({
      form,
      transacaoEdicao,
    });
  }

  // ✅ CRIAÇÃO - Validar conforme forma de pagamento
  const isCartao = form.formaPagamento === "cartao";
  
  if (isCartao) {
    // Para cartão: cartaoId é obrigatório (contaId pode ser vazio)
    if (!form.cartaoId) {
      throw new Error('Selecione um cartão de crédito');
    }
    
    // Passa string vazia como contaId (será tratado no buildCreate)
    return buildCreateTransacoesFromForm({
      form,
      contaId: '', 
    });
  } else {
    // Para PIX/Dinheiro: contaId é obrigatório
    if (!contaId) {
      throw new Error('Selecione uma conta');
    }
    
    return buildCreateTransacoesFromForm({
      form,
      contaId,
    });
  }
}