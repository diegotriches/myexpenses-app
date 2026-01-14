import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

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
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="text-red-600 dark:text-red-400" size={20} />
            Excluir cartão
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 text-sm text-gray-600 dark:text-gray-400">
          {possuiDependencias ? (
            <div className="space-y-3">
              <p>
                O cartão <strong className="text-gray-900 dark:text-white">{cardName}</strong> possui 
                transações ou faturas vinculadas e não pode ser excluído.
              </p>
              <div className="bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-900 rounded-lg p-3">
                <p className="text-xs text-orange-800 dark:text-orange-200">
                  💡 Para excluir este cartão, primeiro remova todas as transações e faturas vinculadas a ele.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p>
                Tem certeza que deseja excluir o cartão <strong className="text-gray-900 dark:text-white">{cardName}</strong>? 
                Esta ação não pode ser desfeita.
              </p>
              <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 rounded-lg p-3">
                <p className="text-xs text-red-800 dark:text-red-200">
                  ⚠️ Todas as informações relacionadas a este cartão serão permanentemente perdidas.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            variant="destructive" 
            onClick={onConfirm} 
            disabled={possuiDependencias}
          >
            {possuiDependencias ? "Não é possível excluir" : "Excluir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}