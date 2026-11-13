"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import BancoPickerModal from "@/components/contas/BancoPickerModal";
import { Conta, CreateContaDTO, UpdateContaDTO } from "@/types/conta";
import { empresaOptions } from "@/utils/cartaoOptions";
import { AlertCircle, Info, Lock, Building2 } from "lucide-react";
import Image from "next/image";

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
  saldoInicial?: string;
};

export default function ContaModal({
  open,
  onSalvar,
  onOpenChange,
  contaInicial,
}: Props) {
  const isEdit = Boolean(contaInicial);

  const [form, setForm] = useState<CreateContaDTO>(defaultForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [bancoPickerOpen, setBancoPickerOpen] = useState(false);
  
  // ✅ Input calculadora - armazena os dígitos digitados
  const [digitosValor, setDigitosValor] = useState<string>("");

  // Ajusta o estado durante o render quando as dependências mudam (inclusive na montagem)
  const [depsAnteriores, setDepsAnteriores] = useState<readonly unknown[] | null>(null);
  const depsAtuais: readonly unknown[] = [contaInicial, open, isEdit];
  if (!depsAnteriores || depsAtuais.some((d, i) => !Object.is(d, depsAnteriores[i]))) {
    setDepsAnteriores(depsAtuais);
    if (open) {
      const dadosIniciais = contaInicial ?? defaultForm;
      setForm({
        ...dadosIniciais,
        banco: dadosIniciais.banco || "",
      });
      
      // ✅ Inicializa input calculadora
      if (isEdit) {
        setDigitosValor(""); // Não permite editar saldo
      } else {
        const valorCentavos = Math.round((dadosIniciais.saldoInicial || 0) * 100);
        setDigitosValor(valorCentavos > 0 ? String(valorCentavos) : "");
      }
      
      setErrors({});
    }
  }

  // ✅ Formata valor para exibição (123 → "1,23" | 12345 → "123,45")
  const formatarValorCalculadora = (digitos: string): string => {
    if (!digitos || digitos === "0") return "0,00";
    
    const numero = digitos.padStart(3, "0"); // Garante pelo menos 3 dígitos
    const inteiros = numero.slice(0, -2) || "0";
    const decimais = numero.slice(-2);
    
    // Formata inteiros com separador de milhar
    const inteirosFormatados = parseInt(inteiros).toLocaleString("pt-BR");
    
    return `${inteirosFormatados},${decimais}`;
  };

  // ✅ Handler do input calculadora
  const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value.replace(/\D/g, ""); // Remove não-dígitos
    
    if (input.length <= 15) { // Limita a 999.999.999.999,99
      setDigitosValor(input);
      
      // Converte para número decimal (centavos → reais)
      const valorCentavos = parseInt(input || "0");
      const valorReais = valorCentavos / 100;
      
      handleChange("saldoInicial", valorReais);
      
      // Limpa erro ao digitar
      if (errors.saldoInicial) {
        setErrors((prev) => ({ ...prev, saldoInicial: undefined }));
      }
    }
  };

  const handleChange = <K extends keyof CreateContaDTO>(
    key: K,
    value: CreateContaDTO[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    
    // Limpa erro do campo
    if (errors[key as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  const validarFormulario = (): boolean => {
    const novosErros: FormErrors = {};

    if (!form.nome || form.nome.trim() === "") {
      novosErros.nome = "Nome da conta é obrigatório";
    }

    // Valida saldo inicial apenas na criação
    if (!isEdit && (form.saldoInicial === undefined || form.saldoInicial === null)) {
      novosErros.saldoInicial = "Informe o saldo inicial";
    }

    setErrors(novosErros);
    return Object.keys(novosErros).length === 0;
  };

  const handleDialogChange = (open: boolean) => {
    if (!open) {
      setForm(defaultForm);
      setDigitosValor("");
      setErrors({});
    }
    onOpenChange(open);
  };

  const handleCancel = () => {
    setForm(defaultForm);
    setDigitosValor("");
    setErrors({});
    onOpenChange(false);
  };

  const handleSubmit = () => {
    if (!validarFormulario()) {
      return;
    }

    let dadosParaSalvar: CreateContaDTO | UpdateContaDTO;

    if (isEdit) {
      // Edição: NÃO envia saldoInicial
      dadosParaSalvar = {
        nome: form.nome.trim(),
        ativo: form.ativo ?? true,
        observacoes: form.observacoes?.trim() || "",
        banco: form.banco && form.banco.trim() !== "" ? form.banco.trim() : undefined,
      };
    } else {
      // Criação: Envia saldoInicial
      dadosParaSalvar = {
        nome: form.nome.trim(),
        ativo: true, // Sempre ativo na criação
        saldoInicial: Number(form.saldoInicial) || 0,
        observacoes: form.observacoes?.trim() || "",
        banco: form.banco && form.banco.trim() !== "" ? form.banco.trim() : undefined,
      };
    }

    onSalvar(dadosParaSalvar);

    setForm(defaultForm);
    setDigitosValor("");
    setErrors({});
  };

  // Busca dados do banco selecionado
  const bancoSelecionado = empresaOptions.find((b) => b.value === form.banco);

  const temErros = Object.keys(errors).length > 0;

  return (
    <>
      <Dialog open={open} onOpenChange={handleDialogChange}>
        <DialogContent className="w-full max-w-lg h-[100dvh] md:h-auto md:max-h-[85vh] flex flex-col p-0 gap-0 dark:bg-gray-900 dark:border-gray-800 md:rounded-lg rounded-none">
          {/* Header */}
          <DialogHeader className="flex-shrink-0 px-4 pt-4 pb-3 border-b dark:border-gray-800">
            <DialogTitle className="text-base font-semibold text-gray-900 dark:text-white">
              {isEdit ? "Editar Conta" : "Nova Conta"}
            </DialogTitle>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {isEdit ? "Altere as informações da conta" : "Adicione uma nova conta bancária"}
            </p>
          </DialogHeader>

          {/* Form - Scrollable */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 space-y-4">
            {/* Alert Informativo - Apenas na edição */}
            {isEdit && (
              <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800 py-2">
                <Info className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                <AlertTitle className="text-xs font-medium text-blue-900 dark:text-blue-100">
                  Saldo Inicial não pode ser alterado
                </AlertTitle>
                <AlertDescription className="text-[11px] text-blue-800 dark:text-blue-300 mt-1">
                  Use o botão &quot;Ajustar Saldo&quot; no card da conta para correções.
                </AlertDescription>
              </Alert>
            )}

            {/* Nome da Conta */}
            <div className="space-y-2">
              <Label htmlFor="nome" className="text-sm font-medium text-gray-900 dark:text-white">
                Nome da Conta
              </Label>
              <Input
                id="nome"
                value={form.nome}
                onChange={(e) => handleChange("nome", e.target.value)}
                placeholder="Ex: Nubank, PicPay, Carteira"
                className={
                  errors.nome
                    ? "border-red-500 dark:border-red-500"
                    : "dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                }
              />
              {errors.nome && (
                <div className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                  <AlertCircle size={12} />
                  <span>{errors.nome}</span>
                </div>
              )}
            </div>

            {/* Banco/Instituição */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-900 dark:text-white">
                Banco/Instituição
              </Label>
              
              <div className="flex items-center gap-3">
                {/* Preview do banco */}
                <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {bancoSelecionado?.imgSrc ? (
                    <Image
                      src={bancoSelecionado.imgSrc}
                      alt={bancoSelecionado.label}
                      width={40}
                      height={40}
                      className="object-contain"
                    />
                  ) : (
                    <Building2 size={24} className="text-gray-400 dark:text-gray-600" />
                  )}
                </div>

                {/* Botão selecionar */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setBancoPickerOpen(true)}
                  className="flex-1 justify-start text-left dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700"
                >
                  {bancoSelecionado ? bancoSelecionado.label : "Selecionar Banco"}
                </Button>
              </div>
              
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Escolha a instituição financeira
              </p>
            </div>

            {/* Saldo Inicial */}
            <div className="space-y-2">
              <Label htmlFor="saldo" className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
                Saldo Inicial
                {isEdit && <Lock className="h-3 w-3 text-gray-400 dark:text-gray-600" />}
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-lg font-medium">
                  R$
                </span>
                <Input
                  id="saldo"
                  type="text"
                  inputMode="numeric"
                  value={isEdit ? "—" : formatarValorCalculadora(digitosValor)}
                  onChange={handleValorChange}
                  placeholder="0,00"
                  disabled={isEdit}
                  className={`pl-12 text-lg font-medium ${
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
              {!isEdit && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Digite o valor sem vírgula ou ponto
                </p>
              )}
            </div>

            {/* Observações - Colapsável */}
            <details className="group">
              <summary className="flex items-center justify-between cursor-pointer text-xs font-medium text-gray-600 dark:text-gray-400 py-2 select-none">
                <span>Observações (opcional)</span>
                <span className="text-gray-400 group-open:rotate-180 transition-transform">
                  ▼
                </span>
              </summary>
              <div className="mt-2">
                <Textarea
                  id="observacoes"
                  value={form.observacoes ?? ""}
                  onChange={(e) => handleChange("observacoes", e.target.value)}
                  placeholder="Informações adicionais sobre a conta..."
                  className="resize-none h-20 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                />
              </div>
            </details>

            {/* Espaçamento extra */}
            <div className="h-2" />
          </div>

          {/* Footer - Botões lado a lado */}
          <div className="flex-shrink-0 flex gap-2 px-4 py-3 border-t dark:border-gray-800 bg-background dark:bg-gray-900 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              className="flex-1 h-12 text-sm font-medium touch-manipulation dark:border-gray-700 dark:hover:bg-gray-800"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={temErros}
              className="flex-1 h-12 text-sm font-semibold touch-manipulation bg-blue-700 text-white hover:bg-blue-900"
            >
              {isEdit ? "Salvar" : "Adicionar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de seleção de banco */}
      <BancoPickerModal
        aberto={bancoPickerOpen}
        onClose={() => setBancoPickerOpen(false)}
        onSelect={(bancoValue) => handleChange("banco", bancoValue)}
        bancoAtual={form.banco}
      />
    </>
  );
}