"use client";

import { useState, useEffect } from "react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import { Transacao } from "@/types/transacao";

import MovCamposBasicos from "@/components/movimentacao/MovCamposBasicos";
import MovCampoCategoria from "@/components/movimentacao/MovCampoCategoria";
import MovCampoFormaPagamento from "@/components/movimentacao/MovCampoFormaPagamento";
import MovCampoRecorrencia from "@/components/movimentacao/MovCampoRecorrencia";
import MovCampoParcelado from "@/components/movimentacao/MovCampoParcelado";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transacaoEdicao: Transacao | null;
  salvar: (dados: Transacao) => Promise<void>;
}

export default function FormMovimentacaoModal({
  open,
  onOpenChange,
  transacaoEdicao,
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
    recorrente: false,
    repeticoes: 1,
    parcelado: false,
    parcelas: 1,
  };

  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    if (!transacaoEdicao) {
      setForm(initialForm);
      return;
    }

    setForm({
      tipo: transacaoEdicao.tipo,
      categoria: transacaoEdicao.categoria,
      valor: String(transacaoEdicao.valor),
      data: transacaoEdicao.data,
      descricao: transacaoEdicao.descricao ?? "",
      formaPagamento: transacaoEdicao.formaPagamento,
      cartaoId: transacaoEdicao.cartaoId ? String(transacaoEdicao.cartaoId) : "",
      recorrente: transacaoEdicao.recorrente ?? false,
      repeticoes: transacaoEdicao.repeticoes ?? 1,
      parcelado: transacaoEdicao.parcelado ?? false,
      parcelas: transacaoEdicao.parcelas ?? 1,
    });
  }, [transacaoEdicao, open]);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  const updateAny = (k: string, v: any) => {
    update(k as keyof typeof form, v);
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const dados: Transacao = {
      id: transacaoEdicao?.id ?? 0,
      tipo: form.tipo,
      categoria: form.categoria,
      valor: Number(form.valor),
      data: form.data,
      descricao: form.descricao,
      formaPagamento: form.formaPagamento,
      cartaoId: form.formaPagamento === "cartao" ? Number(form.cartaoId) : null,
      recorrente: form.recorrente,
      repeticoes: form.recorrente ? form.repeticoes : 1,
      parcelado: form.parcelado,
      parcelas: form.parcelas ? form.parcelas : 1,
    };

    await salvar(dados);

    onOpenChange(false);

    if (!isEdit) {
      setForm(initialForm);
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

          {/* Linha 4: Recorrente + Repetições */}
          <div className="grid grid-cols-2 gap-4">
            <MovCampoRecorrencia 
              form={form} 
              update={updateAny} 
              disabled={form.parcelado}
            />
          </div>

          {/* Linha 5: Parcelado + Número de Parcelas */}
          <div className="grid grid-cols-2 gap-4">
            <MovCampoParcelado 
              form={form} 
              update={updateAny} 
              disabled={form.recorrente} 
            />
          </div>

          {/* Linha 6: Descrição */}
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