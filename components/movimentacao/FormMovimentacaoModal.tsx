"use client";

import { useState, useEffect } from "react";

import MovCamposBasicos from "@/components/movimentacao/MovCamposBasicos";
import MovCampoCategoria from "@/components/movimentacao/MovCampoCategoria";
import MovCampoFormaPagamento from "@/components/movimentacao/MovCampoFormaPagamento";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

import { Transacao } from "@/types/transacao";
import { v4 as uuidv4 } from "uuid";

import { FaDonate, FaSyncAlt, FaSpinner } from "react-icons/fa";

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
      tipoPagamento: transacaoEdicao.parcelado
        ? "parcelado"
        : transacaoEdicao.recorrente
          ? "recorrente"
          : "avista",
      parcelas: transacaoEdicao.parcelas ?? 1,
      repeticoes: transacaoEdicao.repeticoes ?? 1,
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

    // 🔹 À vista (comportamento atual)
    if (form.tipoPagamento === "avista") {
      const dados: Transacao = {
        id: transacaoEdicao?.id ?? 0,
        tipo: form.tipo,
        categoria: form.categoria,
        valor: Number(form.valor),
        data: form.data,
        descricao: form.descricao,
        formaPagamento: form.formaPagamento,
        cartaoId: form.formaPagamento === "cartao" ? Number(form.cartaoId) : null,
        parcelado: false,
        recorrente: false,
      };

      await salvar(dados);
    }

    if (form.tipoPagamento === "parcelado") {
      const parcelamentoId = uuidv4();
      const totalParcelas = form.parcelas;
      const dataBase = new Date(form.data);

      for (let i = 0; i < totalParcelas; i++) {
        const dataParcela = new Date(dataBase);
        dataParcela.setMonth(dataBase.getMonth() + i);

        const dados: Transacao = {
          id: 0,
          tipo: form.tipo,
          categoria: form.categoria,
          valor: Number(form.valor),
          data: dataParcela.toISOString().split("T")[0],
          descricao: form.descricao
            ? `${form.descricao} (${i + 1}/${totalParcelas})`
            : `Parcela ${i + 1}/${totalParcelas}`,
          formaPagamento: form.formaPagamento,
          cartaoId: form.formaPagamento === "cartao" ? Number(form.cartaoId) : null,

          parcelado: true,
          parcelas: totalParcelas,
          parcelamentoId,
          parcelaAtual: i + 1,
          totalParcelas,
        };

        await salvar(dados);
      }
    }

    if (form.tipoPagamento === "recorrente") {
      const recorrenciaId = uuidv4();
      const total = form.repeticoes;
      const dataBase = new Date(form.data);

      for (let i = 0; i < total; i++) {
        const dataMov = new Date(dataBase);
        dataMov.setMonth(dataBase.getMonth() + i);

        const dados: Transacao = {
          id: 0,
          tipo: form.tipo,
          categoria: form.categoria,
          valor: Number(form.valor),
          data: dataMov.toISOString().split("T")[0],
          descricao: form.descricao,
          formaPagamento: form.formaPagamento,
          cartaoId: form.formaPagamento === "cartao" ? Number(form.cartaoId) : null,

          recorrente: true,
          recorrenciaId,
        };

        await salvar(dados);
      }
    }

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

          {/* Linha 4: Tipo de Pagamento (À Vista, Parcelado, Recorrente) */}
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
