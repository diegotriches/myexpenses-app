"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button }  from "@/components/ui/button";
import { Input }   from "@/components/ui/input";
import { InputMoeda } from "@/components/ui/input-moeda";
import { Label }   from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Slider } from "@/components/ui/slider";
import {
  Loader2,
  CheckCircle,
  AlertCircle,
  Wallet,
  Info,
  Zap,
} from "lucide-react";
import { useHideValues } from "@/contexts/HideValuesContext";
import { formatarMoeda } from "@/utils/formatadores";

interface Conta {
  id:         string;
  nome:       string;
  saldoAtual?: number | string;
}

interface Props {
  aberto:         boolean;
  onClose:        () => void;
  totalFatura:    number;        // total atual da fatura (já descontados adiantamentos anteriores)
  contas:         Conta[];
  loading?:       boolean;
  onConfirmar: (dados: {
    contaId:   string;
    valor:     number;
    descricao?: string;
  }) => Promise<void>;
}

export default function AdiantamentoFaturaModal({
  aberto,
  onClose,
  totalFatura,
  contas,
  loading = false,
  onConfirmar,
}: Props) {
  const { mask } = useHideValues();
  const [contaId,    setContaId]    = useState("");
  const [valorStr,   setValorStr]   = useState("");
  const [descricao,  setDescricao]  = useState("");
  const [erro,       setErro]       = useState<string | null>(null);

  // Reset ao abrir
  // Ajusta o estado durante o render quando as dependências mudam (inclusive na montagem)
  const [depsAnteriores, setDepsAnteriores] = useState<readonly unknown[] | null>(null);
  const depsAtuais: readonly unknown[] = [aberto, totalFatura];
  if (!depsAnteriores || depsAtuais.some((d, i) => !Object.is(d, depsAnteriores[i]))) {
    setDepsAnteriores(depsAtuais);
    if (aberto) {
      setContaId("");
      setValorStr(totalFatura.toFixed(2).replace(".", ","));
      setDescricao("");
      setErro(null);
    }
  }

  const valorNum = useMemo(() => {
    const raw = valorStr.replace(",", ".").replace(/[^\d.]/g, "");
    return parseFloat(raw) || 0;
  }, [valorStr]);

  const contaSelecionada = contas.find((c) => c.id === contaId);
  const saldoConta = contaSelecionada
    ? (typeof contaSelecionada.saldoAtual === "string"
        ? parseFloat(contaSelecionada.saldoAtual)
        : contaSelecionada.saldoAtual ?? 0)
    : 0;

  const saldoSuficiente  = saldoConta >= valorNum;
  const valorValido      = valorNum > 0 && valorNum <= totalFatura;
  const percentualSlider = totalFatura > 0 ? Math.round((valorNum / totalFatura) * 100) : 0;

  function handleSlider(pct: number[]) {
    const v = (pct[0] / 100) * totalFatura;
    setValorStr(v.toFixed(2).replace(".", ","));
  }

  function validar(): boolean {
    setErro(null);
    if (!contaId)             { setErro("Selecione uma conta para débito");           return false; }
    if (valorNum <= 0)        { setErro("Informe um valor maior que zero");            return false; }
    if (valorNum > totalFatura) { setErro(`Valor não pode exceder ${formatarMoeda(totalFatura)}`); return false; }
    if (!saldoSuficiente)    { setErro("Saldo insuficiente na conta selecionada");     return false; }
    return true;
  }

  async function confirmar() {
    if (!validar()) return;
    try {
      setErro(null);
      await onConfirmar({ contaId, valor: valorNum, descricao: descricao.trim() || undefined });
    } catch (err: any) {
      setErro(err.message || "Erro ao processar adiantamento");
    }
  }

  const podeConfirmar = !!contaId && valorValido && saldoSuficiente && !loading;

  return (
    <Dialog open={aberto} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Zap className="text-amber-500" size={22} />
            Adiantamento de Fatura
          </DialogTitle>
          <DialogDescription>
            Pague parcial ou totalmente uma fatura sem fechá-la. O limite do cartão será
            restaurado imediatamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Saldo da fatura */}
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <p className="text-xs text-amber-700 dark:text-amber-300 font-medium mb-1">
              Saldo restante da fatura
            </p>
            <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">
              {mask(formatarMoeda(totalFatura))}
            </p>
          </div>

          {/* Conta */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1 text-gray-700 dark:text-gray-300">
              <Wallet size={14} className="text-gray-400" />
              Conta para débito <span className="text-red-500">*</span>
            </Label>
            <Select value={contaId} onValueChange={setContaId} disabled={loading}>
              <SelectTrigger className={!contaId && erro ? "border-red-500" : ""}>
                <SelectValue placeholder="Selecione uma conta" />
              </SelectTrigger>
              <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                {contas.map((c) => {
                  const saldo = typeof c.saldoAtual === "string"
                    ? parseFloat(c.saldoAtual)
                    : c.saldoAtual ?? 0;
                  return (
                    <SelectItem key={c.id} value={c.id}>
                      <div className="flex items-center justify-between w-full gap-4">
                        <span>{c.nome}</span>
                        <span className="text-xs text-gray-500">{mask(formatarMoeda(saldo))}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {contaSelecionada && !saldoSuficiente && (
              <Alert variant="destructive" className="py-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Saldo insuficiente. Disponível: {mask(formatarMoeda(saldoConta))}
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Valor */}
          <div className="space-y-3">
            <Label className="text-gray-700 dark:text-gray-300">
              Valor do adiantamento <span className="text-red-500">*</span>
            </Label>

            {/* Slider de percentual */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>0%</span>
                <span className="font-semibold text-amber-600 dark:text-amber-400">
                  {percentualSlider}% do total
                </span>
                <span>100%</span>
              </div>
              <Slider
                value={[percentualSlider]}
                min={0}
                max={100}
                step={1}
                onValueChange={handleSlider}
                disabled={loading}
                className="cursor-pointer"
              />
            </div>

            {/* Input numérico */}
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500">
                R$
              </span>
              <InputMoeda
                value={valorStr}
                onChange={setValorStr}
                disabled={loading}
                className="pl-9 h-11 text-base font-semibold"
                placeholder="0,00"
              />
            </div>

            {/* Atalhos rápidos */}
            <div className="flex gap-2">
              {[25, 50, 75, 100].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    const v = (pct / 100) * totalFatura;
                    setValorStr(v.toFixed(2).replace(".", ","));
                  }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors
                    ${percentualSlider === pct
                      ? "bg-amber-500 text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 hover:text-amber-700 dark:hover:text-amber-300"
                    }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label className="text-gray-700 dark:text-gray-300 flex items-center gap-1">
              Descrição
              <span className="text-xs text-gray-400 font-normal">(opcional)</span>
            </Label>
            <Input
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              disabled={loading}
              placeholder="Ex: Adiantamento parcial de janeiro"
              className="h-10"
              maxLength={100}
            />
          </div>

          {/* Info */}
          <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-900 py-2.5">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-xs text-blue-800 dark:text-blue-200">
              A fatura <strong>não será fechada</strong>. Novas compras continuam sendo
              registradas normalmente. Você pode cancelar este adiantamento se necessário.
            </AlertDescription>
          </Alert>

          {/* Erro */}
          {erro && (
            <Alert variant="destructive" className="py-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">{erro}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={confirmar}
            disabled={!podeConfirmar}
            className="bg-amber-500 hover:bg-amber-600 text-white"
          >
            {loading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processando...</>
            ) : (
              <><CheckCircle className="mr-2 h-4 w-4" />Confirmar Adiantamento</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}