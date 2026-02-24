import { Transacao, UpdateTransacaoDTO, ModoEdicao } from "@/types/transacao";
import { FormMovimentacao } from "./buildTransacoesFromForm";

interface Params {
  form: FormMovimentacao;
  transacaoEdicao: Transacao;
  modoEdicao: ModoEdicao;
}

export function buildUpdateTransacoesFromForm({
  form,
  transacaoEdicao,
  modoEdicao,
}: Params): UpdateTransacaoDTO[] {
  const isCartao = form.formaPagamento === "cartao";
  const cartaoId = isCartao && form.cartaoId ? Number(form.cartaoId) : null;
  const contaId  = !isCartao && form.contaId ? form.contaId : (transacaoEdicao.contaId || "");

  // ✅ No modo todas_parcelas, envia parcelas e parcelamentoId
  // para permitir redimensionamento do parcelamento
  const camposParcelamento = modoEdicao === "todas_parcelas"
    ? {
        parcelado:      true,
        parcelas:       Number(form.parcelas),
        parcelamentoId: transacaoEdicao.parcelamentoId ?? null,
      }
    : {};

  return [
    {
      modoEdicao,
      tipo:           form.tipo,
      categoria:      form.categoria,
      descricao:      form.descricao,
      data:           form.data,
      valor:          Number(form.valor),
      formaPagamento: form.formaPagamento,
      contaId,
      cartaoId,
      ...camposParcelamento,
    },
  ];
}