import { Transacao, UpdateTransacaoDTO, ModoEdicao } from "@/types/transacao";
import { FormMovimentacao } from "./buildTransacoesFromForm";

interface Params {
  form: FormMovimentacao;
  transacaoEdicao: Transacao;
  modoEdicao: ModoEdicao; // ✅ ADICIONADO: modoEdicao é obrigatório
}

export function buildUpdateTransacoesFromForm({
  form,
  transacaoEdicao,
  modoEdicao, // ✅ ADICIONADO
}: Params): UpdateTransacaoDTO[] {
  const isCartao = form.formaPagamento === "cartao";
  
  // ✅ Para cartão: usa cartaoId do form
  // ✅ Para PIX/Dinheiro: mantém contaId original ou usa form.contaId
  const cartaoId = isCartao && form.cartaoId ? Number(form.cartaoId) : null;
  const contaId = !isCartao && form.contaId ? form.contaId : (transacaoEdicao.contaId || "");

  return [
    {
      modoEdicao, // ✅ ADICIONADO: campo obrigatório de UpdateTransacaoDTO
      tipo: form.tipo,
      categoria: form.categoria,
      descricao: form.descricao,
      data: form.data,
      valor: Number(form.valor), // ✅ NUMBER (não string)
      formaPagamento: form.formaPagamento,
      contaId,
      cartaoId,
      // ✅ REMOVIDO: Campos de parcelamento/recorrência
      // UpdateTransacaoDTO não possui esses campos
      // Backend mantém a estrutura original automaticamente
    },
  ];
}