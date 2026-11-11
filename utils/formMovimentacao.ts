// Monta o payload da API a partir do formulário de movimentação
// (components/transacao/FormMovimentacaoModal.tsx). Regras puras, rodam no navegador:
// criação com parcelas, edição e criação de recorrência.
import type {
  Transacao,
  CreateTransacaoDTO,
  UpdateTransacaoDTO,
  ModoEdicao,
} from "@/types/transacao";
import type { CreateRecorrenciaDTO } from "@/types/recorrencia";
import { normalizeDate } from "@/lib/utils";
import { adicionarMeses } from "@/utils/dateUtils";
import { distribuirValor } from "@/utils/faturaUtils";

export interface FormMovimentacao {
  contaId: string;
  tipo: "entrada" | "saida";
  categoria: string;
  valor: string;
  data: string;
  descricao: string;

  formaPagamento: "dinheiro" | "pix" | "cartao";
  cartaoId?: string;

  parcelas: number;
  repeticoes: number;

  parcelado: boolean;
  recorrente: boolean;
}

// ── Criação (à vista ou parcelada) ──────────────────────────────────────────

interface ParamsCriacao {
  form: FormMovimentacao;
  contaId: string; // Pode ser vazio para cartão
}

export function buildCreateTransacoesFromForm({
  form,
  contaId,
}: ParamsCriacao): CreateTransacaoDTO[] {
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
    // Centavos distribuídos nas primeiras parcelas: 100 em 3 = 33,34 + 33,33 + 33,33
    // (dividir direto daria 33,333…, gravado como 33,33, e a compra perderia 1 centavo)
    const valoresParcelas = distribuirValor(Math.round(valorTotal * 100), form.parcelas).map(Number);

    return Array.from({ length: form.parcelas }).map((_, i) => {
      const data = adicionarMeses(new Date(baseData), i);

      return {
        tipo: form.tipo,
        valor: valoresParcelas[i],
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

// ── Edição ──────────────────────────────────────────────────────────────────

interface ParamsEdicao {
  form: FormMovimentacao;
  transacaoEdicao: Transacao;
  modoEdicao: ModoEdicao;
}

export function buildUpdateTransacoesFromForm({
  form,
  transacaoEdicao,
  modoEdicao,
}: ParamsEdicao): UpdateTransacaoDTO[] {
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

// ── Recorrência (template) ──────────────────────────────────────────────────

interface ParamsRecorrencia {
  form: FormMovimentacao;
  contaId: string; // Pode ser vazio para cartão
  // undefined = indefinida (repete até o usuário cancelar)
  repeticoesTotal: number | undefined;
  estabelecimentoId?: string;
  // ✅ NOVO: presente quando uma transação "à vista" existente está sendo
  // convertida em recorrência (edição, não criação do zero)
  origemTransacaoId?: string;
}

export function buildCreateRecorrenciaFromForm({
  form,
  contaId,
  repeticoesTotal,
  estabelecimentoId,
  origemTransacaoId,
}: ParamsRecorrencia): CreateRecorrenciaDTO {
  const isCartao = form.formaPagamento === "cartao";

  if (!isCartao && !contaId) {
    throw new Error("contaId é obrigatório para recorrências com dinheiro ou PIX");
  }
  if (isCartao && !form.cartaoId) {
    throw new Error("cartaoId é obrigatório para recorrências com cartão");
  }

  const baseData = normalizeDate(form.data);

  return {
    tipo: form.tipo,
    valor: Number(form.valor),
    data: new Date(baseData).toISOString().split("T")[0],
    descricao: form.descricao || undefined,
    categoria: form.categoria || undefined,
    formaPagamento: form.formaPagamento,
    contaId: !isCartao ? contaId : undefined,
    cartaoId: isCartao && form.cartaoId ? Number(form.cartaoId) : undefined,
    estabelecimentoId: estabelecimentoId || undefined,
    repeticoesTotal,
    origemTransacaoId,
  };
}

// ── Entrada única do formulário: criação ou edição ──────────────────────────

interface BuildTransacoesParams {
  form: FormMovimentacao;
  contaId?: string;
  transacaoEdicao: Transacao | null;
  modoEdicao?: ModoEdicao;
}

// Sem transação em edição, o resultado é sempre de criação
export function buildTransacoesFromForm(params: BuildTransacoesParams & { transacaoEdicao: null }): CreateTransacaoDTO[];
export function buildTransacoesFromForm(params: BuildTransacoesParams): (CreateTransacaoDTO | UpdateTransacaoDTO)[];
export function buildTransacoesFromForm({
  form,
  contaId,
  transacaoEdicao,
  modoEdicao = "unica",
}: BuildTransacoesParams): (CreateTransacaoDTO | UpdateTransacaoDTO)[] {

  // Edição
  if (transacaoEdicao) {
    return buildUpdateTransacoesFromForm({
      form,
      transacaoEdicao,
      modoEdicao,
    });
  }

  // Criação: valida conforme a forma de pagamento
  const isCartao = form.formaPagamento === "cartao";
  
  if (isCartao) {
    // Para cartão: cartaoId é obrigatório (contaId pode ser vazio)
    if (!form.cartaoId) {
      throw new Error('Selecione um cartão de crédito');
    }
    
    // Passa string vazia como contaId (será tratado no buildCreate)
    return buildCreateTransacoesFromForm({
      form,
      contaId: '', 
    });
  } else {
    // Para PIX/Dinheiro: contaId é obrigatório
    if (!contaId) {
      throw new Error('Selecione uma conta');
    }
    
    return buildCreateTransacoesFromForm({
      form,
      contaId,
    });
  }
}
