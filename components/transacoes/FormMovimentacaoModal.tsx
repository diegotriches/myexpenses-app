"use client";

import { useState, useMemo } from "react";

import MovCamposBasicos from "@/components/transacoes/MovCamposBasicos";
import MovCampoCategoria from "@/components/transacoes/MovCampoCategoria";
import MovCampoFormaPagamento from "@/components/transacoes/MovCampoFormaPagamento";
import MovCampoConta from "@/components/transacoes/MovCampoConta";
import MovCampoCartao from "./MovCampoCartao";
import MovCampoEstabelecimento from "./MovCampoEstabelecimento";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

import {
  Transacao,
  UpdateTransacaoDTO,
} from "@/types/transacao";
import type { CreateRecorrenciaDTO } from "@/types/recorrencia";

import { formatarDataParaInput } from "@/utils/dateUtils";
import { useTransacoesTodas } from "@/hooks/useTransacoes";
import { hojeBrt } from "@/utils/aplicacaoSimulacao";
import { buildTransacoesFromForm, buildCreateRecorrenciaFromForm } from "@/utils/formMovimentacao";

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

import { FaMoneyBill, FaSpinner, FaSyncAlt } from "react-icons/fa";
import { AlertCircle, Minus, Plus } from "lucide-react";
import type { IconType } from "react-icons";
import type { DadosSalvarTransacao } from "@/types/transacao";

type TipoPagamento = "avista" | "parcelado" | "recorrente";

type FormErrors = Partial<Record<
  "categoria" | "valor" | "data" | "conta" | "cartao" | "parcelas" | "repeticoes",
  string
>>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transacaoEdicao: Transacao | null;
  modoEdicao?: "unica" | "todas_parcelas" | "toda_recorrencia";
  salvar: (dados: DadosSalvarTransacao) => Promise<void>;
  // ✅ NOVO: caminho separado para criar recorrências (POST /api/recorrencias
  // em vez de POST /api/transacoes). Opcional — se não for passado e o
  // usuário tentar criar uma recorrência, o submit lança um erro claro
  // em vez de cair silenciosamente no fluxo antigo.
  salvarRecorrencia?: (dados: CreateRecorrenciaDTO) => Promise<void>;
  loading?: boolean;
}

const initialForm = {
  contaId:           "",
  tipo:              "saida" as "entrada" | "saida",
  categoria:         "",
  valor:             "",
  data:              "",
  descricao:         "",
  formaPagamento:    "dinheiro" as "dinheiro" | "pix" | "cartao",
  cartaoId:          "",
  parcelado:         false,
  parcelas:          1,
  recorrente:        false,
  repeticoes:        1,
  // ✅ NOVO: quando true, a recorrência não tem número fixo de repetições —
  // gera todo mês até o usuário pausar/cancelar
  repeticoesIndefinidas: false,
  estabelecimentoId: "",
};

type FormState = typeof initialForm;

// Função para a data ser a do momento em que o formulário abre
const novoForm = (): FormState => ({ ...initialForm, data: hojeBrt() });

const tipoPagamentoIcons: Record<TipoPagamento, IconType> = {
  avista:     FaMoneyBill,
  parcelado:  FaSpinner,
  recorrente: FaSyncAlt,
};

const tipoPagamentoLabels: Record<TipoPagamento, string> = {
  avista:     "À vista",
  parcelado:  "Parcelado",
  recorrente: "Recorrente",
};

export default function FormMovimentacaoModal({
  open,
  onOpenChange,
  transacaoEdicao,
  modoEdicao,
  salvar,
  salvarRecorrencia,
  loading = false,
}: Props) {
  const isEdit = Boolean(transacaoEdicao);
  const [form,   setForm]   = useState<FormState>(novoForm);
  const { data: todasTransacoes = [] } = useTransacoesTodas();

  // As parcelas podem ter valores diferentes: o total é a soma, não valor × quantidade
  const totalParcelamento = useMemo(() => {
    if (modoEdicao !== "todas_parcelas" || !transacaoEdicao?.parcelamentoId) return null;
    const grupo = todasTransacoes.filter((t) => t.parcelamentoId === transacaoEdicao.parcelamentoId);
    if (!grupo.length) return null;
    return Number(grupo.reduce((soma, t) => soma + Number(t.valor), 0).toFixed(2));
  }, [modoEdicao, transacaoEdicao, todasTransacoes]);

  // Parcelas em fatura paga mantêm o valor e impedem trocar o cartão
  const parcelasEmFaturaPaga = useMemo(() => {
    if (modoEdicao !== "todas_parcelas" || !transacaoEdicao?.parcelamentoId) return 0;
    return todasTransacoes.filter((t) => t.parcelamentoId === transacaoEdicao.parcelamentoId && t.emFaturaPaga).length;
  }, [modoEdicao, transacaoEdicao, todasTransacoes]);

  const [errors, setErrors] = useState<FormErrors>({});

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => {
      const updated = { ...prev, [key]: value };
      if (key === "tipo" && value === "entrada" && prev.formaPagamento === "cartao") {
        updated.formaPagamento = "dinheiro";
      }
      return updated;
    });

    const campoErro = key === "contaId" ? "conta" : key === "cartaoId" ? "cartao" : key as keyof FormErrors;
    if (["categoria","valor","data","conta","cartao","parcelas","repeticoes"].includes(campoErro as string)) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[campoErro as keyof FormErrors];
        return next;
      });
    }
  };

  const tipoPagamento = useMemo<TipoPagamento>(() => {
    if (form.parcelado)  return "parcelado";
    if (form.recorrente) return "recorrente";
    return "avista";
  }, [form.parcelado, form.recorrente]);

  const opcoesFormaPagamento = useMemo(() => {
    if (form.tipo === "entrada") return ["dinheiro", "pix"] as const;
    return ["dinheiro", "pix", "cartao"] as const;
  }, [form.tipo]);

  const mostrarCampoConta = useMemo(() => {
    if (form.tipo === "entrada") return true;
    if (form.tipo === "saida" && (form.formaPagamento === "dinheiro" || form.formaPagamento === "pix")) return true;
    return false;
  }, [form.tipo, form.formaPagamento]);

  const mostrarCampoCartao = useMemo(
    () => form.tipo === "saida" && form.formaPagamento === "cartao",
    [form.tipo, form.formaPagamento]
  );

  // ✅ NOVO: "Parcelado" só faz sentido no cartão — em dinheiro/PIX, uma
  // compra recorrente é o modelo certo (parcelado nesses casos tinha o
  // mesmo bug de debitar tudo de uma vez que já corrigimos nas recorrências,
  // mas em vez de corrigir a mecânica, a opção deixa de existir aqui)
  const opcoesTipoPagamento = useMemo<TipoPagamento[]>(() => {
    const todas: TipoPagamento[] = ["avista", "parcelado", "recorrente"];
    if (form.formaPagamento !== "cartao") {
      return todas.filter((t) => t !== "parcelado");
    }
    return todas;
  }, [form.formaPagamento]);

  // Se o usuário tinha escolhido "Parcelado" e muda a forma de pagamento
  // pra algo diferente de cartão, reverte automaticamente pra "à vista"
  if (form.parcelado && form.formaPagamento !== "cartao") {
    setForm((prev) => ({ ...prev, parcelado: false }));
  }

  const bloqueiaCampos = useMemo(() => {
    if (!transacaoEdicao || !modoEdicao) return {};
    const editarTodos      = modoEdicao === "todas_parcelas" || modoEdicao === "toda_recorrencia";
    const unicaOcorrencia  = modoEdicao === "unica" && !!transacaoEdicao.recorrente;
    return {
      tipo:          isEdit || editarTodos,
      data:          editarTodos,
      formaPagamento: editarTodos,
      tipoPagamento: unicaOcorrencia,
      parcelas:      false,
      repeticoes:    false,
    };
  }, [isEdit, transacaoEdicao, modoEdicao]);

  // ✅ NOVO: identifica a conversão "à vista → recorrente" durante a edição
  // — esse caso não usa mais PUT /api/transacoes/[id] (que gerava N linhas
  // de uma vez, o mesmo bug que já corrigimos na criação). Em vez disso,
  // reaproveita o caminho de criação de recorrência, passando a transação
  // original como origemTransacaoId pra ser revertida/substituída.
  const convertendoParaRecorrente = useMemo(() => {
    if (!isEdit || !transacaoEdicao) return false;
    return form.recorrente && !transacaoEdicao.recorrente && !transacaoEdicao.parcelado;
  }, [isEdit, transacaoEdicao, form.recorrente]);

  const valorTotal = useMemo(() => {
    const valor = parseFloat(form.valor) || 0;
    if (form.parcelado  && form.parcelas   > 1) return valor;
    // ✅ NOVO: sem total quando indefinida — não há como somar um número
    // desconhecido de repetições
    if (form.recorrente && !form.repeticoesIndefinidas && form.repeticoes > 1) return valor * form.repeticoes;
    return valor;
  }, [form.valor, form.parcelado, form.parcelas, form.recorrente, form.repeticoes, form.repeticoesIndefinidas]);

  const valorOriginalEdicao = useMemo(() => {
    if (!isEdit || !transacaoEdicao) return undefined;
    if (modoEdicao === "todas_parcelas" && transacaoEdicao.parcelado && transacaoEdicao.parcelas) {
      return Number(transacaoEdicao.valor) * transacaoEdicao.parcelas;
    }
    return Number(transacaoEdicao.valor);
  }, [isEdit, transacaoEdicao, modoEdicao]);

  // Preenche o formulário ao abrir ou trocar a transação em edição (durante o render, sem efeito)
  const chaveFormulario = { transacaoEdicao, open, modoEdicao, totalParcelamento };
  const [chaveAnterior, setChaveAnterior] = useState<typeof chaveFormulario | null>(null);
  const formularioMudou = !chaveAnterior
    || chaveAnterior.transacaoEdicao !== transacaoEdicao
    || chaveAnterior.open !== open
    || chaveAnterior.modoEdicao !== modoEdicao
    || chaveAnterior.totalParcelamento !== totalParcelamento;

  if (formularioMudou && !transacaoEdicao) {
    setChaveAnterior(chaveFormulario);
    setForm(novoForm());
    setErrors({});
  } else if (formularioMudou && transacaoEdicao) {
    setChaveAnterior(chaveFormulario);

    const valorFormulario =
      totalParcelamento ?? (
        modoEdicao === "todas_parcelas" && transacaoEdicao.parcelado && transacaoEdicao.parcelas
          ? Number(transacaoEdicao.valor) * transacaoEdicao.parcelas
          : Number(transacaoEdicao.valor ?? "")
      );

    const dataFormatada = formatarDataParaInput(transacaoEdicao.data);

    setForm({
      contaId:    transacaoEdicao.contaId ?? "",
      tipo:       transacaoEdicao.tipo === "saida" ? "saida" : "entrada", // estorno não é editável
      categoria:  transacaoEdicao.categoria   ?? "",
      valor:      String(valorFormulario),
      data:       dataFormatada,
      descricao:  transacaoEdicao.descricao   ?? "",
      formaPagamento: ["dinheiro", "pix", "cartao"].includes(transacaoEdicao.formaPagamento ?? "")
        ? (transacaoEdicao.formaPagamento as "dinheiro" | "pix" | "cartao")
        : "dinheiro",
      cartaoId:   transacaoEdicao.cartaoId ? String(transacaoEdicao.cartaoId) : "",
      // ✅ Edição sempre trata como transação única — recorrências novas
      // não são mais editáveis "em bloco" por aqui (o template vive em
      // /api/recorrencias). Isso é resolvido naturalmente: transações
      // geradas pelo novo modelo não têm recorrenciaId (campo legado),
      // então a tela de edição sempre abre no modo "única" para elas.
      parcelado:  modoEdicao === "unica" && transacaoEdicao.recorrente ? false : (transacaoEdicao.parcelado  ?? false),
      parcelas:   transacaoEdicao.parcelas   ?? 1,
      recorrente: modoEdicao === "unica" && transacaoEdicao.recorrente ? false : (transacaoEdicao.recorrente ?? false),
      repeticoes: transacaoEdicao.repeticoes ?? 1,
      repeticoesIndefinidas: false,
      estabelecimentoId: transacaoEdicao.estabelecimentoId ?? "",
    });
    setErrors({});
  }

  const validateForm = (): FormErrors => {
    const erros: FormErrors = {};
    if (!form.categoria)                          erros.categoria  = "Selecione uma categoria";
    if (!form.valor || parseFloat(form.valor) <= 0) erros.valor    = "Informe um valor válido";
    if (!form.data)                               erros.data       = "Selecione uma data";
    if (mostrarCampoConta  && !form.contaId)      erros.conta      = "Selecione uma conta";
    if (mostrarCampoCartao && !form.cartaoId)     erros.cartao     = "Selecione um cartão";
    if (form.parcelado  && form.parcelas   < 2)   erros.parcelas   = "Mínimo de 2 parcelas";
    // ✅ NOVO: só exige mínimo de repetições se não for indefinida
    if (form.recorrente && !form.repeticoesIndefinidas && form.repeticoes < 2) {
      erros.repeticoes = "Mínimo de 2 repetições";
    }
    return erros;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const erros = validateForm();
    if (Object.keys(erros).length > 0) { setErrors(erros); return; }
    setErrors({});

    try {
      if (isEdit && transacaoEdicao && convertendoParaRecorrente) {
        // ✅ NOVO: conversão à vista → recorrente durante edição. Não usa
        // mais PUT /api/transacoes/[id] — reaproveita o caminho de criação
        // de recorrência, passando a transação original como
        // origemTransacaoId pra a rota reverter/substituir corretamente.
        if (!salvarRecorrencia) {
          throw new Error("Conversão para recorrência não está disponível nesta tela.");
        }

        const payloadRecorrencia: CreateRecorrenciaDTO = {
          ...buildCreateRecorrenciaFromForm({
            form: {
              contaId:        form.contaId,
              tipo:           form.tipo,
              categoria:      form.categoria,
              valor:          form.valor,
              data:           form.data,
              descricao:      form.descricao,
              formaPagamento: form.formaPagamento,
              cartaoId:       form.cartaoId,
              parcelas:       form.parcelas,
              repeticoes:     form.repeticoes,
              parcelado:      form.parcelado,
              recorrente:     form.recorrente,
            },
            contaId:          form.contaId,
            repeticoesTotal:  form.repeticoesIndefinidas ? undefined : form.repeticoes,
            estabelecimentoId: form.estabelecimentoId,
          }),
          origemTransacaoId: transacaoEdicao.id,
        };

        await salvarRecorrencia(payloadRecorrencia);
      } else if (isEdit && transacaoEdicao) {
        const dadosAtualizacao: UpdateTransacaoDTO = {
          modoEdicao:        modoEdicao || "unica",
          tipo:              form.tipo,
          valor:             parseFloat(form.valor),
          data:              form.data,
          descricao:         form.descricao || undefined,
          categoria:         form.categoria || undefined,
          contaId:           form.contaId   || undefined,
          formaPagamento:    form.formaPagamento,
          cartaoId:          form.cartaoId ? Number(form.cartaoId) : null,
          estabelecimentoId: form.estabelecimentoId || null,
          parcelado:         form.parcelado,
          parcelas:          form.parcelado  ? form.parcelas   : null,
          parcelamentoId:    transacaoEdicao.parcelamentoId ?? null,
          recorrente:        form.recorrente,
          repeticoes:        form.recorrente ? form.repeticoes : null,
          recorrenciaId:     transacaoEdicao.recorrenciaId  ?? null,
        };
        await salvar(dadosAtualizacao);
      } else if (form.recorrente) {
        // ✅ NOVO: caminho separado para recorrências — não passa mais por
        // buildTransacoesFromForm/POST /api/transacoes. Cria só o template;
        // a rota gera a primeira ocorrência na hora se a data for hoje, e o
        // cron cuida dos meses seguintes, aplicando o impacto financeiro
        // só na data real de cada ocorrência.
        if (!salvarRecorrencia) {
          throw new Error("Criação de recorrência não está disponível nesta tela.");
        }

        const payloadRecorrencia = buildCreateRecorrenciaFromForm({
          form: {
            contaId:        form.contaId,
            tipo:           form.tipo,
            categoria:      form.categoria,
            valor:          form.valor,
            data:           form.data,
            descricao:      form.descricao,
            formaPagamento: form.formaPagamento,
            cartaoId:       form.cartaoId,
            parcelas:       form.parcelas,
            repeticoes:     form.repeticoes,
            parcelado:      form.parcelado,
            recorrente:     form.recorrente,
          },
          contaId:          form.contaId,
          repeticoesTotal:  form.repeticoesIndefinidas ? undefined : form.repeticoes,
          estabelecimentoId: form.estabelecimentoId,
        });

        await salvarRecorrencia(payloadRecorrencia);
      } else {
        const transacoesParaCriar = buildTransacoesFromForm({
          form: {
            contaId:        form.contaId,
            tipo:           form.tipo,
            categoria:      form.categoria,
            valor:          form.valor,
            data:           form.data,
            descricao:      form.descricao,
            formaPagamento: form.formaPagamento,
            cartaoId:       form.cartaoId,
            parcelas:       form.parcelas,
            repeticoes:     form.repeticoes,
            parcelado:      form.parcelado,
            recorrente:     form.recorrente,
          },
          contaId:         form.contaId,
          transacaoEdicao: null,
        });

        const comEstabelecimento = transacoesParaCriar.map((t) => ({
          ...t,
          estabelecimentoId: form.estabelecimentoId || undefined,
        }));

        const dadosParaSalvar =
          comEstabelecimento.length === 1 ? comEstabelecimento[0] : comEstabelecimento;

        await salvar(dadosParaSalvar);
      }

      onOpenChange(false);
      if (!isEdit) setForm(novoForm());
    } catch (error) {
      console.error("Erro ao salvar a movimentação:", error);
      setErrors({ valor: error instanceof Error ? error.message : "Erro ao salvar movimentação" });
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && !isEdit) { setForm(novoForm()); setErrors({}); }
    onOpenChange(open);
  };

  const incrementarParcelas   = () => { if (form.parcelas   < 48)  update("parcelas",   form.parcelas   + 1); };
  const decrementarParcelas   = () => { if (form.parcelas   > 2)   update("parcelas",   form.parcelas   - 1); };
  const incrementarRepeticoes = () => { if (form.repeticoes < 999) update("repeticoes", form.repeticoes + 1); };
  const decrementarRepeticoes = () => { if (form.repeticoes > 2)   update("repeticoes", form.repeticoes - 1); };

  const temErros = Object.keys(errors).length > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-full max-w-lg h-[100dvh] md:h-auto md:max-h-[90vh] flex flex-col p-0 gap-0 dark:bg-gray-900 dark:border-gray-800 md:rounded-lg rounded-none">
        {/* HEADER */}
        <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4 border-b dark:border-gray-800 bg-background dark:bg-gray-900">
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">
              {isEdit ? "Editar Movimentação" : "Nova Movimentação"}
            </DialogTitle>
            {modoEdicao && (
              <Badge variant="outline" className="text-xs">
                {modoEdicao === "unica" ? "Única" : modoEdicao === "todas_parcelas" ? "Parcelas" : "Recorrência"}
              </Badge>
            )}
          </div>
        </DialogHeader>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-5 space-y-5">

            {/* Banner de erros */}
            {temErros && (
              <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-700 dark:text-red-300">
                  <p className="font-medium mb-1">Preencha os campos obrigatórios:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-xs">
                    {Object.values(errors).map((msg, i) => <li key={i}>{msg}</li>)}
                  </ul>
                </div>
              </div>
            )}

            {/* 1. TIPO */}
            <MovCamposBasicos form={form} update={update} campo="tipo" disabled={bloqueiaCampos.tipo} />

            {/* 2. CATEGORIA */}
            <MovCampoCategoria form={form} update={update} error={errors.categoria} />

            {/* 3. VALOR + DATA */}
            <div className="grid grid-cols-2 gap-3">
              <MovCamposBasicos form={form} update={update} campo="valor" error={errors.valor} />
              <MovCamposBasicos form={form} update={update} campo="data"  disabled={bloqueiaCampos.data} error={errors.data} />
            </div>

            {/* 4. FORMA DE PAGAMENTO + CONTA/CARTÃO */}
            <div className="grid grid-cols-2 gap-3">
              <MovCampoFormaPagamento form={form} update={update} opcoesDisponiveis={opcoesFormaPagamento} />
              {mostrarCampoConta  && <MovCampoConta  form={form} update={update} renderInfoBox={() => null} error={errors.conta}  valorOriginal={valorOriginalEdicao} />}
              {mostrarCampoCartao && <MovCampoCartao form={form} update={update} renderInfoBox={() => null} error={errors.cartao} disabled={parcelasEmFaturaPaga > 0} />}
            </div>

            {mostrarCampoConta  && form.contaId  && (
              <MovCampoConta  form={form} update={update} hideSelect={true} renderInfoBox={(c) => <div className="w-full">{c}</div>} valorOriginal={valorOriginalEdicao} />
            )}
            {mostrarCampoCartao && form.cartaoId && (
              <MovCampoCartao form={form} update={update} hideSelect={true} renderInfoBox={(c) => <div className="w-full">{c}</div>} />
            )}

            {/* 5. TIPO DE PAGAMENTO */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block">
                Tipo de Pagamento
              </label>
              <Select
                value={tipoPagamento}
                onValueChange={(v: TipoPagamento) => {
                  const isParcelado  = v === "parcelado";
                  const isRecorrente = v === "recorrente";
                  update("parcelado",  isParcelado);
                  update("recorrente", isRecorrente);
                  if (isParcelado  && form.parcelas   < 2) update("parcelas",   2);
                  if (isRecorrente && form.repeticoes < 2) update("repeticoes", 2);
                }}
                disabled={bloqueiaCampos.parcelas || bloqueiaCampos.repeticoes || bloqueiaCampos.tipoPagamento}
              >
                <SelectTrigger size="lg" className="w-full dark:bg-gray-800 dark:border-gray-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                  {opcoesTipoPagamento.map((tipo) => {
                    const Icon = tipoPagamentoIcons[tipo];
                    return (
                      <SelectItem key={tipo} value={tipo} className="dark:hover:bg-gray-700 h-12">
                        <div className="flex gap-2 items-center">
                          <Icon size={16} />
                          <span>{tipoPagamentoLabels[tipo]}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>

              {modoEdicao === "todas_parcelas" && (
                <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-2.5">
                  <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    As alterações serão aplicadas a <strong>todas as parcelas</strong> deste parcelamento.
                    {parcelasEmFaturaPaga > 0 && (
                      <>
                        {" "}{parcelasEmFaturaPaga === 1 ? "1 parcela está" : `${parcelasEmFaturaPaga} parcelas estão`} em fatura paga:
                        {" "}mantém o valor, e o restante do total é dividido entre as demais. O cartão não pode ser trocado.
                      </>
                    )}
                  </p>
                </div>
              )}

              {/* ✅ NOVO: toggle de recorrência indefinida — aparece na criação
                  do zero E ao converter uma transação à vista existente em
                  recorrente (mas não ao editar uma ocorrência já recorrente,
                  onde repetições são geridas na aba Recorrências) */}
              {form.recorrente && (!isEdit || convertendoParaRecorrente) && (
                <div className="flex items-center justify-between bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
                  <div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Repetir indefinidamente
                    </span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Gera todo mês até você pausar ou cancelar
                    </p>
                  </div>
                  <Switch
                    checked={form.repeticoesIndefinidas}
                    onCheckedChange={(checked) => update("repeticoesIndefinidas", checked)}
                  />
                </div>
              )}

              {/* Stepper de parcelas/meses — some quando recorrência é indefinida */}
              {(form.parcelado || (form.recorrente && !form.repeticoesIndefinidas)) && (
                <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {form.parcelado ? "Parcelas" : "Meses"}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="icon" className="h-10 w-10 rounded-full"
                      onClick={form.parcelado ? decrementarParcelas : decrementarRepeticoes}
                      disabled={form.parcelado ? (form.parcelas <= 2 || bloqueiaCampos.parcelas) : (form.repeticoes <= 2 || bloqueiaCampos.repeticoes)}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <div className="min-w-[60px] text-center">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {form.parcelado ? form.parcelas : form.repeticoes}
                      </div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {form.parcelado
                          ? "parcela" + (form.parcelas   > 1 ? "s" : "")
                          : "mês"    + (form.repeticoes  > 1 ? "es" : "")}
                      </div>
                    </div>
                    <Button type="button" variant="outline" size="icon" className="h-10 w-10 rounded-full"
                      onClick={form.parcelado ? incrementarParcelas : incrementarRepeticoes}
                      disabled={form.parcelado ? (form.parcelas >= 48 || bloqueiaCampos.parcelas) : (form.repeticoes >= 999 || bloqueiaCampos.repeticoes)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {errors.parcelas   && <p className="text-xs text-red-500 flex items-center gap-1">⚠ {errors.parcelas}</p>}
              {errors.repeticoes && <p className="text-xs text-red-500 flex items-center gap-1">⚠ {errors.repeticoes}</p>}

              {form.parcelado && form.parcelas > 1 && parseFloat(form.valor) > 0 && (
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-blue-700 dark:text-blue-300">Cada parcela:</span>
                    <span className="text-sm font-bold text-blue-900 dark:text-blue-200">
                      R$ {(parseFloat(form.valor) / form.parcelas).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {/* ✅ Preview do total — só quando não é indefinida (senão o
                  total é desconhecido) */}
              {form.recorrente && !form.repeticoesIndefinidas && form.repeticoes > 1 && parseFloat(form.valor) > 0 && (
                <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg p-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-purple-700 dark:text-purple-300">Total ({form.repeticoes} meses):</span>
                    <span className="text-sm font-bold text-purple-900 dark:text-purple-200">
                      R$ {valorTotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {/* ✅ NOVO: preview do valor mensal quando indefinida */}
              {form.recorrente && form.repeticoesIndefinidas && parseFloat(form.valor) > 0 && (
                <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg p-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-purple-700 dark:text-purple-300">Valor mensal, sem data pra terminar:</span>
                    <span className="text-sm font-bold text-purple-900 dark:text-purple-200">
                      R$ {parseFloat(form.valor).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* 6. ESTABELECIMENTO */}
            <MovCampoEstabelecimento
              estabelecimentoId={form.estabelecimentoId}
              onChange={(id) => update("estabelecimentoId", id)}
            />

            {/* 7. OBSERVAÇÕES */}
            <details className="group" open>
              <summary className="flex items-center justify-between cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 py-2">
                <span>Observações (opcional)</span>
                <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="mt-2">
                <MovCamposBasicos form={form} update={update} campo="descricao" />
              </div>
            </details>
          </div>

          {/* FOOTER */}
          <div className="flex-shrink-0 flex gap-3 px-6 py-4 border-t dark:border-gray-800 bg-background dark:bg-gray-900">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={loading} className="flex-1 h-12 font-medium">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="bg-blue-700 text-white hover:bg-blue-800 flex-1 h-12 font-semibold">
              {loading ? (
                <><FaSpinner className="animate-spin mr-2" size={14} />Salvando...</>
              ) : (
                isEdit ? "Salvar Alterações" : "Adicionar"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}