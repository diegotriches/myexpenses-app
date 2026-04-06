"use client";

import { useEffect, useState } from "react";
import { Conta } from "@/types/conta";
import { useCriarTransferencia } from "@/hooks/useTransferencias";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowRightLeft, ArrowRight } from "lucide-react";

interface ModalTransferenciaProps {
  open: boolean;
  onClose: () => void;
  contas: Conta[];
  contaOrigemInicialId?: string | null;
}

export function ModalTransferencia({
  open,
  onClose,
  contas,
  contaOrigemInicialId,
}: ModalTransferenciaProps) {
  const criarTransferencia = useCriarTransferencia();

  const contasAtivas = contas.filter((c) => c.ativo);

  const [contaOrigemId,  setContaOrigemId]  = useState("");
  const [contaDestinoId, setContaDestinoId] = useState("");
  const [valorCentavos,  setValorCentavos]  = useState(0);
  const [descricao,      setDescricao]      = useState("");
  const [data,           setData]           = useState(
    new Date().toISOString().substring(0, 10)
  );

  // ── Lógica calculadora ───────────────────────────────────────────────────
  // Mantém o valor em centavos (inteiro). Cada dígito digitado desloca
  // os existentes uma casa para a esquerda: 0 → 1 → 15 → 150 (= R$ 1,50).
  const valorNumerico = valorCentavos / 100;

  const valorExibido = valorNumerico.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const handleValorKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      setValorCentavos((prev) => Math.floor(prev / 10));
      return;
    }
    if (!/^\d$/.test(e.key)) return;
    e.preventDefault();
    setValorCentavos((prev) => {
      const proximo = prev * 10 + Number(e.key);
      // Limite: 9.999.999,99 (7 dígitos antes da vírgula)
      return proximo <= 999999999 ? proximo : prev;
    });
  };
  // ────────────────────────────────────────────────────────────────────────

  const resetForm = () => {
    setContaOrigemId("");
    setContaDestinoId("");
    setValorCentavos(0);
    setDescricao("");
    setData(new Date().toISOString().substring(0, 10));
  };

  useEffect(() => {
    if (!open) {
      resetForm();
      return;
    }
    if (contaOrigemInicialId) {
      setContaOrigemId(contaOrigemInicialId);
    }
  }, [open, contaOrigemInicialId]);

  const formularioValido =
    contaOrigemId &&
    contaDestinoId &&
    contaOrigemId !== contaDestinoId &&
    valorNumerico > 0;

  const handleSubmit = async () => {
    if (!formularioValido || criarTransferencia.isPending) return;
    try {
      await criarTransferencia.mutateAsync({
        contaOrigemId,
        contaDestinoId,
        valor: valorNumerico,
        descricao,
        data,
      });
      onClose();
    } catch {
      // Erro já tratado no hook
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <DialogContent className="max-w-2xl dark:bg-gray-900 dark:border-gray-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
            <ArrowRightLeft className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Transferência entre contas
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Contas Origem e Destino lado a lado com seta */}
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-end">
            {/* Conta de Origem */}
            <div>
              <label className="text-sm font-medium mb-1.5 block text-gray-700 dark:text-gray-300">
                Conta de origem
              </label>
              <Select
                value={contaOrigemId}
                onValueChange={setContaOrigemId}
                disabled={criarTransferencia.isPending}
              >
                <SelectTrigger className="dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100">
                  <SelectValue placeholder="Selecione a conta de origem" />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                  {contasAtivas.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      Nenhuma conta cadastrada
                    </div>
                  ) : (
                    contasAtivas.map((conta) => (
                      <SelectItem
                        key={conta.id}
                        value={conta.id}
                        className="dark:text-gray-100 dark:hover:bg-gray-700"
                      >
                        <div className="flex items-center justify-between w-full gap-3">
                          <span>{conta.nome}</span>
                          <span className={`text-xs font-medium ${
                            Number(conta.saldoAtual) >= 0
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400"
                          }`}>
                            {Number(conta.saldoAtual).toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            })}
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Seta indicadora */}
            <div className="hidden sm:flex items-center justify-center pb-2">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30">
                <ArrowRight className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>

            {/* Conta de Destino */}
            <div>
              <label className="text-sm font-medium mb-1.5 block text-gray-700 dark:text-gray-300">
                Conta de destino
              </label>
              <Select
                value={contaDestinoId}
                onValueChange={setContaDestinoId}
                disabled={criarTransferencia.isPending || !contaOrigemId}
              >
                <SelectTrigger className="dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100">
                  <SelectValue placeholder="Selecione a conta de destino" />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                  {contasAtivas
                    .filter((c) => c.id !== contaOrigemId)
                    .map((conta) => (
                      <SelectItem
                        key={conta.id}
                        value={conta.id}
                        className="dark:text-gray-100 dark:hover:bg-gray-700"
                      >
                        <div className="flex items-center justify-between w-full gap-3">
                          <span>{conta.nome}</span>
                          <span className={`text-xs font-medium ${
                            Number(conta.saldoAtual) >= 0
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400"
                          }`}>
                            {Number(conta.saldoAtual).toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            })}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Valor e Data lado a lado */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Valor — estilo calculadora */}
            <div>
              <label className="text-sm font-medium mb-1.5 block text-gray-700 dark:text-gray-300">
                Valor <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm font-medium">
                  R$
                </span>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="0,00"
                  value={valorCentavos === 0 ? "" : valorExibido}
                  onKeyDown={handleValorKeyDown}
                  onChange={() => {}}
                  disabled={criarTransferencia.isPending}
                  className="pl-10 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-500"
                />
              </div>
            </div>

            {/* Data */}
            <div>
              <label className="text-sm font-medium mb-1.5 block text-gray-700 dark:text-gray-300">
                Data <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                disabled={criarTransferencia.isPending}
                className="dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
              />
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className="text-sm font-medium mb-1.5 block text-gray-700 dark:text-gray-300">
              Descrição <span className="text-gray-400 dark:text-gray-500 text-xs">(opcional)</span>
            </label>
            <Input
              placeholder="Ex: Transferência para poupança"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              disabled={criarTransferencia.isPending}
              className="dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-500"
            />
          </div>

          {/* Erro do React Query */}
          {criarTransferencia.isError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
              <p className="text-sm text-red-600 dark:text-red-400">
                {criarTransferencia.error?.message || "Erro ao criar transferência"}
              </p>
            </div>
          )}

          {/* Resumo da transferência */}
          {contaOrigemId && contaDestinoId && valorNumerico > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4 space-y-2">
              <p className="text-xs font-medium text-blue-900 dark:text-blue-300 flex items-center gap-1">
                <span className="text-base">📋</span> Resumo da transferência
              </p>
              <div className="space-y-1.5 text-sm text-blue-800 dark:text-blue-400">
                <div className="flex justify-between items-center">
                  <span>De:</span>
                  <span className="font-semibold">
                    {contasAtivas.find((c) => c.id === contaOrigemId)?.nome}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Para:</span>
                  <span className="font-semibold">
                    {contasAtivas.find((c) => c.id === contaDestinoId)?.nome}
                  </span>
                </div>
                <div className="h-px bg-blue-200 dark:bg-blue-800 my-1" />
                <div className="flex justify-between items-center">
                  <span>Valor:</span>
                  <span className="font-bold text-base">
                    {valorNumerico.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={criarTransferencia.isPending}
            className="dark:border-gray-700 dark:hover:bg-gray-800"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!formularioValido || criarTransferencia.isPending}
            className="bg-blue-700 hover:bg-blue-900"
          >
            {criarTransferencia.isPending ? "Transferindo..." : "Confirmar Transferência"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}