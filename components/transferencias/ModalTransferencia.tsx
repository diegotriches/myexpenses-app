import { useEffect, useState } from "react";
import { useContas } from "@/hooks/useContas";
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
}

export function ModalTransferencia({ open, onClose }: ModalTransferenciaProps) {
  const { contas } = useContas();
  const { transferir, loading } = useTransferencias();

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

  // Resetar ao abrir/fechar
  useEffect(() => {
    if (!open) {
      setContaOrigemId("");
      setContaDestinoId("");
      setValor("");
      setDescricao("");
      setData(new Date().toISOString().substring(0, 10));
    }
  }, [open]);

  const valorNumerico = Number(valor);
  const formularioValido =
    contaOrigemId &&
    contaDestinoId &&
    contaOrigemId !== contaDestinoId &&
    valorNumerico > 0;

  const handleSubmit = async () => {
    if (!formularioValido) return;

    await transferir({
      contaOrigemId,
      contaDestinoId,
      valor: valorNumerico,
      descricao,
      data,
    });

    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Transferência entre contas</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Select value={contaOrigemId} onValueChange={setContaOrigemId}>
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

          <Select value={contaDestinoId} onValueChange={setContaDestinoId}>
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
        </div>

        <DialogFooter className="mt-6">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!formularioValido || loading}
          >
            Transferir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}