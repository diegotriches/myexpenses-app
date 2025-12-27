import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface CartaoExclusaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  cardName: string;
  possuiDependencias?: boolean; // se o cartão possui faturas ou transações
}

export function CartaoExclusaoModal({
  isOpen,
  onClose,
  onConfirm,
  cardName,
  possuiDependencias = false,
}: CartaoExclusaoModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Excluir cartão</DialogTitle>
        </DialogHeader>

        <div className="py-4 text-sm text-gray-600">
          {possuiDependencias ? (
            <p>
              O cartão <strong>{cardName}</strong> possui transações ou faturas vinculadas e não pode ser excluído.
            </p>
          ) : (
            <p>
              Tem certeza que deseja excluir o cartão <strong>{cardName}</strong>? Esta ação não pode ser desfeita.
            </p>
          )}
        </div>

        <DialogFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={possuiDependencias}>
            Excluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}