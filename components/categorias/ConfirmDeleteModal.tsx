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
import api from "@/services/api";
import { Categoria } from "app/(dashboard)/categorias/page";
import { useToast } from "@/hooks/use-toast";

interface Props {
  aberto: boolean;
  onClose: () => void;
  categoria: Categoria | null;
  refresh: () => void;
}

export default function ConfirmDeleteModal({
  aberto,
  onClose,
  categoria,
  refresh
}: Props) {
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const { toast } = useToast();

  const excluir = async () => {
    if (!categoria) return;

    try {
      setLoading(true);
      setErro(null);

      await api.delete(`/categorias/${categoria.id}`);

      toast({
        title: "Categoria excluída!",
        description: `"${categoria.nome}" foi removida com sucesso.`,
      });

      refresh();
      onClose();
    } catch (err: any) {
      console.error("Erro ao excluir:", err);
      
      const mensagem = err.response?.data?.message ||
                      err.response?.data?.error ||
                      "Erro ao excluir categoria. Tente novamente.";
      
      setErro(mensagem);
      
      toast({
        title: "Erro ao excluir",
        description: mensagem,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setErro(null);
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

          {/* Erro */}
          {erro && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{erro}</AlertDescription>
            </Alert>
          )}
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