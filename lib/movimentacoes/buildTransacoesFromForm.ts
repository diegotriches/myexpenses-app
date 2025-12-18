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
  contaId: string;
  transacaoEdicao: Transacao | null;
  modoEdicao?: ModoEdicao;
}

export function buildTransacoesFromForm({
  form,
  contaId,
  transacaoEdicao,
  modoEdicao = "unica",
}: BuildTransacoesParams): Transacao[] {
  const valorTotal = Number(form.valor);

  /* EDIÇÃO */
  if (transacaoEdicao) {
    const isParcelada = !!transacaoEdicao.parcelamentoId;
    const isRecorrente = !!transacaoEdicao.recorrenciaId;

    // edição simples (uma única transação)
    if (modoEdicao === "unica") {
      return [
        {
          ...transacaoEdicao,
          tipo: form.tipo,
          categoria: form.categoria,
          valor: valorTotal,
          descricao: form.descricao,
          formaPagamento: form.formaPagamento,
          cartaoId:
            form.formaPagamento === "cartao" ? Number(form.cartaoId) : null,
        },
      ];
    }

    // edição inteligente de parceladas
    if (isParcelada && modoEdicao === "todas_parcelas") {
      const numParcelas = transacaoEdicao.parcelas ?? 1;
      const valorParcela = valorTotal / numParcelas;
      const dataBase = new Date(transacaoEdicao.data);

      return Array.from({ length: numParcelas }).map((_, i) => {
        const dataParcela = new Date(dataBase);
        dataParcela.setMonth(dataBase.getMonth() + i);

        return {
          ...transacaoEdicao,
          valor: valorParcela,
          data: dataParcela.toISOString().split("T")[0],
          descricao: form.descricao
            ? `${form.descricao} (${i + 1}/${numParcelas})`
            : `Parcela ${i + 1}/${numParcelas}`,
          tipo: form.tipo,
          categoria: form.categoria,
          formaPagamento: form.formaPagamento,
          cartaoId:
            form.formaPagamento === "cartao" ? Number(form.cartaoId) : null,
        };
      });
    }

    // edição inteligente de recorrentes
    if (isRecorrente && modoEdicao === "toda_recorrencia") {
      const numRepeticoes = transacaoEdicao.repeticoes ?? 1;
      const dataBase = new Date(transacaoEdicao.data);

      return Array.from({ length: numRepeticoes }).map((_, i) => {
        const dataMov = new Date(dataBase);
        dataMov.setMonth(dataBase.getMonth() + i);

        return {
          ...transacaoEdicao,
          valor: valorTotal,
          data: dataMov.toISOString().split("T")[0],
          descricao: form.descricao,
          tipo: form.tipo,
          categoria: form.categoria,
          formaPagamento: form.formaPagamento,
          cartaoId:
            form.formaPagamento === "cartao" ? Number(form.cartaoId) : null,
        };
      });
    }

    // fallback
    return [
      {
        ...transacaoEdicao,
        tipo: form.tipo,
        categoria: form.categoria,
        valor: valorTotal,
        descricao: form.descricao,
        formaPagamento: form.formaPagamento,
        cartaoId:
          form.formaPagamento === "cartao" ? Number(form.cartaoId) : null,
      },
    ];
  }

  /* CRIAÇÃO */
  // À vista
  if (form.tipoPagamento === "avista") {
    return [
      {
        id: 0,
        contaId,
        tipo: form.tipo,
        categoria: form.categoria,
        valor: valorTotal,
        data: form.data,
        descricao: form.descricao,
        formaPagamento: form.formaPagamento,
        cartaoId:
          form.formaPagamento === "cartao" ? Number(form.cartaoId) : null,
        parcelado: false,
        recorrente: false,
      },
    ];

  }

  // Parcelado
  if (form.tipoPagamento === "parcelado") {
    const parcelamentoId = uuidv4();
    const numParcelas = form.parcelas;
    const valorParcela = valorTotal / numParcelas;
    const dataBase = new Date(form.data);

    return Array.from({ length: numParcelas }).map((_, i) => {
      const dataParcela = new Date(dataBase);
      dataParcela.setMonth(dataBase.getMonth() + i);

      return {
        id: 0,
        contaId,
        tipo: form.tipo,
        categoria: form.categoria,
        valor: valorParcela,
        data: dataParcela.toISOString().split("T")[0],
        descricao: form.descricao
          ? `${form.descricao} (${i + 1}/${numParcelas})`
          : `Parcela ${i + 1}/${numParcelas}`,
        formaPagamento: form.formaPagamento,
        cartaoId:
          form.formaPagamento === "cartao" ? Number(form.cartaoId) : null,
        parcelado: true,
        parcelamentoId,
        parcelas: numParcelas,
        parcelaAtual: i + 1,
      };
    });
  }

  // Recorrente
  const recorrenciaId = uuidv4();
  const numRepeticoes = form.repeticoes;
  const dataBase = new Date(form.data);

  return Array.from({ length: numRepeticoes }).map((_, i) => {
    const dataMov = new Date(dataBase);
    dataMov.setMonth(dataBase.getMonth() + i);

    return {
      id: 0,
      contaId,
      tipo: form.tipo,
      categoria: form.categoria,
      valor: valorTotal,
      data: dataMov.toISOString().split("T")[0],
      descricao: form.descricao,
      formaPagamento: form.formaPagamento,
      cartaoId:
        form.formaPagamento === "cartao" ? Number(form.cartaoId) : null,
      recorrente: true,
      recorrenciaId,
      repeticoes: numRepeticoes,
      parcelado: false,
    };
  });
}