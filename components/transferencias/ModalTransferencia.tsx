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

  const contasBancarias = contas.filter(
    (c) => c.tipo === "BANCARIA" && c.ativo
  );

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
          <Select
            value={contaOrigemId}
            onValueChange={setContaOrigemId}
            disabled={loading}>
            <SelectTrigger>
              <SelectValue placeholder="Conta de origem" />
            </SelectTrigger>
            <SelectContent>
              {contasBancarias.map((conta) => (
                <SelectItem key={conta.id} value={conta.id}>
                  {conta.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={contaDestinoId}
            onValueChange={setContaDestinoId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Conta de destino" />
            </SelectTrigger>
            <SelectContent>
              {contasBancarias
                .filter((c) => c.id !== contaOrigemId)
                .map((conta) => (
                  <SelectItem key={conta.id} value={conta.id}>
                    {conta.nome}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>

          <Input
            type="number"
            min="0"
            step="0.01"
            placeholder="Valor"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
          />

          <Input
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
          />

          <Input
            placeholder="Descrição (opcional)"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
          />

          {error && (
            <p className="text-sm text-red-600">{error}</p>
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
            {loading ? "Transferindo..." : "Transferir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}