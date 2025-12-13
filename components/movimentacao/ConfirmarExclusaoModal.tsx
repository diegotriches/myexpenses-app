import { Transacao } from "@/types/transacao";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onClose: () => void;
  transacao: Transacao | null;
  onConfirmar: () => void;
}

export default function ConfirmarExclusaoModal({
  open,
  onClose,
  transacao,
  onConfirmar,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Excluir Movimentação</DialogTitle>
        </DialogHeader>

        <p className="text-gray-700 mb-4">
          Tem certeza que deseja excluir a movimentação:
          <br />
          <strong>{transacao?.descricao}</strong>?
        </p>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>

          <Button className="bg-red-600 hover:bg-red-800" onClick={onConfirmar}>
            Excluir
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
