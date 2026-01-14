"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Loader2, Trash2, X } from "lucide-react";
import { Categoria } from "@/types/categoria";

// ✅ NOVO: Importar hook React Query
import { useRemoverCategoria } from "@/hooks/useCategorias";

interface Props {
  aberto: boolean;
  onClose: () => void;
  categoria: Categoria | null;
  // ❌ REMOVIDO: refresh: () => void; (não precisa mais)
}

export default function ConfirmDeleteModal({
  aberto,
  onClose,
  categoria,
}: Props) {
  // ✅ NOVO: Hook React Query (substitui api.delete direto)
  const removerCategoria = useRemoverCategoria();

  // ✅ NOVO: Loading vem do hook
  const loading = removerCategoria.isPending;

  // ❌ REMOVIDO: useState para erro (toast automático já mostra erro)

  const excluir = async () => {
    if (!categoria) return;

    try {
      // ✅ NOVO: Usar hook React Query
      await removerCategoria.mutateAsync(categoria.id);

      // ✅ Toast automático vem do hook
      // ✅ Cache invalidado automaticamente
      // ✅ Lista recarregada automaticamente
      
      onClose();
    } catch (err: any) {
      // ✅ Toast de erro também vem automaticamente do hook
      console.error("Erro ao excluir:", err);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  if (!categoria) return null;

  return (
    <Dialog open={aberto} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <AlertTriangle className="text-red-600 dark:text-red-400" size={24} />
            Confirmar Exclusão
          </DialogTitle>
          <DialogDescription>
            Esta ação não pode ser desfeita
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Aviso */}
          <Alert variant="destructive" className="bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-900">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Tem certeza que deseja excluir a categoria{" "}
              <strong className="font-semibold">"{categoria.nome}"</strong>?
            </AlertDescription>
          </Alert>

          {/* Informação adicional */}
          <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
            <p className="font-medium mb-1">⚠️ Atenção:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Esta ação é permanente e irreversível</li>
              <li>Transações vinculadas perderão a categoria</li>
              <li>Relatórios podem ser afetados</li>
            </ul>
          </div>

          {/* ❌ REMOVIDO: Alert de erro manual (toast automático já mostra) */}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            <X size={16} className="mr-2" />
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={excluir}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                Excluindo...
              </>
            ) : (
              <>
                <Trash2 size={16} className="mr-2" />
                Excluir Categoria
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}