"use client";

import { useState, useEffect } from "react";

import MovCamposBasicos from "@/components/movimentacao/MovCamposBasicos";
import MovCampoCategoria from "@/components/movimentacao/MovCampoCategoria";
import MovCampoFormaPagamento from "@/components/movimentacao/MovCampoFormaPagamento";
import { buildTransacoesFromForm } from "@/lib/movimentacoes/buildTransacoesFromForm";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

import { Transacao } from "@/types/transacao";

import { FaDonate, FaSyncAlt, FaSpinner } from "react-icons/fa";

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

export default function FormMovimentacaoModal({
  open,
  onOpenChange,
  contaId,
  transacaoEdicao,
  modoEdicao,
  salvar,
}: Props) {

  const isEdit = !!transacaoEdicao;

  const initialForm = {
    tipo: "entrada" as "entrada" | "saida",
    categoria: "",
    valor: "",
    data: "",
    descricao: "",
    formaPagamento: "dinheiro" as "dinheiro" | "pix" | "cartao",
    cartaoId: "",
    tipoPagamento: "avista" as "avista" | "parcelado" | "recorrente",
    parcelas: 1,
    repeticoes: 1,
  };

  const tipoPagamentoIcons = {
    avista: FaDonate,
    parcelado: FaSpinner,
    recorrente: FaSyncAlt,
  };

  const [form, setForm] = useState(initialForm);

  function update<K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K]
  ) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  const updateAny = (k: string, v: any) => {
    update(k as keyof typeof form, v);
  };

  useEffect(() => {
    if (!transacaoEdicao) {
      setForm(initialForm);
      return;
    }

    setForm({
      tipo: transacaoEdicao.tipo,
      categoria: transacaoEdicao.categoria ?? "",
      valor: String(transacaoEdicao.valor),
      data: transacaoEdicao.data,
      descricao: transacaoEdicao.descricao ?? "",
      formaPagamento:
        transacaoEdicao.formaPagamento === "dinheiro" ||
          transacaoEdicao.formaPagamento === "pix" ||
          transacaoEdicao.formaPagamento === "cartao"
          ? transacaoEdicao.formaPagamento
          : "dinheiro",
      cartaoId: transacaoEdicao.cartaoId ? String(transacaoEdicao.cartaoId) : "",
      tipoPagamento: transacaoEdicao.parcelado
        ? "parcelado"
        : transacaoEdicao.recorrente
          ? "recorrente"
          : "avista",
      parcelas: transacaoEdicao.parcelas ?? 1,
      repeticoes: transacaoEdicao.repeticoes ?? 1,
    });
  }, [transacaoEdicao, open]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    try {
      const transacoes = buildTransacoesFromForm({
        form,
        transacaoEdicao,
        contaId,
        modoEdicao,
      });

      for (const transacao of transacoes) {
        await salvar(transacao);
      }

      onOpenChange(false);

      if (!transacaoEdicao) {
        setForm(initialForm);
      }
    } catch (error) {
      console.error("Erro ao salvar a movimentação:", error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar Movimentação" : "Nova Movimentação"}
          </DialogTitle>
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

          {/* Linha 3: Forma de Pagamento (+ Cartão se aplicável) */}
          <div className="grid grid-cols-2 gap-4">
            <MovCampoFormaPagamento form={form} update={updateAny} />
          </div>

          {/* Linha 4: Tipo de Pagamento */}
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <Label>Tipo de Pagamento</Label>
              <Select
                value={form.tipoPagamento}
                onValueChange={(v) => update("tipoPagamento", v as typeof form.tipoPagamento)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {["avista", "parcelado", "recorrente"].map((tipo) => {
                    const IconComp = tipoPagamentoIcons[tipo as keyof typeof tipoPagamentoIcons];
                    const label = tipo === "avista" ? "À Vista" : tipo === "parcelado" ? "Parcelado" : "Recorrente";
                    return (
                      <SelectItem key={tipo} value={tipo} className="flex items-center gap-2">
                        <IconComp size={16} />
                        {label}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Parcelas ou Repetições */}
            {(form.tipoPagamento === "parcelado" || form.tipoPagamento === "recorrente") && (
              <div className="w-32">
                <Label>{form.tipoPagamento === "parcelado" ? "Parcelas" : "Repetições"}</Label>
                <input
                  type="number"
                  min={1}
                  value={form.tipoPagamento === "parcelado" ? form.parcelas : form.repeticoes}
                  onChange={(e) => {
                    if (form.tipoPagamento === "parcelado") {
                      update("parcelas", Number(e.target.value));
                    } else {
                      update("repeticoes", Number(e.target.value));
                    }
                  }}
                  className="w-full border rounded-md p-2"
                />
              </div>
            )}
          </div>

          {/* Linha 5: Descrição */}
          <div>
            <MovCamposBasicos form={form} update={updateAny} campo="descricao" />
          </div>

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
            <Button type="submit">
              {isEdit ? "Salvar Alterações" : "Adicionar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}