"use client";

import { useState, useEffect, useMemo } from "react";

import MovCamposBasicos from "@/components/transacao/MovCamposBasicos";
import MovCampoCategoria from "@/components/transacao/MovCampoCategoria";
import MovCampoFormaPagamento from "@/components/transacao/MovCampoFormaPagamento";
import MovCampoConta from "@/components/transacao/MovCampoConta";
import MovCampoCartao from "./MovCampoCartao";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
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
import { Info, AlertCircle, Minus, Plus } from "lucide-react";

type TipoPagamento = "avista" | "parcelado" | "recorrente";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transacaoEdicao: Transacao | null;
  modoEdicao?: "unica" | "todas_parcelas" | "toda_recorrencia";
  salvar: (dados: any) => Promise<void>;
  loading?: boolean;
}

const initialForm = {
  contaId: "",
  tipo: "saida" as "entrada" | "saida",
  categoria: "",
  valor: "",
  data: new Date().toISOString().split("T")[0],
  descricao: "",
  formaPagamento: "dinheiro" as "dinheiro" | "pix" | "cartao",
  cartaoId: "",
  parcelado: false,
  parcelas: 1,
  recorrente: false,
  repeticoes: 1,
};

type FormState = typeof initialForm;

const tipoPagamentoIcons: Record<TipoPagamento, any> = {
  avista: FaMoneyBill,
  parcelado: FaSpinner,
  recorrente: FaSyncAlt,
};

const tipoPagamentoLabels: Record<TipoPagamento, string> = {
  avista: "À vista",
  parcelado: "Parcelado",
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
  const [form, setForm] = useState<FormState>(initialForm);
  const [error, setError] = useState<string | null>(null);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => {
      const updated = { ...prev, [key]: value };

      if (key === "tipo" && value === "entrada" && prev.formaPagamento === "cartao") {
        updated.formaPagamento = "dinheiro";
      }

      return updated;
    });
    setError(null);
  };

  const updateAny = (key: string, value: any) => {
    update(key as keyof FormState, value);
  };

  const tipoPagamento = useMemo<TipoPagamento>(() => {
    if (form.parcelado) return "parcelado";
    if (form.recorrente) return "recorrente";
    return "avista";
  }, [form.parcelado, form.recorrente]);

  const textoFormaPagamento = useMemo(() => {
    return form.tipo === "entrada" ? "Forma de Recebimento" : "Forma de Pagamento";
  }, [form.tipo]);

  const opcoesFormaPagamento = useMemo(() => {
    if (form.tipo === "entrada") {
      return ["dinheiro", "pix"] as const;
    }
    return ["dinheiro", "pix", "cartao"] as const;
  }, [form.tipo]);

  const mostrarCampoConta = useMemo(() => {
    if (form.tipo === "entrada") return true;
    if (form.tipo === "saida" && (form.formaPagamento === "dinheiro" || form.formaPagamento === "pix")) {
      return true;
    }
    return false;
  }, [form.tipo, form.formaPagamento]);

  const mostrarCampoCartao = useMemo(() => {
    return form.tipo === "saida" && form.formaPagamento === "cartao";
  }, [form.tipo, form.formaPagamento]);

  const bloqueiaCampos = useMemo(() => {
    if (!transacaoEdicao || !modoEdicao) return {};
    const editarTodos = modoEdicao === "todas_parcelas" || modoEdicao === "toda_recorrencia";
    return {
      tipo: editarTodos,
      data: editarTodos,
      formaPagamento: editarTodos,
      parcelas: transacaoEdicao.parcelado && modoEdicao === "todas_parcelas",
      repeticoes: transacaoEdicao.recorrente && modoEdicao === "toda_recorrencia",
    };
  }, [transacaoEdicao, modoEdicao]);

  const valorTotal = useMemo(() => {
    const valor = parseFloat(form.valor) || 0;
    if (form.parcelado && form.parcelas > 1) {
      return valor;
    }
    if (form.recorrente && form.repeticoes > 1) {
      return valor * form.repeticoes;
    }
    return valor;
  }, [form.valor, form.parcelado, form.parcelas, form.recorrente, form.repeticoes]);

  useEffect(() => {
    if (!transacaoEdicao) {
      setForm(initialForm);
      setError(null);
      return;
    }

    const valorFormulario =
      modoEdicao === "todas_parcelas" &&
        transacaoEdicao.parcelado &&
        transacaoEdicao.parcelas
        ? Number(transacaoEdicao.valor) * transacaoEdicao.parcelas
        : Number(transacaoEdicao.valor ?? "");

    const dataFormatada = formatarDataParaInput(transacaoEdicao.data);

    setForm({
      contaId: transacaoEdicao.contaId ?? "",
      tipo: transacaoEdicao.tipo ?? "entrada",
      categoria: transacaoEdicao.categoria ?? "",
      valor: String(valorFormulario),
      data: dataFormatada,
      descricao: transacaoEdicao.descricao ?? "",
      formaPagamento: ["dinheiro", "pix", "cartao"].includes(transacaoEdicao.formaPagamento ?? "")
        ? (transacaoEdicao.formaPagamento as "dinheiro" | "pix" | "cartao")
        : "dinheiro",
      cartaoId: transacaoEdicao.cartaoId ? String(transacaoEdicao.cartaoId) : "",
      parcelado: transacaoEdicao.parcelado ?? false,
      parcelas: transacaoEdicao.parcelas ?? 1,
      recorrente: transacaoEdicao.recorrente ?? false,
      repeticoes: transacaoEdicao.repeticoes ?? 1,
    });
  }, [transacaoEdicao, open, modoEdicao]);

  const validateForm = (): string | null => {
    if (!form.categoria) return "Selecione uma categoria";
    if (!form.valor || parseFloat(form.valor) <= 0) return "Informe um valor válido";
    if (!form.data) return "Selecione uma data";
    if (mostrarCampoConta && !form.contaId) return "Selecione uma conta";
    if (mostrarCampoCartao && !form.cartaoId) return "Selecione um cartão";
    if (form.parcelado && form.parcelas < 2) return "Parcelas deve ser maior que 1";
    if (form.recorrente && form.repeticoes < 2) return "Repetições deve ser maior que 1";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);

    try {
      if (isEdit && transacaoEdicao) {
        const dadosAtualizacao: UpdateTransacaoDTO = {
          modoEdicao: modoEdicao || "unica",
          tipo: form.tipo,
          valor: parseFloat(form.valor),
          data: form.data,
          descricao: form.descricao || undefined,
          categoria: form.categoria || undefined,
          contaId: form.contaId || undefined,
          formaPagamento: form.formaPagamento,
          cartaoId: form.cartaoId ? Number(form.cartaoId) : null,
        };

        await salvar(dadosAtualizacao);
      } else {
        const transacoesParaCriar = buildTransacoesFromForm({
          form: {
            contaId: form.contaId,
            tipo: form.tipo,
            categoria: form.categoria,
            valor: form.valor,
            data: form.data,
            descricao: form.descricao,
            formaPagamento: form.formaPagamento,
            cartaoId: form.cartaoId,
            parcelas: form.parcelas,
            repeticoes: form.repeticoes,
            parcelado: form.parcelado,
            recorrente: form.recorrente,
          },
          contaId: form.contaId,
          transacaoEdicao: null,
        });

        const dadosParaSalvar = transacoesParaCriar.length === 1 
          ? transacoesParaCriar[0] 
          : transacoesParaCriar;

        await salvar(dadosParaSalvar);
      }

      onOpenChange(false);
      if (!isEdit) setForm(initialForm);
    } catch (error) {
      console.error("Erro ao salvar a movimentação:", error);
      setError(error instanceof Error ? error.message : "Erro ao salvar movimentação");
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && !isEdit) {
      setForm(initialForm);
      setError(null);
    }
    onOpenChange(open);
  };

  // ✅ Funções para incrementar/decrementar
  const incrementarParcelas = () => {
    const max = 48;
    if (form.parcelas < max) {
      update("parcelas", form.parcelas + 1);
    }
  };

  const decrementarParcelas = () => {
    const min = 2;
    if (form.parcelas > min) {
      update("parcelas", form.parcelas - 1);
    }
  };

  const incrementarRepeticoes = () => {
    const max = 999;
    if (form.repeticoes < max) {
      update("repeticoes", form.repeticoes + 1);
    }
  };

  const decrementarRepeticoes = () => {
    const min = 2;
    if (form.repeticoes > min) {
      update("repeticoes", form.repeticoes - 1);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-full max-w-lg h-[100dvh] md:h-auto md:max-h-[85vh] flex flex-col p-0 gap-0 dark:bg-gray-900 dark:border-gray-800 md:rounded-lg rounded-none">
        {/* ============================================
            HEADER - Compacto e Fixo
            ============================================ */}
        <DialogHeader className="flex-shrink-0 px-4 pt-4 pb-3 border-b dark:border-gray-800 bg-background dark:bg-gray-900">
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="text-base font-semibold text-gray-900 dark:text-white truncate">
              {isEdit ? "Editar" : "Nova Movimentação"}
            </DialogTitle>
            {modoEdicao && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 flex-shrink-0">
                {modoEdicao === "unica" ? "Única" :
                  modoEdicao === "todas_parcelas" ? "Parcelas" :
                    "Recorrência"}
              </Badge>
            )}
          </div>
        </DialogHeader>

        {/* ============================================
            FORM - Scrollable com padding otimizado
            ============================================ */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 space-y-4">
            {/* Error Alert */}
            {error && (
              <Alert variant="destructive" className="py-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">{error}</AlertDescription>
              </Alert>
            )}

            {/* ============================================
                Tipo e Categoria - Grid 2 cols
                ============================================ */}
            <div className="grid grid-cols-2 gap-2">
              <MovCamposBasicos
                form={form}
                update={updateAny}
                campo="tipo"
                disabled={bloqueiaCampos.tipo}
              />
              <MovCampoCategoria form={form} update={updateAny} />
            </div>

            {/* ============================================
                Valor e Data
                ============================================ */}
            <div className="grid grid-cols-2 gap-2">
              <MovCamposBasicos form={form} update={updateAny} campo="valor" />
              <MovCamposBasicos
                form={form}
                update={updateAny}
                campo="data"
                disabled={bloqueiaCampos.data}
              />
            </div>

            {/* ============================================
                Forma de Pagamento + Conta/Cartão - Grid 2 cols
                ============================================ */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block">
                {textoFormaPagamento}
              </label>
              
              <div className="grid grid-cols-2 gap-2">
                <MovCampoFormaPagamento
                  form={form}
                  update={updateAny}
                  opcoesDisponiveis={opcoesFormaPagamento}
                />

                {mostrarCampoConta && (
                  <MovCampoConta 
                    form={form} 
                    update={updateAny}
                    renderInfoBox={() => null}
                  />
                )}

                {mostrarCampoCartao && (
                  <MovCampoCartao 
                    form={form} 
                    update={updateAny}
                    renderInfoBox={() => null}
                  />
                )}
              </div>

              {/* ✅ Info Box da Conta - FORA do grid, largura total */}
              {mostrarCampoConta && form.contaId && (
                <MovCampoConta 
                  form={form} 
                  update={updateAny}
                  hideSelect={true}
                  renderInfoBox={(content) => <div className="w-full">{content}</div>}
                />
              )}

              {/* ✅ Info Box do Cartão - FORA do grid, largura total */}
              {mostrarCampoCartao && form.cartaoId && (
                <MovCampoCartao 
                  form={form} 
                  update={updateAny}
                  hideSelect={true}
                  renderInfoBox={(content) => <div className="w-full">{content}</div>}
                />
              )}
            </div>

            {/* ============================================
                Tipo de Pagamento - REDESENHADO
                ============================================ */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block">
                Tipo de Pagamento
              </label>
              
              <Select
                value={tipoPagamento}
                onValueChange={(v: TipoPagamento) => {
                  const isParcelado = v === "parcelado";
                  const isRecorrente = v === "recorrente";

                  update("parcelado", isParcelado);
                  update("recorrente", isRecorrente);

                  if (isParcelado && form.parcelas < 2) update("parcelas", 2);
                  if (isRecorrente && form.repeticoes < 2) update("repeticoes", 2);
                }}
                disabled={bloqueiaCampos.parcelas || bloqueiaCampos.repeticoes}
              >
                <SelectTrigger className="w-full h-12 dark:bg-gray-800 dark:border-gray-700 touch-manipulation">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                  {(Object.keys(tipoPagamentoIcons) as TipoPagamento[]).map((tipo) => {
                    const Icon = tipoPagamentoIcons[tipo];
                    return (
                      <SelectItem 
                        key={tipo} 
                        value={tipo} 
                        className="dark:hover:bg-gray-700 h-12 touch-manipulation"
                      >
                        <div className="flex gap-2 items-center">
                          <Icon size={16} />
                          <span>{tipoPagamentoLabels[tipo]}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>

              {/* ✅ CONTADOR VISUAL - Mais touch-friendly */}
              {(form.parcelado || form.recorrente) && (
                <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {form.parcelado ? "Parcelas" : "Meses"}
                  </span>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 rounded-full touch-manipulation"
                      onClick={form.parcelado ? decrementarParcelas : decrementarRepeticoes}
                      disabled={form.parcelado 
                        ? (form.parcelas <= 2 || bloqueiaCampos.parcelas) 
                        : (form.repeticoes <= 2 || bloqueiaCampos.repeticoes)
                      }
                    >
                      <Minus className="h-4 w-4" />
                    </Button>

                    <div className="min-w-[60px] text-center">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {form.parcelado ? form.parcelas : form.repeticoes}
                      </div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {form.parcelado ? "parcela" + (form.parcelas > 1 ? "s" : "") : "mês" + (form.repeticoes > 1 ? "es" : "")}
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 rounded-full touch-manipulation"
                      onClick={form.parcelado ? incrementarParcelas : incrementarRepeticoes}
                      disabled={form.parcelado 
                        ? (form.parcelas >= 48 || bloqueiaCampos.parcelas) 
                        : (form.repeticoes >= 999 || bloqueiaCampos.repeticoes)
                      }
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Info Cards - Mais compactos */}
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

            {/* ============================================
                Observações - Colapsável
                ============================================ */}
            <details className="group" open={!!form.descricao}>
              <summary className="flex items-center justify-between cursor-pointer text-xs font-medium text-gray-600 dark:text-gray-400 py-2">
                <span>Observações (opcional)</span>
                <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="mt-2">
                <MovCamposBasicos form={form} update={updateAny} campo="descricao" />
              </div>
            </details>

            {/* Espaçamento extra para não ficar colado no botão */}
            <div className="h-2" />
          </div>

          {/* ============================================
              FOOTER - Sticky com sombra
              ============================================ */}
          <div className="flex-shrink-0 flex gap-2 px-4 py-3 border-t dark:border-gray-800 bg-background dark:bg-gray-900 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
              className="flex-1 h-12 text-sm font-medium touch-manipulation dark:border-gray-700 dark:hover:bg-gray-800"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading} 
              className="flex-1 h-12 text-sm font-semibold touch-manipulation"
            >
              {loading ? (
                <>
                  <FaSpinner className="animate-spin mr-2" size={14} />
                  Salvando...
                </>
              ) : (
                isEdit ? "Salvar" : "Adicionar"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}