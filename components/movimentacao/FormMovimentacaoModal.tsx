"use client";

import { useState, useEffect, useMemo } from "react";

import MovCamposBasicos from "@/components/movimentacao/MovCamposBasicos";
import MovCampoCategoria from "@/components/movimentacao/MovCampoCategoria";
import MovCampoFormaPagamento from "@/components/movimentacao/MovCampoFormaPagamento";
import MovCampoConta from "@/components/movimentacao/MovCampoConta";

import { buildTransacoesFromForm } from "@/lib/buildTransacoesFromForm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transacaoEdicao: Transacao | null;
  modoEdicao?: "unica" | "todas_parcelas" | "toda_recorrencia";
  salvar: (dados: TransacaoCreate | TransacaoUpdate) => Promise<void>;
}

const initialForm = {
  contaId: "",
  tipo: "entrada" as "entrada" | "saida",
  categoria: "",
  valor: "",
  data: "",
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

export default function FormMovimentacaoModal({
  open,
  onOpenChange,
  transacaoEdicao,
  modoEdicao,
  salvar,
}: Props) {
  const isEdit = Boolean(transacaoEdicao);
  const [form, setForm] = useState<FormState>(initialForm);

  const update = <K extends keyof FormState>(
    key: K,
    value: FormState[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateAny = (key: string, value: any) => {
    update(key as keyof FormState, value);
  };

  const tipoPagamento = useMemo<TipoPagamento>(() => {
    if (form.parcelado) return "parcelado";
    if (form.recorrente) return "recorrente";
    return "avista";
  }, [form.parcelado, form.recorrente]);

  // Flags de bloqueio de campos ao editar todas parcelas / recorrência
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

  useEffect(() => {
    if (!transacaoEdicao) {
      setForm(initialForm);
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
  }, [transacaoEdicao, open]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!form.contaId) {
      alert("Selecione uma conta antes de salvar.");
      return;
    }

    try {
      const transacoes = buildTransacoesFromForm({
        form,
        transacaoEdicao,
        contaId: form.contaId,
      });

      for (const transacao of transacoes) {
        await salvar(transacao);
      }

      onOpenChange(false);
      if (!isEdit) setForm(initialForm);
    } catch (error) {
      console.error("Erro ao salvar a movimentação:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar Movimentação" : "Nova Movimentação"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <MovCamposBasicos
              form={form}
              update={updateAny}
              campo="tipo"
              disabled={bloqueiaCampos.tipo}
            />
            <MovCampoCategoria form={form} update={updateAny} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <MovCamposBasicos
              form={form}
              update={updateAny}
              campo="data"
              disabled={bloqueiaCampos.data}
            />
            <MovCamposBasicos form={form} update={updateAny} campo="valor" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <MovCampoFormaPagamento
              form={form}
              update={updateAny}
            />
            <MovCampoConta form={form} update={updateAny} />
          </div>

          <div>
            <label className="block mb-1">Tipo de Pagamento</label>
            <div className="flex gap-4 items-center">
              <Select
                value={tipoPagamento}
                onValueChange={(v: TipoPagamento) => {
                  update("parcelado", v === "parcelado");
                  update("recorrente", v === "recorrente");
                }}
                disabled={bloqueiaCampos.parcelas || bloqueiaCampos.repeticoes}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>

                <SelectContent>
                  {(Object.keys(tipoPagamentoIcons) as TipoPagamento[]).map(
                    (tipo) => {
                      const Icon = tipoPagamentoIcons[tipo];
                      return (
                        <SelectItem key={tipo} value={tipo}>
                          <div className="flex gap-2 items-center">
                            <Icon size={16} />
                            {tipo === "avista"
                              ? "À vista"
                              : tipo === "parcelado"
                                ? "Parcelado"
                                : "Recorrente"}
                          </div>
                        </SelectItem>
                      );
                    }
                  )}
                </SelectContent>
              </Select>

              {(form.parcelado || form.recorrente) && (
                <input
                  type="number"
                  min={1}
                  value={form.parcelado ? form.parcelas : form.repeticoes}
                  onChange={(e) => {
                    const num = Number(e.target.value);
                    form.parcelado
                      ? update("parcelas", num)
                      : update("repeticoes", num);
                  }}
                  className="w-32 border rounded-md p-2"
                  disabled={
                    form.parcelado
                      ? bloqueiaCampos.parcelas
                      : bloqueiaCampos.repeticoes
                  }
                />
              )}
            </div>
          </div>

          <MovCamposBasicos
            form={form}
            update={updateAny}
            campo="descricao"
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit">
              {isEdit ? "Salvar Alterações" : "Adicionar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
