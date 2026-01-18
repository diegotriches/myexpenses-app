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

// ✅ IMPORTAR buildTransacoesFromForm
import { buildTransacoesFromForm } from "@/lib/buildTransacoesFromForm";

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

import { FaMoneyBill, FaSpinner, FaSyncAlt } from "react-icons/fa";
import { Info, AlertCircle, Calendar, DollarSign, Tag, FileText } from "lucide-react";

// ✅ TIPO LOCAL (não importar de transacao.ts)
type TipoPagamento = "avista" | "parcelado" | "recorrente";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transacaoEdicao: Transacao | null;
  modoEdicao?: "unica" | "todas_parcelas" | "toda_recorrencia";
  salvar: (dados: any) => Promise<void>; // ✅ Aceita qualquer tipo (será validado em runtime)
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

      // Se mudar para entrada e estava no cartão, volta para dinheiro
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

    const dataStr = typeof transacaoEdicao.data === 'string'
      ? transacaoEdicao.data
      : transacaoEdicao.data?.toISOString() || new Date().toISOString();

    setForm({
      contaId: transacaoEdicao.contaId ?? "",
      tipo: transacaoEdicao.tipo ?? "entrada",
      categoria: transacaoEdicao.categoria ?? "",
      valor: String(valorFormulario),
      data: dataStr.split("T")[0],
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
        // ✅ EDIÇÃO - Mantém lógica atual
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
        // ✅ CRIAÇÃO - USA buildTransacoesFromForm
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

        // ✅ LOG PARA DEBUG
        console.log('🔍 Transações geradas pelo buildTransacoesFromForm:', {
          total: transacoesParaCriar.length,
          isParcelas: form.parcelado,
          isRecorrente: form.recorrente,
          datas: transacoesParaCriar.map(t => t.data),
          valores: transacoesParaCriar.map(t => t.valor),
        });

        // ✅ Envia array se múltiplas transações, objeto único se apenas uma
        const dadosParaSalvar = transacoesParaCriar.length === 1 
          ? transacoesParaCriar[0] 
          : transacoesParaCriar;

        await salvar(dadosParaSalvar);
      }

      // Modal fecha após sucesso
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto dark:bg-gray-900 dark:border-gray-800">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              {isEdit ? "Editar Movimentação" : "Nova Movimentação"}
            </DialogTitle>
            {modoEdicao && (
              <Badge variant="outline" className="text-xs">
                {modoEdicao === "unica" ? "Apenas esta" :
                  modoEdicao === "todas_parcelas" ? "Todas as parcelas" :
                    "Toda a recorrência"}
              </Badge>
            )}
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* SEÇÃO 1: Tipo e Categoria */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400">
              <Tag className="h-4 w-4" />
              <span>Informações Básicas</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <MovCamposBasicos
                form={form}
                update={updateAny}
                campo="tipo"
                disabled={bloqueiaCampos.tipo}
              />
              <MovCampoCategoria form={form} update={updateAny} />
            </div>
          </div>

          <Separator className="dark:bg-gray-800" />

          {/* SEÇÃO 2: Valor e Data */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400">
              <DollarSign className="h-4 w-4" />
              <span>Valor e Data</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <MovCamposBasicos form={form} update={updateAny} campo="valor" />
              <MovCamposBasicos
                form={form}
                update={updateAny}
                campo="data"
                disabled={bloqueiaCampos.data}
              />
            </div>
          </div>

          <Separator className="dark:bg-gray-800" />

          {/* SEÇÃO 3: Forma de Pagamento */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400">
              <FaMoneyBill className="h-4 w-4" />
              <span>{textoFormaPagamento}</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <MovCampoFormaPagamento
                form={form}
                update={updateAny}
                opcoesDisponiveis={opcoesFormaPagamento}
              />

              {mostrarCampoConta && (
                <MovCampoConta form={form} update={updateAny} />
              )}

              {mostrarCampoCartao && (
                <MovCampoCartao form={form} update={updateAny} />
              )}
            </div>

            {mostrarCampoCartao && (
              <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertDescription className="text-blue-800 dark:text-blue-300">
                  <p className="font-medium">Despesa com cartão de crédito</p>
                  <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                    O saldo da sua conta só será impactado quando você pagar a fatura do cartão.
                  </p>
                </AlertDescription>
              </Alert>
            )}
          </div>

          <Separator className="dark:bg-gray-800" />

          {/* SEÇÃO 4: Tipo de Pagamento */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400">
              <Calendar className="h-4 w-4" />
              <span>Tipo de Pagamento</span>
            </div>

            <div className="flex gap-2 items-start">
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
                <SelectTrigger className="flex-1 dark:bg-gray-800 dark:border-gray-700">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>

                <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                  {(Object.keys(tipoPagamentoIcons) as TipoPagamento[]).map((tipo) => {
                    const Icon = tipoPagamentoIcons[tipo];
                    return (
                      <SelectItem key={tipo} value={tipo} className="dark:hover:bg-gray-700">
                        <div className="flex gap-2 items-center">
                          <Icon size={16} />
                          {tipoPagamentoLabels[tipo]}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>

              {/* ✅ INPUT MELHORADO - MOBILE FRIENDLY */}
              {(form.parcelado || form.recorrente) && (
                <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-md px-3 py-2">
                  <input
                    type="number"
                    inputMode="numeric"
                    min={2}
                    max={form.parcelado ? 48 : 999}
                    value={form.parcelado ? form.parcelas : form.repeticoes}
                    onChange={(e) => {
                      const value = e.target.value;
                      
                      // ✅ Permite apagar (campo vazio)
                      if (value === "") {
                        form.parcelado ? update("parcelas", 0) : update("repeticoes", 0);
                        return;
                      }

                      // ✅ Converte para número e valida
                      const num = parseInt(value, 10);
                      if (!isNaN(num)) {
                        // Permite digitar, mas não força o mínimo ainda
                        form.parcelado ? update("parcelas", num) : update("repeticoes", num);
                      }
                    }}
                    onBlur={(e) => {
                      // ✅ Quando sair do campo, força mínimo de 2
                      const value = parseInt(e.target.value, 10);
                      const minValue = 2;
                      const maxValue = form.parcelado ? 48 : 999;
                      
                      if (isNaN(value) || value < minValue) {
                        form.parcelado ? update("parcelas", minValue) : update("repeticoes", minValue);
                      } else if (value > maxValue) {
                        form.parcelado ? update("parcelas", maxValue) : update("repeticoes", maxValue);
                      }
                    }}
                    onFocus={(e) => {
                      // ✅ Seleciona todo o texto ao focar (facilita substituir)
                      e.target.select();
                    }}
                    className="w-16 border dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-md p-1 text-center font-medium focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
                    disabled={form.parcelado ? bloqueiaCampos.parcelas : bloqueiaCampos.repeticoes}
                    aria-label={form.parcelado ? "Número de parcelas" : "Número de meses"}
                  />
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">
                    {form.parcelado ? "parcelas" : "meses"}
                  </span>
                </div>
              )}
            </div>

            {form.parcelado && form.parcelas > 1 && parseFloat(form.valor) > 0 && (
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Valor de cada parcela:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    R$ {(parseFloat(form.valor) / form.parcelas).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
            {form.recorrente && form.repeticoes > 1 && parseFloat(form.valor) > 0 && (
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Valor total ({form.repeticoes} meses):</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    R$ {valorTotal.toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>

          <Separator className="dark:bg-gray-800" />

          {/* SEÇÃO 5: Descrição */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400">
              <FileText className="h-4 w-4" />
              <span>Observações</span>
              <Badge variant="secondary" className="text-xs">Opcional</Badge>
            </div>
            <MovCamposBasicos form={form} update={updateAny} campo="descricao" />
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-800 sticky bottom-0 bg-background dark:bg-gray-900">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
              className="dark:border-gray-700 dark:hover:bg-gray-800"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="min-w-[120px]">
              {loading ? (
                <>
                  <FaSpinner className="animate-spin mr-2" />
                  Salvando...
                </>
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