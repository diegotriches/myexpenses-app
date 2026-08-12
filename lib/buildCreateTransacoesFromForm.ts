import { CreateTransacaoDTO } from "@/types/transacao";
import { FormMovimentacao } from "./buildTransacoesFromForm";
import { normalizeDate } from "./utils";

interface Params {
  form: FormMovimentacao;
  contaId: string; // Pode ser vazio para cartão
}

// ✅ CORRIGIDO: o caminho de "recorrente" foi removido daqui. Antes, uma
// recorrência de N meses gerava N linhas de transação de uma vez, e o
// impacto financeiro de TODAS elas (inclusive as de meses futuros) era
// aplicado imediatamente na criação — descontando o valor total de uma
// vez em vez de mês a mês. Recorrências agora são criadas via
// buildCreateRecorrenciaFromForm + POST /api/recorrencias, que só gera
// a transação real (e só aplica o impacto financeiro) no mês em que ela
// de fato ocorre, via cron.
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
        // Backend cria parcelamentoId/parcelaAtual automaticamente na API Route
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