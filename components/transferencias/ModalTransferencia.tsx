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
import { ArrowRightLeft } from "lucide-react";

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
  // ✅ React Query - hook separado para criar transferência
  const criarTransferencia = useCriarTransferencia();

  // Filtrar apenas contas ativas
  const contasAtivas = contas.filter((c) => c.ativo);

  const [contaOrigemId, setContaOrigemId] = useState("");
  const [contaDestinoId, setContaDestinoId] = useState("");
  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [data, setData] = useState(
    new Date().toISOString().substring(0, 10)
  );

  const resetForm = () => {
    setContaOrigemId("");
    setContaDestinoId("");
    setValor("");
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

  const valorNumerico = Number.parseFloat(valor);
  const formularioValido =
    contaOrigemId &&
    contaDestinoId &&
    contaOrigemId !== contaDestinoId &&
    valorNumerico > 0;

  const handleSubmit = async () => {
    if (!formularioValido || criarTransferencia.isPending) return;

    try {
      // ✅ Usa mutateAsync do React Query
      await criarTransferencia.mutateAsync({
        contaOrigemId,
        contaDestinoId,
        valor: valorNumerico,
        descricao,
        data,
      });

      // ✅ Toast automático (no hook)
      // ✅ Cache invalidado automaticamente (no hook)
      onClose();
    } catch {
      // ✅ Erro já tratado no hook (toast automático)
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Transferência entre contas
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
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
                        <span
                          className={`text-xs font-medium ${
                            Number(conta.saldoAtual) >= 0
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        >
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
                        <span
                          className={`text-xs font-medium ${
                            Number(conta.saldoAtual) >= 0
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        >
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

          {/* Valor */}
          <div>
            <label className="text-sm font-medium mb-1.5 block text-gray-700 dark:text-gray-300">
              Valor
            </label>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="R$ 0,00"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              disabled={criarTransferencia.isPending}
              className="dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-500"
            />
          </div>

          {/* Data */}
          <div>
            <label className="text-sm font-medium mb-1.5 block text-gray-700 dark:text-gray-300">
              Data
            </label>
            <Input
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              disabled={criarTransferencia.isPending}
              className="dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
            />
          </div>

          {/* Descrição */}
          <div>
            <label className="text-sm font-medium mb-1.5 block text-gray-700 dark:text-gray-300">
              Descrição (opcional)
            </label>
            <Input
              placeholder="Ex: Transferência para poupança"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              disabled={criarTransferencia.isPending}
              className="dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-500"
            />
          </div>

          {/* ✅ Erro do React Query */}
          {criarTransferencia.isError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
              <p className="text-sm text-red-600 dark:text-red-400">
                {criarTransferencia.error?.message ||
                  "Erro ao criar transferência"}
              </p>
            </div>
          )}

          {/* Resumo da transferência */}
          {contaOrigemId && contaDestinoId && valorNumerico > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3 space-y-2">
              <p className="text-xs font-medium text-blue-900 dark:text-blue-300">
                📋 Resumo da transferência
              </p>
              <div className="space-y-1 text-xs text-blue-800 dark:text-blue-400">
                <div className="flex justify-between">
                  <span>De:</span>
                  <span className="font-medium">
                    {contasAtivas.find((c) => c.id === contaOrigemId)?.nome}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Para:</span>
                  <span className="font-medium">
                    {contasAtivas.find((c) => c.id === contaDestinoId)?.nome}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Valor:</span>
                  <span className="font-semibold">
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

        <DialogFooter className="mt-6">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={criarTransferencia.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!formularioValido || criarTransferencia.isPending}
          >
            {criarTransferencia.isPending
              ? "Transferindo..."
              : "Confirmar Transferência"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}