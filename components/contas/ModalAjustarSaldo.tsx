"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Info, 
  AlertCircle, 
  TrendingUp, 
  TrendingDown,
  Loader2,
  DollarSign,
} from "lucide-react";
import { Conta } from "@/types/conta";
import { useAjustarSaldo } from "@/hooks/useContas";

interface Props {
  open: boolean;
  onClose: () => void;
  conta: Conta | null;
}

export default function ModalAjustarSaldo({ open, onClose, conta }: Props) {
  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const ajustarSaldo = useAjustarSaldo();

  // Reset ao abrir/fechar
  useEffect(() => {
    if (open) {
      setValor("");
      setDescricao("");
      setErro(null);
    }
  }, [open]);

  if (!conta) return null;

  // Formata moeda
  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  // Calcula novo saldo
  const valorNumerico = parseFloat(valor) || 0;
  const saldoAtual = conta.saldoAtual;
  const novoSaldo = saldoAtual + valorNumerico;

  // Determina tipo de ajuste
  const isAumento = valorNumerico > 0;
  const isDiminuicao = valorNumerico < 0;

  const handleSubmit = async () => {
    setErro(null);

    // Validações
    if (!valor || valorNumerico === 0) {
      setErro("Informe um valor diferente de zero");
      return;
    }

    if (!descricao.trim()) {
      setErro("Informe uma descrição para o ajuste");
      return;
    }

    try {
      await ajustarSaldo.mutateAsync({
        contaId: conta.id,
        valor: valorNumerico,
        descricao: descricao.trim(),
      });

      // Fecha modal após sucesso (toast automático do hook)
      onClose();
    } catch (error) {
      console.error("Erro ao ajustar saldo:", error);
      setErro(
        error instanceof Error 
          ? error.message 
          : "Erro ao ajustar saldo"
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] dark:bg-gray-900 dark:border-gray-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
            <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Ajustar Saldo
          </DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-400">
            Corrija o saldo de <strong>{conta.nome}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Info sobre saldo atual */}
          <Alert className="bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700">
            <Info className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            <AlertTitle className="text-gray-900 dark:text-white">
              Saldo Atual
            </AlertTitle>
            <AlertDescription className="text-gray-700 dark:text-gray-300">
              <span className="text-2xl font-bold">
                {formatarMoeda(saldoAtual)}
              </span>
            </AlertDescription>
          </Alert>

          {/* Erro */}
          {erro && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{erro}</AlertDescription>
            </Alert>
          )}

          {/* Valor do Ajuste */}
          <div className="space-y-2">
            <Label htmlFor="valor" className="text-gray-700 dark:text-gray-300">
              Valor do Ajuste <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm font-medium">
                R$
              </span>
              <Input
                id="valor"
                type="number"
                step="0.01"
                value={valor}
                onChange={(e) => {
                  setValor(e.target.value);
                  setErro(null);
                }}
                placeholder="0.00"
                className="pl-10 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                disabled={ajustarSaldo.isPending}
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400">
              <p>• Valores positivos aumentam o saldo</p>
              <p>• Valores negativos diminuem o saldo</p>
            </div>
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="descricao" className="text-gray-700 dark:text-gray-300">
              Motivo do Ajuste <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="descricao"
              value={descricao}
              onChange={(e) => {
                setDescricao(e.target.value);
                setErro(null);
              }}
              placeholder="Ex: Correção de saldo inicial, Esqueci de lançar uma despesa..."
              rows={3}
              className="resize-none dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              disabled={ajustarSaldo.isPending}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Esta descrição aparecerá no extrato da conta
            </p>
          </div>

          {/* Preview do Novo Saldo */}
          {valorNumerico !== 0 && (
            <Alert 
              className={
                isAumento
                  ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800"
                  : isDiminuicao
                  ? "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800"
                  : "bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700"
              }
            >
              {isAumento ? (
                <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
              ) : isDiminuicao ? (
                <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
              ) : (
                <Info className="h-4 w-4" />
              )}
              <AlertTitle 
                className={
                  isAumento
                    ? "text-green-900 dark:text-green-100"
                    : isDiminuicao
                    ? "text-red-900 dark:text-red-100"
                    : "text-gray-900 dark:text-white"
                }
              >
                Novo Saldo Previsto
              </AlertTitle>
              <AlertDescription 
                className={
                  isAumento
                    ? "text-green-800 dark:text-green-300"
                    : isDiminuicao
                    ? "text-red-800 dark:text-red-300"
                    : "text-gray-700 dark:text-gray-300"
                }
              >
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-sm">
                    {formatarMoeda(saldoAtual)}
                  </span>
                  <span className="text-lg font-medium">
                    {isAumento ? "+" : ""}{formatarMoeda(valorNumerico)}
                  </span>
                  <span className="text-sm">→</span>
                  <span className="text-2xl font-bold">
                    {formatarMoeda(novoSaldo)}
                  </span>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={ajustarSaldo.isPending}
            className="dark:border-gray-700 dark:hover:bg-gray-800"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={ajustarSaldo.isPending || !valor || !descricao.trim()}
            className="bg-blue-700 hover:bg-blue-900"
          >
            {ajustarSaldo.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Ajustando...
              </>
            ) : (
              "Confirmar Ajuste"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}