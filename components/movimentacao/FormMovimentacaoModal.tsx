"use client";

import { useState, useEffect, useMemo } from "react";

import MovCamposBasicos from "@/components/movimentacao/MovCamposBasicos";
import MovCampoCategoria from "@/components/movimentacao/MovCampoCategoria";
import MovCampoFormaPagamento from "@/components/movimentacao/MovCampoFormaPagamento";
import MovCampoConta from "@/components/movimentacao/MovCampoConta";
import MovCampoCartao from "./MovCampoCartao";

import { buildTransacoesFromForm } from "@/lib/buildTransacoesFromForm";
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
  TransacaoCreate,
  TransacaoUpdate,
  TipoPagamento,
} from "@/types/transacao";

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

import { FaMoneyBill, FaSpinner, FaSyncAlt } from "react-icons/fa";
import { Info, AlertCircle, Calendar, DollarSign, Tag, FileText } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transacaoEdicao: Transacao | null;
  modoEdicao?: "unica" | "todas_parcelas" | "toda_recorrencia";
  salvar: (dados: TransacaoCreate | TransacaoUpdate) => Promise<void>;
}

const initialForm = {
  contaId: "",
  tipo: "saida" as "entrada" | "saida", // ✅ Começa com "saida" (mais comum)
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
}: Props) {
  const isEdit = Boolean(transacaoEdicao);
  const [form, setForm] = useState<FormState>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => {
      const updated = { ...prev, [key]: value };
      
      // Se mudou o tipo para "entrada" e a forma de pagamento era "cartao", muda para "dinheiro"
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

  // Opções de forma de pagamento conforme o tipo
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

    setForm({
      contaId: transacaoEdicao.contaId ?? "",
      tipo: transacaoEdicao.tipo ?? "entrada",
      categoria: transacaoEdicao.categoria ?? "",
      valor: String(valorFormulario),
      data: transacaoEdicao.data ?? "",
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

    setIsSubmitting(true);
    setError(null);

    try {
      const transacoes = buildTransacoesFromForm({
        form,
        transacaoEdicao,
        contaId: form.contaId || undefined,
      });

      for (const transacao of transacoes) {
        await salvar(transacao);
      }

      onOpenChange(false);
      if (!isEdit) setForm(initialForm);
    } catch (error) {
      console.error("Erro ao salvar a movimentação:", error);
      setError(error instanceof Error ? error.message : "Erro ao salvar movimentação");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && !isEdit) {
      setForm(initialForm);
      setError(null);
    }
    onOpenChange(open);
  };

  // ✅ Atalho de teclado para focar no valor
  useEffect(() => {
    if (open && !isEdit) {
      setTimeout(() => {
        const valorInput = document.querySelector('input[name="valor"]') as HTMLInputElement;
        if (valorInput) valorInput.focus();
      }, 100);
    }
  }, [open, isEdit]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
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

          {/* ✅ SEÇÃO 1: Tipo e Categoria */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
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

          <Separator />

          {/* ✅ SEÇÃO 2: Valor e Data */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
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

          <Separator />

          {/* ✅ SEÇÃO 3: Forma de Pagamento */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <FaMoneyBill className="h-4 w-4" />
              <span>Forma de Pagamento</span>
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

            {/* Info para despesa com cartão */}
            {mostrarCampoCartao && (
              <Alert className="bg-blue-50 border-blue-200">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <p className="font-medium">Despesa com cartão de crédito</p>
                  <p className="text-sm text-blue-700 mt-1">
                    O saldo da sua conta só será impactado quando você pagar a fatura do cartão.
                  </p>
                </AlertDescription>
              </Alert>
            )}
          </div>

          <Separator />

          {/* ✅ SEÇÃO 4: Parcelamento/Recorrência */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
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
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>

                <SelectContent>
                  {(Object.keys(tipoPagamentoIcons) as TipoPagamento[]).map((tipo) => {
                    const Icon = tipoPagamentoIcons[tipo];
                    return (
                      <SelectItem key={tipo} value={tipo}>
                        <div className="flex gap-2 items-center">
                          <Icon size={16} />
                          {tipoPagamentoLabels[tipo]}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>

              {(form.parcelado || form.recorrente) && (
                <div className="flex items-center gap-2 bg-muted rounded-md px-3 py-2">
                  <input
                    type="number"
                    min={2}
                    max={form.parcelado ? 48 : 999}
                    value={form.parcelado ? form.parcelas : form.repeticoes}
                    onChange={(e) => {
                      const num = Math.max(2, Number(e.target.value));
                      form.parcelado ? update("parcelas", num) : update("repeticoes", num);
                    }}
                    className="w-16 border rounded-md p-1 text-center font-medium"
                    disabled={form.parcelado ? bloqueiaCampos.parcelas : bloqueiaCampos.repeticoes}
                  />
                  <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                    {form.parcelado ? "parcelas" : "meses"}
                  </span>
                </div>
              )}
            </div>

            {/* Info do valor parcelado/recorrente */}
            {form.parcelado && form.parcelas > 1 && parseFloat(form.valor) > 0 && (
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Valor de cada parcela:</span>
                  <span className="font-semibold">
                    R$ {(parseFloat(form.valor) / form.parcelas).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
            {form.recorrente && form.repeticoes > 1 && parseFloat(form.valor) > 0 && (
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Valor total ({form.repeticoes} meses):</span>
                  <span className="font-semibold">
                    R$ {valorTotal.toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* ✅ SEÇÃO 5: Descrição (opcional) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span>Observações</span>
              <Badge variant="secondary" className="text-xs">Opcional</Badge>
            </div>
            <MovCamposBasicos form={form} update={updateAny} campo="descricao" />
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-3 pt-4 border-t sticky bottom-0 bg-background">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} className="min-w-[120px]">
              {isSubmitting ? (
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