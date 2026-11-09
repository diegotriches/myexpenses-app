import { CreateTransacaoDTO } from "@/types/transacao";
import { FormMovimentacao } from "./buildTransacoesFromForm";
import { normalizeDate } from "./utils";
import { adicionarMeses } from "@/utils/dateUtils";

interface Params {
  form: FormMovimentacao;
  contaId: string; // Pode ser vazio para cartão
}

export function buildCreateTransacoesFromForm({
  form,
  contaId,
}: Params): CreateTransacaoDTO[] {
  const valorTotal = Number(form.valor);
  const baseData = normalizeDate(form.data);
  const isCartao = form.formaPagamento === "cartao";

  if (!isCartao && !contaId) {
    throw new Error("contaId é obrigatório para transações com dinheiro ou PIX");
  }

  if (isCartao && !form.cartaoId) {
    throw new Error("cartaoId é obrigatório para transações com cartão");
  }

  const contaIdFinal = !isCartao ? contaId : "";

  // PARCELADO
  if (form.parcelado) {
    const valorParcela = valorTotal / form.parcelas;

    return Array.from({ length: form.parcelas }).map((_, i) => {
      const data = adicionarMeses(new Date(baseData), i);

      return {
        tipo: form.tipo,
        valor: valorParcela,
        data: data.toISOString().split('T')[0],
        descricao: form.descricao,
        categoria: form.categoria,
        formaPagamento: form.formaPagamento,
        contaId: contaIdFinal,
        cartaoId: isCartao && form.cartaoId ? Number(form.cartaoId) : undefined,
        parcelado: true,
        parcelas: form.parcelas,
        // Backend cria parcelamentoId/parcelaAtual automaticamente na API Route
      };
    });
  }

  // À VISTA
  return [
    {
      tipo: form.tipo,
      valor: valorTotal,
      data: new Date(baseData).toISOString().split('T')[0],
      descricao: form.descricao,
      categoria: form.categoria,
      formaPagamento: form.formaPagamento,
      contaId: contaIdFinal,
      cartaoId: isCartao && form.cartaoId ? Number(form.cartaoId) : undefined,
      parcelado: false,
      recorrente: false,
    },
  ];
}