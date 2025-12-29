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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import CampoSelect from "@/components/cartoes/CampoSelect";
import { Conta, CreateContaDTO, UpdateContaDTO } from "@/types/conta";
import { empresaOptions } from "@/utils/cartaoOptions";
import { AlertCircle } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSalvar: (conta: CreateContaDTO | UpdateContaDTO) => void;
  contaInicial?: Conta;
}

const defaultForm: Omit<CreateContaDTO, 'tipo'> = {
  nome: "",
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
  const [form, setForm] = useState<Omit<CreateContaDTO, 'tipo'>>(defaultForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [valorFormatado, setValorFormatado] = useState<string>("0,00");

  useEffect(() => {
    if (open) {
      const dadosIniciais = contaInicial ?? defaultForm;
      setForm(dadosIniciais);
      setValorFormatado(formatarParaInput(dadosIniciais.saldoInicial || 0));
      setErrors({});
    }
  }, [contaInicial, open]);

  // Formata número para exibição no input (1234.56 -> "1.234,56")
  const formatarParaInput = (valor: number): string => {
    return valor.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Converte string formatada para número (1.234,56 -> 1234.56)
  const parseValorMonetario = (valor: string): number => {
    const numeroLimpo = valor.replace(/\./g, '').replace(',', '.');
    return parseFloat(numeroLimpo) || 0;
  };

  const handleChange = <K extends keyof Omit<CreateContaDTO, 'tipo'>>(
    key: K,
    value: (typeof form)[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    // Limpa erro do campo quando usuário começa a digitar
    if (errors[key as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    // Remove tudo exceto números e vírgula
    const apenasNumeros = input.replace(/[^\d,]/g, '');
    
    // Permite apenas uma vírgula
    const partesVirgula = apenasNumeros.split(',');
    let valorLimpo = partesVirgula[0];
    
    if (partesVirgula.length > 1) {
      // Limita casas decimais a 2
      valorLimpo += ',' + partesVirgula[1].slice(0, 2);
    }
    
    setValorFormatado(valorLimpo);
    
    // Atualiza o valor numérico no form
    const valorNumerico = parseValorMonetario(valorLimpo);
    handleChange("saldoInicial", valorNumerico);
  };

  const handleValorBlur = () => {
    // Formata adequadamente quando o campo perde o foco
    const valorNumerico = parseValorMonetario(valorFormatado);
    setValorFormatado(formatarParaInput(valorNumerico));
  };

  const validarFormulario = (): boolean => {
    const novosErros: FormErrors = {};

    if (!form.nome || form.nome.trim() === "") {
      novosErros.nome = "Nome da conta é obrigatório";
    }

    if (form.saldoInicial === undefined || form.saldoInicial === null) {
      novosErros.saldoInicial = "Informe o saldo inicial";
    }

    setErrors(novosErros);
    return Object.keys(novosErros).length === 0;
  };

  const handleDialogChange = (open: boolean) => {
    if (!open) {
      setForm(defaultForm);
      setValorFormatado("0,00");
      setErrors({});
    }
    onOpenChange(open);
  };

  const handleCancel = () => {
    setForm(defaultForm);
    setValorFormatado("0,00");
    setErrors({});
    onOpenChange(false);
  };

  const handleSubmit = () => {
    if (!validarFormulario()) {
      return;
    }

    onSalvar({
      ...form,
      banco: form.banco || undefined,
      saldoInicial: Number(form.saldoInicial) || 0,
      saldoAtual: Number(form.saldoInicial) || 0,
    } as CreateContaDTO | UpdateContaDTO);

    setForm(defaultForm);
    setValorFormatado("0,00");
    setErrors({});
  };

  const temErros = Object.keys(errors).length > 0;

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {contaInicial ? "Editar Conta" : "Nova Conta"}
          </DialogTitle>
          <p className="text-sm text-gray-500 mt-1">
            Gerencie suas contas bancárias e carteiras digitais
          </p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Nome da Conta */}
          <div className="space-y-2">
            <Label htmlFor="nome" className="flex items-center gap-1">
              Nome da Conta
              <span className="text-red-500">*</span>
            </Label>
            <Input
              id="nome"
              value={form.nome}
              onChange={(e) => handleChange("nome", e.target.value)}
              placeholder="Ex: Conta Corrente Nubank, Carteira PicPay"
              className={errors.nome ? "border-red-500" : ""}
            />
            {errors.nome && (
              <div className="flex items-center gap-1 text-xs text-red-600">
                <AlertCircle size={12} />
                <span>{errors.nome}</span>
              </div>
            )}
          </div>

          {/* Banco */}
          <div className="space-y-2">
            <CampoSelect
              label="Banco/Instituição"
              value={form.banco ?? ""}
              onChange={(v) => handleChange("banco", v || undefined)}
              options={empresaOptions}
            />
            {errors.banco && (
              <div className="flex items-center gap-1 text-xs text-red-600">
                <AlertCircle size={12} />
                <span>{errors.banco}</span>
              </div>
            )}
            <p className="text-xs text-gray-500">
              Selecione a instituição financeira desta conta
            </p>
          </div>

          {/* Saldo Inicial e Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="saldo" className="flex items-center gap-1">
                Saldo Inicial
                <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                  R$
                </span>
                <Input
                  id="saldo"
                  value={valorFormatado}
                  onChange={handleValorChange}
                  onBlur={handleValorBlur}
                  placeholder="0,00"
                  className={`pl-10 ${errors.saldoInicial ? "border-red-500" : ""}`}
                />
              </div>
              {errors.saldoInicial && (
                <div className="flex items-center gap-1 text-xs text-red-600">
                  <AlertCircle size={12} />
                  <span>{errors.saldoInicial}</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ativo">Status</Label>
              <div className="flex items-center gap-3 h-10 px-3 border rounded-md bg-gray-50">
                <span className="text-sm font-medium flex-1">
                  {form.ativo ? "Ativa" : "Inativa"}
                </span>
                <Switch
                  id="ativo"
                  checked={form.ativo ?? true}
                  onCheckedChange={(v) => handleChange("ativo", v)}
                />
              </div>
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="observacoes">
              Observações
              <span className="text-gray-400 text-xs ml-1">(opcional)</span>
            </Label>
            <Textarea
              id="observacoes"
              value={form.observacoes}
              onChange={(e) => handleChange("observacoes", e.target.value)}
              placeholder="Informações adicionais sobre a conta..."
              className="resize-none h-20"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={temErros && Object.values(errors).some(e => e)}
          >
            {contaInicial ? "Salvar Alterações" : "Adicionar Conta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}