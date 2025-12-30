import { useEffect, useState } from "react";
import { Conta } from "@/types/conta";
import { useTransferencias } from "@/hooks/useTransferencias";
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
  const { transferir, loading, error } = useTransferencias();

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
    if (!formularioValido || loading) return;

    try {
      await transferir({
        contaOrigemId,
        contaDestinoId,
        valor: valorNumerico,
        descricao,
        data,
      });

      onClose();
    } catch {
      // erro já tratado no hook
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Transferência entre contas</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Conta de origem</label>
            <Select
              value={contaOrigemId}
              onValueChange={setContaOrigemId}
              disabled={loading}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a conta de origem" />
              </SelectTrigger>
              <SelectContent>
                {contasAtivas.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Nenhuma conta cadastrada
                  </div>
                ) : (
                  contasAtivas.map((conta) => (
                    <SelectItem key={conta.id} value={conta.id}>
                      <div className="flex items-center justify-between w-full gap-3">
                        <span>{conta.nome}</span>
                        <span className={`text-xs font-medium ${
                          Number(conta.saldoAtual) >= 0 
                            ? 'text-green-600 dark:text-green-400' 
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                          }).format(Number(conta.saldoAtual))}
                        </span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Conta de destino</label>
            <Select
              value={contaDestinoId}
              onValueChange={setContaDestinoId}
              disabled={loading || !contaOrigemId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a conta de destino" />
              </SelectTrigger>
              <SelectContent>
                {contasAtivas
                  .filter((c) => c.id !== contaOrigemId)
                  .map((conta) => (
                    <SelectItem key={conta.id} value={conta.id}>
                      <div className="flex items-center justify-between w-full gap-3">
                        <span>{conta.nome}</span>
                        <span className={`text-xs font-medium ${
                          Number(conta.saldoAtual) >= 0 
                            ? 'text-green-600 dark:text-green-400' 
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                          }).format(Number(conta.saldoAtual))}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Valor</label>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="R$ 0,00"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              disabled={loading}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Data</label>
            <Input
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              disabled={loading}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Descrição (opcional)</label>
            <Input
              placeholder="Ex: Transferência para poupança"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              disabled={loading}
            />
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
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
                    {contasAtivas.find(c => c.id === contaOrigemId)?.nome}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Para:</span>
                  <span className="font-medium">
                    {contasAtivas.find(c => c.id === contaDestinoId)?.nome}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Valor:</span>
                  <span className="font-semibold">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format(valorNumerico)}
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
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!formularioValido || loading}
          >
            {loading ? "Transferindo..." : "Confirmar Transferência"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}