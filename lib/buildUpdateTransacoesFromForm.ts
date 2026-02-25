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

  // ✅ Modo todas_parcelas: envia parcelas e parcelamentoId para redimensionamento
  const camposParcelamento = modoEdicao === "todas_parcelas"
    ? {
        parcelado:      true,
        parcelas:       Number(form.parcelas),
        parcelamentoId: transacaoEdicao.parcelamentoId ?? null,
      }
    : {};

  // ✅ Modo toda_recorrencia: envia repeticoes e recorrenciaId para redimensionamento
  const camposRecorrencia = modoEdicao === "toda_recorrencia"
    ? {
        recorrente:    true,
        repeticoes:    Number(form.repeticoes),
        recorrenciaId: transacaoEdicao.recorrenciaId ?? null,
      }
    : {};

  // ✅ Modo unica para recorrente: sinaliza que deve virar à vista
  // A rota detecta eraRecorrente && !isRecorrente e cria nova transação
  const camposUnicaRecorrente = modoEdicao === "unica" && transacaoEdicao.recorrente
    ? {
        recorrente:    false,
        recorrenciaId: null,
        repeticoes:    null,
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
      ...camposRecorrencia,
      ...camposUnicaRecorrente,
    },
  ];
}