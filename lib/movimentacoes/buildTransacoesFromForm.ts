import { Transacao } from "@/types/transacao";

type ModoEdicao = "unica" | "todas_parcelas" | "toda_recorrencia";

interface FormMovimentacao {
  contaId: string;
  tipo: "entrada" | "saida";
  categoria: string;
  valor: string;
  data: string;
  descricao: string;
  formaPagamento: "dinheiro" | "pix" | "cartao";
  cartaoId: string;
  parcelas: number;
  repeticoes: number;
  parcelado: boolean;
  recorrente: boolean;
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

  const isParcelado = form.parcelado;
  const isRecorrente = form.recorrente;

  if (transacaoEdicao) {
    const edicaoParcelada = !!transacaoEdicao.parcelamentoId;
    const edicaoRecorrente = !!transacaoEdicao.recorrenciaId;

    if (modoEdicao === "unica") {
      return [
        {
          ...transacaoEdicao,
          tipo: form.tipo,
          categoria: form.categoria,
          valor: valorTotal,
          descricao: form.descricao,
          formaPagamento: form.formaPagamento,
          cartaoId: form.formaPagamento === "cartao" ? Number(form.cartaoId) : null,
          parcelado: isParcelado,
          parcelas: isParcelado ? form.parcelas : undefined,
          recorrente: isRecorrente,
          repeticoes: isRecorrente ? form.repeticoes : undefined,
        },
      ];
    }

    if (edicaoParcelada && modoEdicao === "todas_parcelas") {
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
          cartaoId: form.formaPagamento === "cartao" ? Number(form.cartaoId) : null,
        };
      });
    }

    if (edicaoRecorrente && modoEdicao === "toda_recorrencia") {
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
          cartaoId: form.formaPagamento === "cartao" ? Number(form.cartaoId) : null,
        };
      });
    }

    // fallback edição
    return [
      {
        ...transacaoEdicao,
        tipo: form.tipo,
        categoria: form.categoria,
        valor: valorTotal,
        descricao: form.descricao,
        formaPagamento: form.formaPagamento,
        cartaoId: form.formaPagamento === "cartao" ? Number(form.cartaoId) : null,
        parcelado: isParcelado,
        parcelas: isParcelado ? form.parcelas : undefined,
        recorrente: isRecorrente,
        repeticoes: isRecorrente ? form.repeticoes : undefined,
      },
    ];
  }

  // CRIAÇÃO NOVA
  if (isParcelado) {
    const parcelamentoId = crypto.randomUUID();
    const numParcelas = form.parcelas;
    const valorParcela = valorTotal / numParcelas;
    const dataBase = new Date(form.data);

    return Array.from({ length: numParcelas }).map((_, i) => {
      const dataParcela = new Date(dataBase);
      dataParcela.setMonth(dataBase.getMonth() + i);

      return {
        id: crypto.randomUUID(),
        contaId,
        tipo: form.tipo,
        categoria: form.categoria,
        valor: valorParcela,
        data: dataParcela.toISOString().split("T")[0],
        descricao: form.descricao
          ? `${form.descricao} (${i + 1}/${numParcelas})`
          : `Parcela ${i + 1}/${numParcelas}`,
        formaPagamento: form.formaPagamento,
        cartaoId: form.formaPagamento === "cartao" ? Number(form.cartaoId) : null,
        parcelado: true,
        parcelamentoId,
        parcelas: numParcelas,
        parcelaAtual: i + 1,
        recorrente: false,
      };
    });
  }

  if (isRecorrente) {
    const recorrenciaId = crypto.randomUUID();
    const numRepeticoes = form.repeticoes;
    const dataBase = new Date(form.data);

    return Array.from({ length: numRepeticoes }).map((_, i) => {
      const dataMov = new Date(dataBase);
      dataMov.setMonth(dataBase.getMonth() + i);

      return {
        id: crypto.randomUUID(),
        contaId,
        tipo: form.tipo,
        categoria: form.categoria,
        valor: valorTotal,
        data: dataMov.toISOString().split("T")[0],
        descricao: form.descricao,
        formaPagamento: form.formaPagamento,
        cartaoId: form.formaPagamento === "cartao" ? Number(form.cartaoId) : null,
        recorrente: true,
        recorrenciaId,
        repeticoes: numRepeticoes,
        parcelado: false,
      };
    });
  }

  // À vista
  return [
    {
      id: crypto.randomUUID(),
      contaId,
      tipo: form.tipo,
      categoria: form.categoria,
      valor: valorTotal,
      data: form.data,
      descricao: form.descricao,
      formaPagamento: form.formaPagamento,
      cartaoId: form.formaPagamento === "cartao" ? Number(form.cartaoId) : null,
      parcelado: false,
      recorrente: false,
    },
  ];
}