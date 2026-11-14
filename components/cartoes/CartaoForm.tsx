"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Button }   from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { Cartao, CreateCartaoDTO, UpdateCartaoDTO } from "@/types/cartao";
import { bandeiraOptions, empresaOptions } from "@/utils/cartaoOptions";
import { useContas } from "@/hooks/useContas";

import EmpresaPickerModal  from "./EmpresaPickerModal";
import BandeiraPickerModal from "./BandeiraPickerModal";

import {
  Info, CreditCard, Wallet, Building2, ChevronRight, AlertCircle,
} from "lucide-react";
import Image from "next/image";
import { DiaPickerField } from "@/components/cartoes/DiaPickerField";
import { useHideValues } from "@/contexts/HideValuesContext";

type TipoCartao = "credito" | "debito";

interface FormCartao {
  nome: string;
  tipo: TipoCartao;
  bandeira: string;
  empresa: string;
  limite: string;
  diaFechamento: string;
  diaVencimento: string;
  ativo: boolean;
  observacoes: string;
  contaVinculadaId: string;
}

interface Props {
  initialValues: Cartao | null;
  onSubmit: (values: CreateCartaoDTO | UpdateCartaoDTO) => Promise<void>;
  onCancel?: () => void;
}

export default function CartaoForm({ initialValues, onSubmit, onCancel }: Props) {
  const { data: contas = [] } = useContas();
  const { mask } = useHideValues();

  const [form, setForm] = useState<FormCartao>({
    nome: "", tipo: "credito", bandeira: "", empresa: "",
    limite: "", diaFechamento: "", diaVencimento: "", ativo: true,
    observacoes: "", contaVinculadaId: "none",
  });

  const [empresaPickerAberto,  setEmpresaPickerAberto]  = useState(false);
  const [bandeiraPickerAberto, setBandeiraPickerAberto] = useState(false);
  const [limitDigitos,         setLimitDigitos]         = useState("");
  const [erros,                setErros]                = useState<Record<string, string>>({});
  const [camposTocados,        setCamposTocados]        = useState<Record<string, boolean>>({});

  // Ajusta o estado durante o render quando as dependências mudam (inclusive na montagem)
  const [depsAnteriores, setDepsAnteriores] = useState<readonly unknown[] | null>(null);
  const depsAtuais: readonly unknown[] = [initialValues];
  if (!depsAnteriores || depsAtuais.some((d, i) => !Object.is(d, depsAnteriores[i]))) {
    setDepsAnteriores(depsAtuais);
    if (initialValues) {
      const limiteInicial = initialValues.limite
        ? Math.round(Number(initialValues.limite) * 100).toString() : "";
      setForm({
        nome: initialValues.nome, tipo: initialValues.tipo,
        bandeira: initialValues.bandeira, empresa: initialValues.empresa || "",
        limite: initialValues.limite ? Number(initialValues.limite).toFixed(2) : "",
        diaFechamento: initialValues.diaFechamento?.toString() ?? "",
        diaVencimento: initialValues.diaVencimento?.toString() ?? "",
        ativo: initialValues.ativo, observacoes: initialValues.observacoes ?? "",
        contaVinculadaId: initialValues.contaVinculadaId ?? "none",
      });
      setLimitDigitos(limiteInicial);
    }
  }

  function formatarValorCalculadora(digitos: string): string {
    if (!digitos) return "R$ 0,00";
    return `R$ ${(parseInt(digitos, 10) / 100).toFixed(2).replace(".", ",")}`;
  }

  function handleLimiteChange(e: React.ChangeEvent<HTMLInputElement>) {
    const apenasNumeros = e.target.value.replace(/\D/g, "");
    const limitado = apenasNumeros.slice(0, 10);
    setLimitDigitos(limitado);
    handleChange("limite", limitado ? (parseInt(limitado, 10) / 100).toFixed(2) : "");
  }

  function handleChange<K extends keyof FormCartao>(field: K, value: FormCartao[K]) {
    setForm((f) => {
      const updated = { ...f, [field]: value };
      if (field === "tipo") {
        if (value === "debito") { updated.limite = ""; updated.diaFechamento = ""; updated.diaVencimento = ""; setLimitDigitos(""); }
        if (value === "credito") updated.contaVinculadaId = "none";
      }
      return updated;
    });
    setCamposTocados((prev) => ({ ...prev, [field]: true }));
    validarCampo(field, value);
  }

  function validarCampo(field: keyof FormCartao, value: FormCartao[keyof FormCartao]) {
    // Mensagem do campo, ou null quando válido; campos sem regra não mexem nos erros
    const texto = typeof value === "string" ? value : "";
    let mensagem: string | null;
    switch (field) {
      case "nome":             mensagem = !texto.trim() ? "Nome é obrigatório" : null; break;
      case "empresa":          mensagem = !texto ? "Selecione o banco emissor" : null; break;
      case "bandeira":         mensagem = !texto ? "Selecione a bandeira" : null; break;
      case "contaVinculadaId": mensagem = form.tipo === "debito" && (!texto || texto === "none") ? "Conta vinculada obrigatória" : null; break;
      case "limite":           mensagem = form.tipo === "credito" && (!Number.isFinite(Number(texto)) || Number(texto) <= 0) ? "Informe um limite válido" : null; break;
      case "diaFechamento":    mensagem = form.tipo === "credito" && !texto ? "Informe o dia de fechamento" : null; break;
      case "diaVencimento":    mensagem = form.tipo === "credito" && !texto ? "Informe o dia de vencimento" : null; break;
      default: return;
    }
    const e = { ...erros };
    if (mensagem) e[field] = mensagem;
    else delete e[field];
    setErros(e);
  }

  function validarFormulario(): boolean {
    const e: Record<string, string> = {};
    if (!form.nome?.trim()) e.nome = "Nome é obrigatório";
    if (!form.empresa)      e.empresa = "Selecione o banco emissor";
    if (!form.bandeira)     e.bandeira = "Selecione a bandeira";
    if (form.tipo === "debito" && (!form.contaVinculadaId || form.contaVinculadaId === "none"))
      e.contaVinculadaId = "Conta vinculada obrigatória";
    if (form.tipo === "credito") {
      const limite = Number(form.limite);
      if (!Number.isFinite(limite) || limite <= 0) e.limite = "Informe um limite válido";
      if (!form.diaFechamento) e.diaFechamento = "Informe o dia de fechamento";
      if (!form.diaVencimento) e.diaVencimento = "Informe o dia de vencimento";
    }
    setErros(e);
    setCamposTocados(Object.keys(form).reduce((acc, k) => ({ ...acc, [k]: true }), {}));
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validarFormulario()) return;
    await onSubmit({
      nome: form.nome.trim(), tipo: form.tipo, bandeira: form.bandeira, empresa: form.empresa,
      limite: form.tipo === "credito" ? Number(form.limite) : 0,
      diaFechamento: form.tipo === "credito" ? Number(form.diaFechamento) : null,
      diaVencimento: form.tipo === "credito" ? Number(form.diaVencimento) : null,
      ativo: form.ativo, observacoes: form.observacoes || null,
      contaVinculadaId: form.tipo === "credito" ? null : form.contaVinculadaId === "none" ? null : form.contaVinculadaId,
    });
  }

  const contasAtivas        = contas.filter((c) => c.ativo);
  const empresaSelecionada  = empresaOptions.find((e) => e.value === form.empresa);
  const bandeiraSelecionada = bandeiraOptions.find((b) => b.value === form.bandeira);
  const temErros            = Object.keys(erros).length > 0;

  const renderErroCampo = ({ campo }: { campo: string }) =>
    camposTocados[campo] && erros[campo] ? (
      <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
        <AlertCircle className="h-3 w-3 flex-shrink-0" />{erros[campo]}
      </p>
    ) : null;

  // Botão picker reutilizável (banco e bandeira)
  const renderPickerButton = ({
    campo, label, imgSrc, imgAlt, fallbackIcon: FallbackIcon,
    placeholder, onClick,
  }: {
    campo: string; label?: string; imgSrc?: string; imgAlt?: string;
    fallbackIcon: React.ElementType; placeholder: string; onClick: () => void;
  }) => (
    <div>
      <button
        type="button"
        onClick={onClick}
        className={`w-full h-11 px-3 border rounded-lg flex items-center justify-between
          transition-colors duration-200
          ${camposTocados[campo] && erros[campo] ? "border-red-500 dark:border-red-500"
            : "border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500"}
          ${label ? "bg-white dark:bg-gray-800" : "bg-gray-50 dark:bg-gray-900"}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {imgSrc ? (
            <Image src={imgSrc} alt={imgAlt || ""} width={22} height={22} className="object-contain flex-shrink-0" />
          ) : (
            <FallbackIcon className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
          )}
          <span className={`text-sm truncate ${label ? "text-gray-900 dark:text-gray-100 font-medium" : "text-gray-500 dark:text-gray-400"}`}>
            {label || placeholder}
          </span>
        </div>
        <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
      </button>
      {renderErroCampo({ campo: campo })}
    </div>
  );

  return (
    <div className="space-y-4">

      {/* ── TIPO ── */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Tipo de Cartão <span className="text-red-500">*</span>
          </label>
          {initialValues && (
            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <Info className="h-3 w-3" />Não pode ser alterado
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {(["credito", "debito"] as TipoCartao[]).map((tipo) => {
            const ativo = form.tipo === tipo;
            const Icon  = tipo === "credito" ? CreditCard : Wallet;
            return (
              <button
                key={tipo}
                type="button"
                onClick={() => !initialValues && handleChange("tipo", tipo)}
                disabled={!!initialValues}
                className={`h-14 border-2 rounded-lg transition-all duration-200
                  flex items-center justify-center gap-2
                  ${initialValues ? "cursor-not-allowed opacity-60" : ""}
                  ${ativo
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950 dark:border-blue-400"
                    : "border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600"}`}
              >
                <Icon className={`h-5 w-5 ${ativo ? "text-blue-600 dark:text-blue-400" : "text-gray-400 dark:text-gray-500"}`} />
                <span className={`text-sm font-medium ${ativo ? "text-blue-700 dark:text-blue-300" : "text-gray-600 dark:text-gray-400"}`}>
                  {tipo === "credito" ? "Crédito" : "Débito"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── NOME + LIMITE (crédito: lado a lado | débito: nome sozinho) ── */}
      <div className={`grid gap-3 ${form.tipo === "credito" ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}>
        <div>
          <label className="text-sm font-medium mb-1.5 block text-gray-700 dark:text-gray-300">
            Nome do Cartão <span className="text-red-500">*</span>
          </label>
          <Input
            placeholder={form.tipo === "credito" ? "Ex: Nubank, C6 Carbon…" : "Ex: Nubank Débito, Inter…"}
            value={form.nome}
            onChange={(e) => handleChange("nome", e.target.value)}
            onBlur={() => setCamposTocados((p) => ({ ...p, nome: true }))}
            className={camposTocados.nome && erros.nome ? "border-red-500 dark:border-red-500" : ""}
          />
          {renderErroCampo({ campo: "nome" })}
        </div>

        {form.tipo === "credito" && (
          <div>
            <label className="text-sm font-medium mb-1.5 block text-gray-700 dark:text-gray-300">
              Limite <span className="text-red-500">*</span>
            </label>
            <Input
              type="text" inputMode="numeric" placeholder="R$ 0,00"
              value={formatarValorCalculadora(limitDigitos)}
              onChange={handleLimiteChange}
              onBlur={() => setCamposTocados((p) => ({ ...p, limite: true }))}
              className={`font-semibold ${camposTocados.limite && erros.limite ? "border-red-500 dark:border-red-500" : ""}`}
            />
            {renderErroCampo({ campo: "limite" })}
          </div>
        )}
      </div>

      {/* ── BANCO EMISSOR + BANDEIRA (lado a lado) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium mb-1.5 block text-gray-700 dark:text-gray-300">
            Banco Emissor <span className="text-red-500">*</span>
          </label>
          {renderPickerButton({
            campo: "empresa",
            label: empresaSelecionada?.label,
            imgSrc: empresaSelecionada?.imgSrc,
            imgAlt: empresaSelecionada?.label,
            fallbackIcon: Building2,
            placeholder: "Selecionar banco",
            onClick: () => setEmpresaPickerAberto(true),
          })}
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block text-gray-700 dark:text-gray-300">
            Bandeira <span className="text-red-500">*</span>
          </label>
          {renderPickerButton({
            campo: "bandeira",
            label: bandeiraSelecionada?.label,
            imgSrc: bandeiraSelecionada?.imgSrc,
            imgAlt: bandeiraSelecionada?.label,
            fallbackIcon: CreditCard,
            placeholder: "Selecionar bandeira",
            onClick: () => setBandeiraPickerAberto(true),
          })}
        </div>
      </div>

      {/* ── FECHAMENTO + VENCIMENTO (apenas crédito) ── */}
      {form.tipo === "credito" && (
        <div className="grid grid-cols-2 gap-3">
          <DiaPickerField
            label="Dia Fechamento" value={form.diaFechamento}
            onChange={(v) => handleChange("diaFechamento", v)}
            onBlur={() => setCamposTocados((p) => ({ ...p, diaFechamento: true }))}
            erro={erros.diaFechamento} tocado={camposTocados.diaFechamento} obrigatorio
          />
          <DiaPickerField
            label="Dia Vencimento" value={form.diaVencimento}
            onChange={(v) => handleChange("diaVencimento", v)}
            onBlur={() => setCamposTocados((p) => ({ ...p, diaVencimento: true }))}
            erro={erros.diaVencimento} tocado={camposTocados.diaVencimento} obrigatorio
          />
        </div>
      )}

      {/* ── CONTA VINCULADA (apenas débito) ── */}
      {form.tipo === "debito" && (
        <div>
          <label className="text-sm font-medium mb-1.5 block text-gray-700 dark:text-gray-300">
            Conta Vinculada <span className="text-red-500">*</span>
          </label>
          <Select value={form.contaVinculadaId} onValueChange={(v) => handleChange("contaVinculadaId", v)}>
            <SelectTrigger className={`w-full ${camposTocados.contaVinculadaId && erros.contaVinculadaId ? "border-red-500 dark:border-red-500" : ""}`}>
              <SelectValue placeholder="Selecione a conta vinculada" />
            </SelectTrigger>
            <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
              {contasAtivas.length > 0 ? (
                contasAtivas.map((conta) => (
                  <SelectItem key={conta.id} value={conta.id}>
                    {conta.nome} — {mask(Number(conta.saldoAtual).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }))}
                    {conta.banco && ` (${conta.banco})`}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="no-accounts" disabled>Nenhuma conta cadastrada</SelectItem>
              )}
            </SelectContent>
          </Select>
          {renderErroCampo({ campo: "contaVinculadaId" })}
          <Alert className="mt-2 bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-blue-800 dark:text-blue-300 text-xs">
              Transações com este cartão serão descontadas imediatamente da conta vinculada.
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* ── OBSERVAÇÕES ── */}
      <details className="group">
        <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2 select-none">
          Observações
          <span className="text-xs text-gray-400 font-normal">(opcional)</span>
          <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
        </summary>
        <div className="mt-2">
          <Textarea
            placeholder="Informações adicionais, lembretes, regras do cartão, etc."
            value={form.observacoes}
            onChange={(e) => handleChange("observacoes", e.target.value)}
            className="min-h-[72px] resize-none"
          />
        </div>
      </details>

      {/* ── BOTÕES ── */}
      <div className="pt-1 flex gap-3">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">Cancelar</Button>
        <Button type="button" onClick={handleSubmit} disabled={temErros} className="flex-1">
          {initialValues ? "Salvar Alterações" : "Adicionar Cartão"}
        </Button>
      </div>

      {/* ── MODAIS ── */}
      <EmpresaPickerModal
        aberto={empresaPickerAberto}
        onClose={() => setEmpresaPickerAberto(false)}
        onSelect={(v) => { handleChange("empresa", v); setCamposTocados((p) => ({ ...p, empresa: true })); }}
        empresaAtual={form.empresa}
      />
      <BandeiraPickerModal
        aberto={bandeiraPickerAberto}
        onClose={() => setBandeiraPickerAberto(false)}
        onSelect={(v) => { handleChange("bandeira", v); setCamposTocados((p) => ({ ...p, bandeira: true })); }}
        bandeiraAtual={form.bandeira}
      />
    </div>
  );
}