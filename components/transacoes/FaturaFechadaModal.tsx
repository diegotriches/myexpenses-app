import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function FaturaFechadaModal({ open, onClose }: Props) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm dark:bg-gray-900 dark:border-gray-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
            Fatura fechada
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Esta transação pertence a uma fatura já{" "}
            <strong className="text-gray-900 dark:text-white">fechada ou paga</strong>.
            Editar agora pode gerar inconsistências no histórico financeiro.
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Para corrigir este valor, crie uma nova transação com os ajustes necessários.
          </p>
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={onClose} className="bg-blue-700 text-white hover:bg-blue-800 w-full sm:w-auto">
            Entendido
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}