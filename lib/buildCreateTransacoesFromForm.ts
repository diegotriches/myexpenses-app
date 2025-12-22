import { TransacaoCreate } from "@/types/transacao";
import { FormMovimentacao } from "./buildTransacoesFromForm";
import { normalizeDate } from "./utils";

interface Params {
  form: FormMovimentacao;
  contaId: string;
}

export function buildCreateTransacoesFromForm({
  form,
  contaId,
}: Params): TransacaoCreate[] {
  const valorTotal = Number(form.valor);
  const baseData = normalizeDate(form.data);

  // PARCELADO
  if (form.parcelado) {
    const parcelamentoId = crypto.randomUUID();
    const valorParcela = valorTotal / form.parcelas;

    return Array.from({ length: form.parcelas }).map((_, i) => {
      const data = new Date(baseData);
      data.setMonth(data.getMonth() + i);

      return {
        contaId,
        tipo: form.tipo,
        categoria: form.categoria,
        valor: String(valorParcela),
        data: data.toISOString(),
        descricao: `${form.descricao} (${i + 1}/${form.parcelas})`,
        formaPagamento: form.formaPagamento,
        cartaoId:
          form.formaPagamento === "cartao" && form.cartaoId
            ? Number(form.cartaoId)
            : null,
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
        contaId,
        tipo: form.tipo,
        categoria: form.categoria,
        valor: String(valorTotal),
        data: data.toISOString(),
        descricao: form.descricao,
        formaPagamento: form.formaPagamento,
        cartaoId:
          form.formaPagamento === "cartao" && form.cartaoId
            ? Number(form.cartaoId)
            : null,
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
      contaId,
      tipo: form.tipo,
      categoria: form.categoria,
      valor: String(valorTotal),
      data: new Date(baseData).toISOString(),
      descricao: form.descricao,
      formaPagamento: form.formaPagamento,
      cartaoId:
        form.formaPagamento === "cartao" && form.cartaoId
          ? Number(form.cartaoId)
          : null,
      parcelado: false,
      recorrente: false,
    },
  ];
}
