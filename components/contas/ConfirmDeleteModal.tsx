"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface Props {
  open: boolean;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDeleteModal({
  open,
  title = "Confirmar exclusão",
  description = "Essa ação não poderá ser desfeita.",
  confirmLabel = "Excluir",
  cancelLabel = "Cancelar",
  loading = false,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <DialogTitle className="text-red-600 dark:text-red-400">
              {title}
            </DialogTitle>
          </div>
        </DialogHeader>

        <p className="text-sm text-gray-600 dark:text-gray-400 pl-[52px]">
          {description}
        </p>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </Button>

          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Excluindo..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}