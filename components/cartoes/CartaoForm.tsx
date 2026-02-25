"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { Cartao, CreateCartaoDTO, UpdateCartaoDTO } from "@/types/cartao";
import { bandeiraOptions, empresaOptions } from "@/utils/cartaoOptions";
import { useContas } from "@/hooks/useContas";

import EmpresaPickerModal from "./EmpresaPickerModal";
import BandeiraPickerModal from "./BandeiraPickerModal";

import {
  Info,
  CreditCard,
  Wallet,
  Building2,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import Image from "next/image";
import { DiaPickerField } from "@/components/cartoes/DiaPickerField";

type TipoCartao = "credito" | "debito";

interface Props {
  initialValues: Cartao | null;
  onSubmit: (values: CreateCartaoDTO | UpdateCartaoDTO) => Promise<void>;
  onCancel?: () => void;
}

export default function CartaoForm({
  initialValues,
  onSubmit,
  onCancel,
}: Props) {
  const { data: contas = [] } = useContas();

  const [form, setForm] = useState({
    nome: "",
    tipo: "credito" as TipoCartao,
    bandeira: "",
    empresa: "",
    limite: "",
    diaFechamento: "",
    diaVencimento: "",
    ativo: true,
    observacoes: "",
    contaVinculadaId: "none",
  });

  const [empresaPickerAberto, setEmpresaPickerAberto] = useState(false);
  const [bandeiraPickerAberto, setBandeiraPickerAberto] = useState(false);
  const [limitDigitos, setLimitDigitos] = useState("");
  const [erros, setErros] = useState<Record<string, string>>({});
  const [camposTocados, setCamposTocados] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (initialValues) {
      const limiteInicial = initialValues.limite
        ? Math.round(Number(initialValues.limite) * 100).toString()
        : "";

      setForm({
        nome: initialValues.nome,
        tipo: initialValues.tipo,
        bandeira: initialValues.bandeira,
        empresa: initialValues.empresa || "",
        limite: initialValues.limite ? Number(initialValues.limite).toFixed(2) : "",
        diaFechamento: initialValues.diaFechamento?.toString() ?? "",
        diaVencimento: initialValues.diaVencimento?.toString() ?? "",
        ativo: initialValues.ativo,
        observacoes: initialValues.observacoes ?? "",
        contaVinculadaId: initialValues.contaVinculadaId ?? "none",
      });

      setLimitDigitos(limiteInicial);
    }
  }, [initialValues]);

  function formatarValorCalculadora(digitos: string): string {
    if (!digitos) return "R$ 0,00";
    const valorEmCentavos = parseInt(digitos, 10);
    const valorEmReais = valorEmCentavos / 100;
    return `R$ ${valorEmReais.toFixed(2).replace(".", ",")}`;
  }

  function handleLimiteChange(e: React.ChangeEvent<HTMLInputElement>) {
    const apenasNumeros = e.target.value.replace(/\D/g, "");
    const limitado = apenasNumeros.slice(0, 10);
    setLimitDigitos(limitado);
    const valorEmReais = limitado ? (parseInt(limitado, 10) / 100).toFixed(2) : "";
    handleChange("limite", valorEmReais);
  }

  function handleChange(field: string, value: any) {
    setForm((f) => {
      const updated = { ...f, [field]: value };

      if (field === "tipo") {
        if (value === "debito") {
          updated.limite = "";
          updated.diaFechamento = "";
          updated.diaVencimento = "";
          setLimitDigitos("");
        }
        // Ao trocar para crédito, limpa conta vinculada
        if (value === "credito") {
          updated.contaVinculadaId = "none";
        }
      }

      return updated;
    });

    setCamposTocados((prev) => ({ ...prev, [field]: true }));
    validarCampo(field, value);
  }

  function validarCampo(field: string, value: any) {
    const novosErros = { ...erros };

    switch (field) {
      case "nome":
        if (!value?.trim()) {
          novosErros.nome = "Nome é obrigatório";
        } else {
          delete novosErros.nome;
        }
        break;

      case "empresa":
        if (!value) {
          novosErros.empresa = "Selecione o banco emissor";
        } else {
          delete novosErros.empresa;
        }
        break;

      case "bandeira":
        if (!value) {
          novosErros.bandeira = "Selecione a bandeira";
        } else {
          delete novosErros.bandeira;
        }
        break;

      case "contaVinculadaId":
        if (form.tipo === "debito" && (!value || value === "none")) {
          novosErros.contaVinculadaId =
            "Conta vinculada é obrigatória para cartão de débito";
        } else {
          delete novosErros.contaVinculadaId;
        }
        break;

      case "limite":
        if (form.tipo === "credito") {
          const limite = Number(value);
          if (!Number.isFinite(limite) || limite <= 0) {
            novosErros.limite = "Informe um limite válido";
          } else {
            delete novosErros.limite;
          }
        }
        break;

      case "diaFechamento":
        if (form.tipo === "credito" && !value) {
          novosErros.diaFechamento = "Informe o dia de fechamento";
        } else {
          delete novosErros.diaFechamento;
        }
        break;

      case "diaVencimento":
        if (form.tipo === "credito" && !value) {
          novosErros.diaVencimento = "Informe o dia de vencimento";
        } else {
          delete novosErros.diaVencimento;
        }
        break;
    }

    setErros(novosErros);
  }

  function validarFormulario(): boolean {
    const todosErros: Record<string, string> = {};

    if (!form.nome?.trim()) {
      todosErros.nome = "Nome é obrigatório";
    }

    if (!form.empresa) {
      todosErros.empresa = "Selecione o banco emissor";
    }

    if (!form.bandeira) {
      todosErros.bandeira = "Selecione a bandeira";
    }

    if (form.tipo === "debito") {
      if (!form.contaVinculadaId || form.contaVinculadaId === "none") {
        todosErros.contaVinculadaId =
          "Conta vinculada é obrigatória para cartão de débito";
      }
    }

    if (form.tipo === "credito") {
      const limite = Number(form.limite);
      if (!Number.isFinite(limite) || limite <= 0) {
        todosErros.limite = "Informe um limite válido";
      }

      if (!form.diaFechamento) {
        todosErros.diaFechamento = "Informe o dia de fechamento";
      }

      if (!form.diaVencimento) {
        todosErros.diaVencimento = "Informe o dia de vencimento";
      }
    }

    setErros(todosErros);

    const todosCamposTocados = Object.keys(form).reduce(
      (acc, key) => ({ ...acc, [key]: true }),
      {}
    );
    setCamposTocados(todosCamposTocados);

    return Object.keys(todosErros).length === 0;
  }

  async function handleSubmit() {
    if (!validarFormulario()) {
      return;
    }

    const payload: CreateCartaoDTO | UpdateCartaoDTO = {
      nome: form.nome.trim(),
      tipo: form.tipo,
      bandeira: form.bandeira,
      empresa: form.empresa,
      limite: form.tipo === "credito" ? Number(form.limite) : 0,
      diaFechamento: form.tipo === "credito" ? Number(form.diaFechamento) : null,
      diaVencimento: form.tipo === "credito" ? Number(form.diaVencimento) : null,
      ativo: form.ativo,
      observacoes: form.observacoes || null,
      contaVinculadaId:
        form.tipo === "credito"
          ? null
          : form.contaVinculadaId === "none"
          ? null
          : form.contaVinculadaId,
    };

    await onSubmit(payload);
  }

  const contasAtivas = contas.filter((c) => c.ativo);
  const empresaSelecionada = empresaOptions.find((e) => e.value === form.empresa);
  const bandeiraSelecionada = bandeiraOptions.find((b) => b.value === form.bandeira);
  const temErros = Object.keys(erros).length > 0;

  return (
    <div className="space-y-5">
      {/* Nome do Cartão */}
      <div>
        <label className="text-sm font-medium mb-1.5 block text-gray-700 dark:text-gray-300">
          Nome do Cartão <span className="text-red-500">*</span>
        </label>
        <Input
          placeholder="Ex: Nubank Roxo, C6 Carbon, etc."
          value={form.nome}
          onChange={(e) => handleChange("nome", e.target.value)}
          onBlur={() => setCamposTocados((prev) => ({ ...prev, nome: true }))}
          className={
            camposTocados.nome && erros.nome
              ? "border-red-500 dark:border-red-500"
              : ""
          }
        />
        {camposTocados.nome && erros.nome && (
          <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {erros.nome}
          </p>
        )}
      </div>

      {/* Tipo de Cartão */}
      <div>
        <label className="text-sm font-medium mb-1.5 block text-gray-700 dark:text-gray-300">
          Tipo de Cartão <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleChange("tipo", "credito")}
            className={`
              h-24 border-2 rounded-lg transition-all duration-200
              flex flex-col items-center justify-center gap-2
              ${
                form.tipo === "credito"
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-950 dark:border-blue-400"
                  : "border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600"
              }
            `}
          >
            <CreditCard
              className={`h-8 w-8 ${
                form.tipo === "credito"
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-gray-400 dark:text-gray-500"
              }`}
            />
            <span
              className={`text-sm font-medium ${
                form.tipo === "credito"
                  ? "text-blue-700 dark:text-blue-300"
                  : "text-gray-600 dark:text-gray-400"
              }`}
            >
              Crédito
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleChange("tipo", "debito")}
            className={`
              h-24 border-2 rounded-lg transition-all duration-200
              flex flex-col items-center justify-center gap-2
              ${
                form.tipo === "debito"
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-950 dark:border-blue-400"
                  : "border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600"
              }
            `}
          >
            <Wallet
              className={`h-8 w-8 ${
                form.tipo === "debito"
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-gray-400 dark:text-gray-500"
              }`}
            />
            <span
              className={`text-sm font-medium ${
                form.tipo === "debito"
                  ? "text-blue-700 dark:text-blue-300"
                  : "text-gray-600 dark:text-gray-400"
              }`}
            >
              Débito
            </span>
          </button>
        </div>
      </div>

      {/* Banco Emissor */}
      <div>
        <label className="text-sm font-medium mb-1.5 block text-gray-700 dark:text-gray-300">
          Banco Emissor <span className="text-red-500">*</span>
        </label>
        <button
          type="button"
          onClick={() => setEmpresaPickerAberto(true)}
          className={`
            w-full h-14 px-4 border rounded-lg
            flex items-center justify-between
            transition-colors duration-200
            ${
              camposTocados.empresa && erros.empresa
                ? "border-red-500 dark:border-red-500"
                : "border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500"
            }
            ${
              empresaSelecionada
                ? "bg-white dark:bg-gray-800"
                : "bg-gray-50 dark:bg-gray-900"
            }
          `}
        >
          <div className="flex items-center gap-3">
            {empresaSelecionada?.imgSrc ? (
              <Image
                src={empresaSelecionada.imgSrc}
                alt={empresaSelecionada.label}
                width={28}
                height={28}
                className="object-contain"
              />
            ) : (
              <Building2 className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            )}
            <span
              className={
                empresaSelecionada
                  ? "text-gray-900 dark:text-gray-100 font-medium"
                  : "text-gray-500 dark:text-gray-400"
              }
            >
              {empresaSelecionada?.label || "Selecionar banco emissor"}
            </span>
          </div>
          <ChevronRight className="h-5 w-5 text-gray-400" />
        </button>
        {camposTocados.empresa && erros.empresa && (
          <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {erros.empresa}
          </p>
        )}
      </div>

      {/* Bandeira */}
      <div>
        <label className="text-sm font-medium mb-1.5 block text-gray-700 dark:text-gray-300">
          Bandeira <span className="text-red-500">*</span>
        </label>
        <button
          type="button"
          onClick={() => setBandeiraPickerAberto(true)}
          className={`
            w-full h-14 px-4 border rounded-lg
            flex items-center justify-between
            transition-colors duration-200
            ${
              camposTocados.bandeira && erros.bandeira
                ? "border-red-500 dark:border-red-500"
                : "border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500"
            }
            ${
              bandeiraSelecionada
                ? "bg-white dark:bg-gray-800"
                : "bg-gray-50 dark:bg-gray-900"
            }
          `}
        >
          <div className="flex items-center gap-3">
            {bandeiraSelecionada?.imgSrc ? (
              <Image
                src={bandeiraSelecionada.imgSrc}
                alt={bandeiraSelecionada.label}
                width={32}
                height={32}
                className="object-contain"
              />
            ) : (
              <CreditCard className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            )}
            <span
              className={
                bandeiraSelecionada
                  ? "text-gray-900 dark:text-gray-100 font-medium"
                  : "text-gray-500 dark:text-gray-400"
              }
            >
              {bandeiraSelecionada?.label || "Selecionar bandeira"}
            </span>
          </div>
          <ChevronRight className="h-5 w-5 text-gray-400" />
        </button>
        {camposTocados.bandeira && erros.bandeira && (
          <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {erros.bandeira}
          </p>
        )}
      </div>

      {/* Limite (apenas crédito) */}
      {form.tipo === "credito" && (
        <div>
          <label className="text-sm font-medium mb-1.5 block text-gray-700 dark:text-gray-300">
            Limite do Cartão <span className="text-red-500">*</span>
          </label>
          <Input
            type="text"
            inputMode="numeric"
            placeholder="R$ 0,00"
            value={formatarValorCalculadora(limitDigitos)}
            onChange={handleLimiteChange}
            onBlur={() =>
              setCamposTocados((prev) => ({ ...prev, limite: true }))
            }
            className={`text-lg font-semibold ${
              camposTocados.limite && erros.limite
                ? "border-red-500 dark:border-red-500"
                : ""
            }`}
          />
          {camposTocados.limite && erros.limite && (
            <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {erros.limite}
            </p>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            💡 Digite apenas números. Ex: 500000 = R$ 5.000,00
          </p>
        </div>
      )}

      {/* Dias de Fechamento e Vencimento (apenas crédito) */}
      {form.tipo === "credito" && (
        <div className="grid grid-cols-2 gap-4">
          <DiaPickerField
            label="Dia Fechamento"
            value={form.diaFechamento}
            onChange={(v) => handleChange("diaFechamento", v)}
            onBlur={() => setCamposTocados((prev) => ({ ...prev, diaFechamento: true }))}
            erro={erros.diaFechamento}
            tocado={camposTocados.diaFechamento}
            obrigatorio
          />
          <DiaPickerField
            label="Dia Vencimento"
            value={form.diaVencimento}
            onChange={(v) => handleChange("diaVencimento", v)}
            onBlur={() => setCamposTocados((prev) => ({ ...prev, diaVencimento: true }))}
            erro={erros.diaVencimento}
            tocado={camposTocados.diaVencimento}
            obrigatorio
          />
        </div>
      )}

      {/* Conta Vinculada (apenas débito) */}
      {form.tipo === "debito" && (
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Conta Vinculada
            </label>
            <span className="text-xs text-red-500 font-medium">*</span>
          </div>
          <Select
            value={form.contaVinculadaId}
            onValueChange={(v) => handleChange("contaVinculadaId", v)}
          >
            <SelectTrigger
              className={
                camposTocados.contaVinculadaId && erros.contaVinculadaId
                  ? "border-red-500 dark:border-red-500"
                  : ""
              }
            >
              <SelectValue placeholder="Selecione a conta vinculada" />
            </SelectTrigger>
            <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
              {contasAtivas.length > 0 ? (
                contasAtivas.map((conta) => (
                  <SelectItem key={conta.id} value={conta.id}>
                    {conta.nome} - R$ {Number(conta.saldoAtual).toFixed(2)}
                    {conta.banco && ` (${conta.banco})`}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="no-accounts" disabled>
                  Nenhuma conta cadastrada
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          {camposTocados.contaVinculadaId && erros.contaVinculadaId && (
            <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {erros.contaVinculadaId}
            </p>
          )}
          <Alert className="mt-2 bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-blue-800 dark:text-blue-300 text-xs">
              <p className="font-medium">Cartão de débito</p>
              <p className="mt-0.5">
                Transações com este cartão serão descontadas imediatamente da
                conta vinculada.
              </p>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Observações */}
      <details className="group">
        <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2 select-none">
          Observações (opcional)
          <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
        </summary>
        <div className="mt-2">
          <Textarea
            placeholder="Informações adicionais, lembretes, regras do cartão, etc."
            value={form.observacoes}
            onChange={(e) => handleChange("observacoes", e.target.value)}
            className="min-h-[80px] resize-none"
          />
        </div>
      </details>

      {/* Botões de Ação */}
      <div className="pt-2 flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1"
        >
          Cancelar
        </Button>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={temErros}
          className="flex-1"
        >
          {initialValues ? "Salvar Alterações" : "Adicionar Cartão"}
        </Button>
      </div>

      {/* Modais Pickers */}
      <EmpresaPickerModal
        aberto={empresaPickerAberto}
        onClose={() => setEmpresaPickerAberto(false)}
        onSelect={(value) => {
          handleChange("empresa", value);
          setCamposTocados((prev) => ({ ...prev, empresa: true }));
        }}
        empresaAtual={form.empresa}
      />

      <BandeiraPickerModal
        aberto={bandeiraPickerAberto}
        onClose={() => setBandeiraPickerAberto(false)}
        onSelect={(value) => {
          handleChange("bandeira", value);
          setCamposTocados((prev) => ({ ...prev, bandeira: true }));
        }}
        bandeiraAtual={form.bandeira}
      />
    </div>
  );
}