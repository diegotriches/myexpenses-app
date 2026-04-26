"use client";

import { useState, useEffect, useMemo } from "react";

import MovCamposBasicos from "@/components/transacao/MovCamposBasicos";
import MovCampoCategoria from "@/components/transacao/MovCampoCategoria";
import MovCampoFormaPagamento from "@/components/transacao/MovCampoFormaPagamento";
import MovCampoConta from "@/components/transacao/MovCampoConta";
import MovCampoCartao from "./MovCampoCartao";
import MovCampoEstabelecimento from "./MovCampoEstabelecimento"; // ✅ NOVO

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import {
  Transacao,
  CreateTransacaoDTO,
  UpdateTransacaoDTO,
} from "@/types/transacao";

import { formatarDataParaInput } from "@/utils/dateUtils";
import { buildTransacoesFromForm } from "@/lib/buildTransacoesFromForm";

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

import { FaMoneyBill, FaSpinner, FaSyncAlt } from "react-icons/fa";
import { AlertCircle, Minus, Plus } from "lucide-react";

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
  salvar: (dados: any) => Promise<void>;
  loading?: boolean;
}

const initialForm = {
  contaId:           "",
  tipo:              "saida" as "entrada" | "saida",
  categoria:         "",
  valor:             "",
  data:              new Date().toISOString().split("T")[0],
  descricao:         "",
  formaPagamento:    "dinheiro" as "dinheiro" | "pix" | "cartao",
  cartaoId:          "",
  parcelado:         false,
  parcelas:          1,
  recorrente:        false,
  repeticoes:        1,
  estabelecimentoId: "", // ✅ NOVO
};

type FormState = typeof initialForm;

const tipoPagamentoIcons: Record<TipoPagamento, any> = {
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
  loading = false,
}: Props) {
  const isEdit = Boolean(transacaoEdicao);
  const [form,   setForm]   = useState<FormState>(initialForm);
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

  const updateAny = (key: string, value: any) => update(key as keyof FormState, value);

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
  }, [transacaoEdicao, modoEdicao]);

  const valorTotal = useMemo(() => {
    const valor = parseFloat(form.valor) || 0;
    if (form.parcelado  && form.parcelas   > 1) return valor;
    if (form.recorrente && form.repeticoes > 1) return valor * form.repeticoes;
    return valor;
  }, [form.valor, form.parcelado, form.parcelas, form.recorrente, form.repeticoes]);

  const valorOriginalEdicao = useMemo(() => {
    if (!isEdit || !transacaoEdicao) return undefined;
    if (modoEdicao === "todas_parcelas" && transacaoEdicao.parcelado && transacaoEdicao.parcelas) {
      return Number(transacaoEdicao.valor) * transacaoEdicao.parcelas;
    }
    return Number(transacaoEdicao.valor);
  }, [isEdit, transacaoEdicao, modoEdicao]);

  useEffect(() => {
    if (!transacaoEdicao) {
      setForm(initialForm);
      setErrors({});
      return;
    }

    const valorFormulario =
      modoEdicao === "todas_parcelas" && transacaoEdicao.parcelado && transacaoEdicao.parcelas
        ? Number(transacaoEdicao.valor) * transacaoEdicao.parcelas
        : Number(transacaoEdicao.valor ?? "");

    const dataFormatada = formatarDataParaInput(transacaoEdicao.data);

    setForm({
      contaId:    transacaoEdicao.contaId ?? "",
      tipo:       transacaoEdicao.tipo    ?? "entrada",
      categoria:  transacaoEdicao.categoria   ?? "",
      valor:      String(valorFormulario),
      data:       dataFormatada,
      descricao:  transacaoEdicao.descricao   ?? "",
      formaPagamento: ["dinheiro", "pix", "cartao"].includes(transacaoEdicao.formaPagamento ?? "")
        ? (transacaoEdicao.formaPagamento as "dinheiro" | "pix" | "cartao")
        : "dinheiro",
      cartaoId:   transacaoEdicao.cartaoId ? String(transacaoEdicao.cartaoId) : "",
      parcelado:  modoEdicao === "unica" && transacaoEdicao.recorrente ? false : (transacaoEdicao.parcelado  ?? false),
      parcelas:   transacaoEdicao.parcelas   ?? 1,
      recorrente: modoEdicao === "unica" && transacaoEdicao.recorrente ? false : (transacaoEdicao.recorrente ?? false),
      repeticoes: transacaoEdicao.repeticoes ?? 1,
      // ✅ NOVO: carrega estabelecimento existente na edição
      estabelecimentoId: transacaoEdicao.estabelecimentoId ?? "",
    });
    setErrors({});
  }, [transacaoEdicao, open, modoEdicao]);

  const validateForm = (): FormErrors => {
    const erros: FormErrors = {};
    if (!form.categoria)                          erros.categoria  = "Selecione uma categoria";
    if (!form.valor || parseFloat(form.valor) <= 0) erros.valor    = "Informe um valor válido";
    if (!form.data)                               erros.data       = "Selecione uma data";
    if (mostrarCampoConta  && !form.contaId)      erros.conta      = "Selecione uma conta";
    if (mostrarCampoCartao && !form.cartaoId)     erros.cartao     = "Selecione um cartão";
    if (form.parcelado  && form.parcelas   < 2)   erros.parcelas   = "Mínimo de 2 parcelas";
    if (form.recorrente && form.repeticoes < 2)   erros.repeticoes = "Mínimo de 2 repetições";
    return erros;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const erros = validateForm();
    if (Object.keys(erros).length > 0) { setErrors(erros); return; }
    setErrors({});

    try {
      if (isEdit && transacaoEdicao) {
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
          // ✅ NOVO
          estabelecimentoId: form.estabelecimentoId || null,
          parcelado:         form.parcelado,
          parcelas:          form.parcelado  ? form.parcelas   : null,
          parcelamentoId:    transacaoEdicao.parcelamentoId ?? null,
          recorrente:        form.recorrente,
          repeticoes:        form.recorrente ? form.repeticoes : null,
          recorrenciaId:     transacaoEdicao.recorrenciaId  ?? null,
        };
        await salvar(dadosAtualizacao);
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

        // ✅ NOVO: injeta estabelecimentoId em cada transação gerada
        const comEstabelecimento = transacoesParaCriar.map((t: any) => ({
          ...t,
          estabelecimentoId: form.estabelecimentoId || undefined,
        }));

        const dadosParaSalvar =
          comEstabelecimento.length === 1 ? comEstabelecimento[0] : comEstabelecimento;

        await salvar(dadosParaSalvar);
      }

      onOpenChange(false);
      if (!isEdit) setForm(initialForm);
    } catch (error) {
      console.error("Erro ao salvar a movimentação:", error);
      setErrors({ valor: error instanceof Error ? error.message : "Erro ao salvar movimentação" });
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && !isEdit) { setForm(initialForm); setErrors({}); }
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
            <MovCamposBasicos form={form} update={updateAny} campo="tipo" disabled={bloqueiaCampos.tipo} />

            {/* 2. CATEGORIA */}
            <MovCampoCategoria form={form} update={updateAny} error={errors.categoria} />

            {/* 3. VALOR + DATA */}
            <div className="grid grid-cols-2 gap-3">
              <MovCamposBasicos form={form} update={updateAny} campo="valor" error={errors.valor} />
              <MovCamposBasicos form={form} update={updateAny} campo="data"  disabled={bloqueiaCampos.data} error={errors.data} />
            </div>

            {/* 4. FORMA DE PAGAMENTO + CONTA/CARTÃO */}
            <div className="grid grid-cols-2 gap-3">
              <MovCampoFormaPagamento form={form} update={updateAny} opcoesDisponiveis={opcoesFormaPagamento} />
              {mostrarCampoConta  && <MovCampoConta  form={form} update={updateAny} renderInfoBox={() => null} error={errors.conta}  valorOriginal={valorOriginalEdicao} />}
              {mostrarCampoCartao && <MovCampoCartao form={form} update={updateAny} renderInfoBox={() => null} error={errors.cartao} />}
            </div>

            {mostrarCampoConta  && form.contaId  && (
              <MovCampoConta  form={form} update={updateAny} hideSelect={true} renderInfoBox={(c) => <div className="w-full">{c}</div>} valorOriginal={valorOriginalEdicao} />
            )}
            {mostrarCampoCartao && form.cartaoId && (
              <MovCampoCartao form={form} update={updateAny} hideSelect={true} renderInfoBox={(c) => <div className="w-full">{c}</div>} />
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
                <SelectTrigger className="w-full h-12 dark:bg-gray-800 dark:border-gray-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                  {(Object.keys(tipoPagamentoIcons) as TipoPagamento[]).map((tipo) => {
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
                  </p>
                </div>
              )}

              {(form.parcelado || form.recorrente) && (
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

              {form.recorrente && form.repeticoes > 1 && parseFloat(form.valor) > 0 && (
                <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg p-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-purple-700 dark:text-purple-300">Total ({form.repeticoes} meses):</span>
                    <span className="text-sm font-bold text-purple-900 dark:text-purple-200">
                      R$ {valorTotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* 6. ESTABELECIMENTO ✅ NOVO */}
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
                <MovCamposBasicos form={form} update={updateAny} campo="descricao" />
              </div>
            </details>
          </div>

          {/* FOOTER */}
          <div className="flex-shrink-0 flex gap-3 px-6 py-4 border-t dark:border-gray-800 bg-background dark:bg-gray-900">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={loading} className="flex-1 h-12 font-medium">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="flex-1 h-12 font-semibold">
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