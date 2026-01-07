import { TransacaoCreate } from "@/types/transacao";
import { FormMovimentacao } from "./buildTransacoesFromForm";
import { normalizeDate } from "./utils";

interface Params {
  form: FormMovimentacao;
  contaId: string; // Pode ser vazio para cartão
}

export function buildCreateTransacoesFromForm({
  form,
  contaId,
}: Params): TransacaoCreate[] {
  const valorTotal = Number(form.valor);
  const baseData = normalizeDate(form.data);
  const isCartao = form.formaPagamento === "cartao";

  // ✅ Validação: PIX/Dinheiro PRECISA de contaId
  if (!isCartao && !contaId) {
    throw new Error("contaId é obrigatório para transações com dinheiro ou PIX");
  }

  // ✅ Validação: Cartão PRECISA de cartaoId
  if (isCartao && !form.cartaoId) {
    throw new Error("cartaoId é obrigatório para transações com cartão");
  }

  // ✅ Define contaId: usa o passado OU deixa vazio para cartão
  const contaIdFinal = !isCartao ? contaId : "";

  // PARCELADO
  if (form.parcelado) {
    const parcelamentoId = crypto.randomUUID();
    const valorParcela = valorTotal / form.parcelas;

    return Array.from({ length: form.parcelas }).map((_, i) => {
      const data = new Date(baseData);
      data.setMonth(data.getMonth() + i);

      return {
        contaId: contaIdFinal,
        tipo: form.tipo,
        categoria: form.categoria,
        valor: String(valorParcela),
        data: data.toISOString(),
        descricao: `${form.descricao} (${i + 1}/${form.parcelas})`,
        formaPagamento: form.formaPagamento,
        cartaoId: isCartao && form.cartaoId ? Number(form.cartaoId) : null,
        parcelado: true,
        parcelamentoId,
        parcelas: form.parcelas,
        parcelaAtual: i + 1,
        recorrente: false,
      };
    });
  }

  // RECORRENTE
  if (form.recorrente) {
    const recorrenciaId = crypto.randomUUID();

    return Array.from({ length: form.repeticoes }).map((_, i) => {
      const data = new Date(baseData);
      data.setMonth(data.getMonth() + i);

      return {
        contaId: contaIdFinal,
        tipo: form.tipo,
        categoria: form.categoria,
        valor: String(valorTotal),
        data: data.toISOString(),
        descricao: form.descricao,
        formaPagamento: form.formaPagamento,
        cartaoId: isCartao && form.cartaoId ? Number(form.cartaoId) : null,
        recorrente: true,
        recorrenciaId,
        repeticoes: form.repeticoes,
        parcelado: false,
      };
    });
  }

  // À VISTA
  return [
    {
      contaId: contaIdFinal,
      tipo: form.tipo,
      categoria: form.categoria,
      valor: String(valorTotal),
      data: new Date(baseData).toISOString(),
      descricao: form.descricao,
      formaPagamento: form.formaPagamento,
      cartaoId: isCartao && form.cartaoId ? Number(form.cartaoId) : null,
      parcelado: false,
      recorrente: false,
    },
  ];
}