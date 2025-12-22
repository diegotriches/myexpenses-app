import { Transacao, TransacaoUpdate } from "@/types/transacao";
import { FormMovimentacao } from "./buildTransacoesFromForm";

interface Params {
  form: FormMovimentacao;
  transacaoEdicao: Transacao;
}

export function buildUpdateTransacoesFromForm({
  form,
  transacaoEdicao,
}: Params): TransacaoUpdate[] {
  const cartaoId =
    form.formaPagamento === "cartao" && form.cartaoId
      ? Number(form.cartaoId)
      : null;

  return [
    {
      id: transacaoEdicao.id,

      tipo: form.tipo,
      categoria: form.categoria,
      descricao: form.descricao,
      data: form.data,
      valor: String(form.valor),

      formaPagamento: form.formaPagamento,
      contaId: transacaoEdicao.contaId,
      cartaoId,

      parcelado: transacaoEdicao.parcelado,
      parcelamentoId: transacaoEdicao.parcelamentoId,
      parcelas: transacaoEdicao.parcelas,
      parcelaAtual: transacaoEdicao.parcelaAtual,

      recorrente: transacaoEdicao.recorrente,
      recorrenciaId: transacaoEdicao.recorrenciaId,
      repeticoes: transacaoEdicao.repeticoes,
    },
  ];
}