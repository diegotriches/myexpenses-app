import { v4 as uuidv4 } from "uuid";
import { Transacao } from "@/types/transacao";

type ModoEdicao = "unica" | "todas_parcelas" | "toda_recorrencia";

interface FormMovimentacao {
  tipo: "entrada" | "saida";
  categoria: string;
  valor: string;
  data: string;
  descricao: string;
  formaPagamento: "dinheiro" | "pix" | "cartao";
  cartaoId: string;
  tipoPagamento: "avista" | "parcelado" | "recorrente";
  parcelas: number;
  repeticoes: number;
}

interface BuildTransacoesParams {
  form: FormMovimentacao;
  transacaoEdicao: Transacao | null;
  todasParcelas?: Transacao[];
  todasRecorrencias?: Transacao[];
  modoEdicao?: ModoEdicao;
}

export function buildTransacoesFromForm({
  form,
  transacaoEdicao,
  todasParcelas = [],
  todasRecorrencias = [],
  modoEdicao = "unica",
}: BuildTransacoesParams): Transacao[] {

  /* EDIÇÃO */
  if (transacaoEdicao) {
    // Edição simples
    if (modoEdicao === "unica") {
      return [
        {
          ...transacaoEdicao,
          tipo: form.tipo,
          categoria: form.categoria,
          valor: Number(form.valor),
          descricao: form.descricao,
          formaPagamento: form.formaPagamento,
          cartaoId: form.formaPagamento === "cartao" ? Number(form.cartaoId) : null,
        },
      ];
    }

    // Edição de todas as parcelas
    if (modoEdicao === "todas_parcelas" && todasParcelas.length > 0) {
      return todasParcelas.map((t, i) => ({
        ...t,
        tipo: form.tipo,
        categoria: form.categoria,
        valor: Number(form.valor),
        descricao: form.descricao
          ? `${form.descricao} (${i + 1}/${t.parcelas})`
          : t.descricao,
        formaPagamento: form.formaPagamento,
        cartaoId: form.formaPagamento === "cartao" ? Number(form.cartaoId) : null,
      }));
    }

    // Edição de toda a recorrência
    if (modoEdicao === "toda_recorrencia" && todasRecorrencias.length > 0) {
      return todasRecorrencias.map((t) => ({
        ...t,
        tipo: form.tipo,
        categoria: form.categoria,
        valor: Number(form.valor),
        descricao: form.descricao,
        formaPagamento: form.formaPagamento,
        cartaoId: form.formaPagamento === "cartao" ? Number(form.cartaoId) : null,
      }));
    }

    return [
      {
        ...transacaoEdicao,
        tipo: form.tipo,
        categoria: form.categoria,
        valor: Number(form.valor),
        descricao: form.descricao,
        formaPagamento: form.formaPagamento,
        cartaoId: form.formaPagamento === "cartao" ? Number(form.cartaoId) : null,
      },
    ];
  }

  /* CRIAÇÃO */
  // À vista
  if (form.tipoPagamento === "avista") {
    return [
      {
        id: 0,
        tipo: form.tipo,
        categoria: form.categoria,
        valor: Number(form.valor),
        data: form.data,
        descricao: form.descricao,
        formaPagamento: form.formaPagamento,
        cartaoId: form.formaPagamento === "cartao" ? Number(form.cartaoId) : null,
        parcelado: false,
        recorrente: false,
      },
    ];
  }

  // Parcelado
  if (form.tipoPagamento === "parcelado") {
    const parcelamentoId = uuidv4();
    const dataBase = new Date(form.data);

    return Array.from({ length: form.parcelas }).map((_, i) => {
      const dataParcela = new Date(dataBase);
      dataParcela.setMonth(dataBase.getMonth() + i);

      return {
        id: 0,
        tipo: form.tipo,
        categoria: form.categoria,
        valor: Number(form.valor),
        data: dataParcela.toISOString().split("T")[0],
        descricao: form.descricao
          ? `${form.descricao} (${i + 1}/${form.parcelas})`
          : `Parcela ${i + 1}/${form.parcelas}`,
        formaPagamento: form.formaPagamento,
        cartaoId: form.formaPagamento === "cartao" ? Number(form.cartaoId) : null,
        parcelado: true,
        parcelamentoId,
        parcelas: form.parcelas,
        parcelaAtual: i + 1,
      };
    });
  }

  // Recorrente
  const recorrenciaId = uuidv4();
  const dataBase = new Date(form.data);

  return Array.from({ length: form.repeticoes }).map((_, i) => {
    const dataMov = new Date(dataBase);
    dataMov.setMonth(dataBase.getMonth() + i);

    return {
      id: 0,
      tipo: form.tipo,
      categoria: form.categoria,
      valor: Number(form.valor),
      data: dataMov.toISOString().split("T")[0],
      descricao: form.descricao,
      formaPagamento: form.formaPagamento,
      cartaoId: form.formaPagamento === "cartao" ? Number(form.cartaoId) : null,
      recorrente: true,
      recorrenciaId,
      repeticoes: form.repeticoes,
      parcelado: false,
    };
  });
}