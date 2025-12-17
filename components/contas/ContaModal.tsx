"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import CampoSelect from "@/components/cartoes/CampoSelect";
import { Conta, CreateContaDTO, UpdateContaDTO } from "@/types/conta";
import { empresaOptions } from "@/utils/cartoes/cartaoOptions";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSalvar: (conta: CreateContaDTO | UpdateContaDTO) => void;
  contaInicial?: Conta;
}

const defaultForm: CreateContaDTO = {
  nome: "",
  tipo: "BANCARIA",
  ativo: true,
  banco: undefined,
  saldoInicial: 0,
  observacoes: "",
};

type FormErrors = {
  nome?: string;
  banco?: string;
  saldoInicial?: string;
};

export default function ContaModal({
  open,
  onSalvar,
  onOpenChange,
  contaInicial,
}: Props) {
  const [form, setForm] = useState<CreateContaDTO>(defaultForm);
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (open) {
      setForm(contaInicial ?? defaultForm);
      setErrors({});
    }
  }, [contaInicial, open]);

  const handleChange = <K extends keyof CreateContaDTO>(
    key: K,
    value: CreateContaDTO[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleDialogChange = (open: boolean) => {
    if (!open) {
      setForm(defaultForm);
    }
    onOpenChange(open);
  };

  const handleCancel = () => {
    setForm(defaultForm);
    onOpenChange(false);
  };

  const handleSubmit = () => {
  onSalvar({
    ...form,
    banco: form.banco || undefined,
    saldoInicial: Number(form.saldoInicial) || 0,
    saldoAtual: Number(form.saldoInicial) || 0,
  });

  setForm(defaultForm);
};

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="space-y-4 max-w-md">
        <DialogHeader>
          <DialogTitle>
            {contaInicial ? "Editar Conta" : "Nova Conta"}
          </DialogTitle>
        </DialogHeader>

        {/* Linha 1 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold mb-1 block">
              Nome da Conta
            </label>
            <Input
              value={form.nome}
              onChange={(e) => handleChange("nome", e.target.value)}
              placeholder="Ex: Conta Corrente"
            />
            {errors.nome && (
              <p className="text-xs text-red-600 mt-1">{errors.nome}</p>
            )}
          </div>

          <div>
            <CampoSelect
              label="Banco Emissor"
              value={form.banco ?? ""}
              onChange={(v) => handleChange("banco", v || undefined)}
              options={empresaOptions}
            />
            {errors.banco && (
              <p className="text-xs text-red-600 mt-1">{errors.banco}</p>
            )}
          </div>
        </div>

        {/* Linha 2 */}
        <div className="grid grid-cols-2 gap-4 items-center">
          <div>
            <label className="text-sm font-semibold mb-1 block">
              Saldo Inicial
            </label>
            <Input
              type="number"
              value={form.saldoInicial}
              onChange={(e) =>
                handleChange("saldoInicial", Number(e.target.value))
              }
            />
            {errors.saldoInicial && (
              <p className="text-xs text-red-600 mt-1">
                {errors.saldoInicial}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <p className="text-sm font-medium">Ativo</p>
            <Switch
              checked={form.ativo ?? true}
              onCheckedChange={(v) => handleChange("ativo", v)}
            />
          </div>
        </div>

        {/* Linha 3 */}
        <div>
          <label className="text-sm font-semibold mb-1 block">
            Observações
          </label>
          <textarea
            value={form.observacoes}
            onChange={(e) => handleChange("observacoes", e.target.value)}
            className="w-full border rounded-md p-2 text-sm"
            placeholder="Observações adicionais..."
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>
            {contaInicial ? "Salvar" : "Adicionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}