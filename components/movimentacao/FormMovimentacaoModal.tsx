"use client";

import { useState, useEffect } from "react";

import MovCamposBasicos from "@/components/movimentacao/MovCamposBasicos";
import MovCampoCategoria from "@/components/movimentacao/MovCampoCategoria";
import MovCampoFormaPagamento from "@/components/movimentacao/MovCampoFormaPagamento";
import MovCampoConta from "@/components/movimentacao/MovCampoConta";

import { buildTransacoesFromForm } from "@/lib/movimentacoes/buildTransacoesFromForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import { Transacao, TipoPagamento } from "@/types/transacao";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { FaMoneyBill, FaSpinner, FaSyncAlt } from "react-icons/fa";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contaId: string;
  transacaoEdicao: Transacao | null;
  todasParcelas?: Transacao[];
  todasRecorrencias?: Transacao[];
  modoEdicao?: "unica" | "todas_parcelas" | "toda_recorrencia";
  salvar: (dados: Transacao) => Promise<void>;
}

// Ícones para cada tipo de pagamento
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
  const isEdit = !!transacaoEdicao;

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

  const [form, setForm] = useState(initialForm);

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const updateAny = (k: string, v: any) => update(k as keyof typeof form, v);

  // Deriva o tipo de pagamento dinamicamente
  const getTipoPagamento = (): TipoPagamento => {
    if (form.parcelado) return "parcelado";
    if (form.recorrente) return "recorrente";
    return "avista";
  };

  useEffect(() => {
    if (!transacaoEdicao) {
      setForm(initialForm);
      return;
    }

    setForm({
      contaId: transacaoEdicao.contaId ?? "",
      tipo: transacaoEdicao.tipo ?? "entrada",
      categoria: transacaoEdicao.categoria ?? "",
      valor: String(transacaoEdicao.valor ?? ""),
      data: transacaoEdicao.data ?? "",
      descricao: transacaoEdicao.descricao ?? "",
      formaPagamento: ["dinheiro", "pix", "cartao"].includes(transacaoEdicao.formaPagamento ?? "")
        ? (transacaoEdicao.formaPagamento as "dinheiro" | "pix" | "cartao")
        : "dinheiro",
      cartaoId: transacaoEdicao.cartaoId != null ? String(transacaoEdicao.cartaoId) : "",
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
        form: { ...form },
        transacaoEdicao,
        contaId: form.contaId,
        modoEdicao,
      });

      for (const transacao of transacoes) {
        await salvar(transacao);
      }

      onOpenChange(false);
      if (!transacaoEdicao) setForm(initialForm);
    } catch (error) {
      console.error("Erro ao salvar a movimentação:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Movimentação" : "Nova Movimentação"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Linha 1: Tipo + Categoria */}
          <div className="grid grid-cols-2 gap-4">
            <MovCamposBasicos form={form} update={updateAny} campo="tipo" />
            <MovCampoCategoria form={form} update={updateAny} />
          </div>

          {/* Linha 2: Data + Valor */}
          <div className="grid grid-cols-2 gap-4">
            <MovCamposBasicos form={form} update={updateAny} campo="data" />
            <MovCamposBasicos form={form} update={updateAny} campo="valor" />
          </div>

          {/* Linha 3: Forma de Pagamento + Conta */}
          <div className="grid grid-cols-2 gap-4">
            <MovCampoFormaPagamento form={form} update={updateAny} />
            <MovCampoConta form={form} update={updateAny} />
          </div>

          {/* Linha 4: Tipo de Pagamento (Parcelas/Repetições) */}
          <div>
            <label className="block mb-1">Tipo de Pagamento</label>
            <div className="flex gap-4 items-center">
              <Select
                value={getTipoPagamento()}
                onValueChange={(v: TipoPagamento) => {
                  update("parcelado", v === "parcelado");
                  update("recorrente", v === "recorrente");
                  if (v === "avista") {
                    update("parcelado", false);
                    update("recorrente", false);
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>

                <SelectContent>
                  {(["avista", "parcelado", "recorrente"] as TipoPagamento[]).map((tipo) => {
                    const Icon = tipoPagamentoIcons[tipo];
                    const label = tipo === "avista" ? "À vista" : tipo === "parcelado" ? "Parcelado" : "Recorrente";

                    return (
                      <SelectItem key={tipo} value={tipo} className="flex items-center gap-2">
                        <Icon size={16} />
                        {label}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>

              {(form.parcelado || form.recorrente) && (
                <input
                  type="number"
                  min={1}
                  value={form.parcelado ? form.parcelas : form.repeticoes}
                  onChange={(e) => {
                    const num = Number(e.target.value);
                    if (form.parcelado) update("parcelas", num);
                    else update("repeticoes", num);
                  }}
                  className="w-32 border rounded-md p-2"
                />
              )}
            </div>
          </div>

          {/* Linha 5: Descrição */}
          <MovCamposBasicos form={form} update={updateAny} campo="descricao" />

          {/* Botões */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                if (!isEdit) setForm(initialForm);
              }}
            >
              Cancelar
            </Button>
            <Button type="submit">{isEdit ? "Salvar Alterações" : "Adicionar"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}