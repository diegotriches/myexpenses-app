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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import CampoSelect from "@/components/cartoes/CampoSelect";
import { Conta, CreateContaDTO, UpdateContaDTO } from "@/types/conta";
import { empresaOptions } from "@/utils/cartaoOptions";
import { AlertCircle, Info, Lock } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSalvar: (conta: CreateContaDTO | UpdateContaDTO) => void;
  contaInicial?: Conta;
}

const defaultForm: CreateContaDTO = {
  nome: "",
  ativo: true,
  banco: "",
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
  // ✅ NOVO: Detecta se é edição
  const isEdit = Boolean(contaInicial);

  const [form, setForm] = useState<CreateContaDTO>(defaultForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [valorFormatado, setValorFormatado] = useState<string>("0,00");

  useEffect(() => {
    if (open) {
      const dadosIniciais = contaInicial ?? defaultForm;
      setForm({
        ...dadosIniciais,
        banco: dadosIniciais.banco || "",
      });
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

  const handleChange = <K extends keyof CreateContaDTO>(
    key: K,
    value: CreateContaDTO[K]
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

    // ✅ CORRIGIDO: Só valida saldo inicial na criação
    if (!isEdit && (form.saldoInicial === undefined || form.saldoInicial === null)) {
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

    // ✅ CORRIGIDO: Prepara dados baseado no modo (criação ou edição)
    let dadosParaSalvar: CreateContaDTO | UpdateContaDTO;

    if (isEdit) {
      // ✅ EDIÇÃO: NÃO envia saldoInicial
      dadosParaSalvar = {
        nome: form.nome.trim(),
        ativo: form.ativo ?? true,
        observacoes: form.observacoes?.trim() || "",
        banco: form.banco && form.banco.trim() !== "" ? form.banco.trim() : undefined,
      };
    } else {
      // ✅ CRIAÇÃO: Envia saldoInicial
      dadosParaSalvar = {
        nome: form.nome.trim(),
        ativo: form.ativo ?? true,
        saldoInicial: Number(form.saldoInicial) || 0,
        observacoes: form.observacoes?.trim() || "",
        banco: form.banco && form.banco.trim() !== "" ? form.banco.trim() : undefined,
      };
    }

    onSalvar(dadosParaSalvar);

    setForm(defaultForm);
    setValorFormatado("0,00");
    setErrors({});
  };

  const temErros = Object.keys(errors).length > 0;

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="max-w-lg dark:bg-gray-900 dark:border-gray-800">
        <DialogHeader>
          <DialogTitle className="text-xl text-gray-900 dark:text-white">
            {isEdit ? "Editar Conta" : "Nova Conta"}
          </DialogTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Gerencie suas contas bancárias e carteiras digitais
          </p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* ✅ NOVO: Alert Informativo - Apenas na edição */}
          {isEdit && (
            <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertTitle className="text-blue-900 dark:text-blue-100">
                Saldo Inicial não pode ser alterado
              </AlertTitle>
              <AlertDescription className="text-blue-800 dark:text-blue-300 text-sm">
                Para manter a integridade do histórico financeiro, o saldo
                inicial é imutável após a criação da conta. Use o botão{" "}
                <strong>"Ajustar Saldo"</strong> no card da conta para fazer
                correções de saldo.
              </AlertDescription>
            </Alert>
          )}

          {/* Nome da Conta */}
          <div className="space-y-2">
            <Label htmlFor="nome" className="flex items-center gap-1 text-gray-700 dark:text-gray-300">
              Nome da Conta
              <span className="text-red-500">*</span>
            </Label>
            <Input
              id="nome"
              value={form.nome}
              onChange={(e) => handleChange("nome", e.target.value)}
              placeholder="Ex: Conta Corrente Nubank, Carteira PicPay"
              className={errors.nome ? "border-red-500 dark:border-red-500" : "dark:bg-gray-800 dark:border-gray-700 dark:text-white"}
            />
            {errors.nome && (
              <div className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
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
              onChange={(v) => handleChange("banco", v || "")}
              options={empresaOptions}
            />
            {errors.banco && (
              <div className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                <AlertCircle size={12} />
                <span>{errors.banco}</span>
              </div>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Selecione a instituição financeira desta conta
            </p>
          </div>

          {/* Saldo Inicial e Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="saldo" className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                Saldo Inicial
                {!isEdit && <span className="text-red-500">*</span>}
                
                {/* ✅ NOVO: Ícone de cadeado na edição */}
                {isEdit && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Lock className="h-3 w-3 text-gray-400 dark:text-gray-600" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Este campo não pode ser editado</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm">
                  R$
                </span>
                <Input
                  id="saldo"
                  value={valorFormatado}
                  onChange={handleValorChange}
                  onBlur={handleValorBlur}
                  placeholder="0,00"
                  disabled={isEdit} // ✅ NOVO: Desabilita na edição
                  className={`pl-10 ${
                    errors.saldoInicial 
                      ? "border-red-500 dark:border-red-500" 
                      : isEdit
                      ? "bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-60"
                      : "dark:bg-gray-800 dark:border-gray-700"
                  } dark:text-white`}
                />
              </div>
              {errors.saldoInicial && (
                <div className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                  <AlertCircle size={12} />
                  <span>{errors.saldoInicial}</span>
                </div>
              )}
              {/* ✅ NOVO: Texto explicativo apenas na criação */}
              {!isEdit && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Informe o saldo atual da conta neste momento
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ativo" className="text-gray-700 dark:text-gray-300">Status</Label>
              <div className="flex items-center gap-3 h-10 px-3 border rounded-md bg-gray-50 dark:bg-gray-900 dark:border-gray-700">
                <span className="text-sm font-medium flex-1 text-gray-900 dark:text-gray-100">
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
            <Label htmlFor="observacoes" className="text-gray-700 dark:text-gray-300">
              Observações
              <span className="text-gray-400 dark:text-gray-500 text-xs ml-1">(opcional)</span>
            </Label>
            <Textarea
              id="observacoes"
              value={form.observacoes}
              onChange={(e) => handleChange("observacoes", e.target.value)}
              placeholder="Informações adicionais sobre a conta..."
              className="resize-none h-20 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button 
            variant="outline" 
            onClick={handleCancel}
            className="dark:border-gray-700 dark:hover:bg-gray-800"
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={temErros && Object.values(errors).some(e => e)}
            className="bg-blue-700 hover:bg-blue-900"
          >
            {isEdit ? "Salvar Alterações" : "Adicionar Conta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}