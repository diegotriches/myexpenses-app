import { CreateTransacaoDTO } from "@/types/transacao";
import { FormMovimentacao } from "./buildTransacoesFromForm";
import { normalizeDate } from "./utils";

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
    const valorParcela = valorTotal / form.parcelas;

    return Array.from({ length: form.parcelas }).map((_, i) => {
      const data = new Date(baseData);
      data.setMonth(data.getMonth() + i);

      return {
        tipo: form.tipo,
        valor: valorParcela, // ✅ NUMBER (não string)
        data: data.toISOString().split('T')[0], // ✅ YYYY-MM-DD
        descricao: `${form.descricao} (${i + 1}/${form.parcelas})`,
        categoria: form.categoria,
        formaPagamento: form.formaPagamento,
        contaId: contaIdFinal,
        cartaoId: isCartao && form.cartaoId ? Number(form.cartaoId) : undefined,
        parcelado: true,
        parcelas: form.parcelas,
        // ✅ REMOVIDO: parcelamentoId, parcelaAtual (não existem em CreateTransacaoDTO)
        // Backend cria esses campos automaticamente na API Route
      };
    });
  }

  // RECORRENTE
  if (form.recorrente) {
    return Array.from({ length: form.repeticoes }).map((_, i) => {
      const data = new Date(baseData);
      data.setMonth(data.getMonth() + i);

      return {
        tipo: form.tipo,
        valor: valorTotal, // ✅ NUMBER (não string)
        data: data.toISOString().split('T')[0], // ✅ YYYY-MM-DD
        descricao: form.descricao,
        categoria: form.categoria,
        formaPagamento: form.formaPagamento,
        contaId: contaIdFinal,
        cartaoId: isCartao && form.cartaoId ? Number(form.cartaoId) : undefined,
        recorrente: true,
        repeticoes: form.repeticoes,
        // ✅ REMOVIDO: recorrenciaId (não existe em CreateTransacaoDTO)
        // Backend cria esse campo automaticamente na API Route
      };
    });
  }

  // À VISTA
  return [
    {
      tipo: form.tipo,
      valor: valorTotal, // ✅ NUMBER (não string)
      data: new Date(baseData).toISOString().split('T')[0], // ✅ YYYY-MM-DD
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