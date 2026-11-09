"use client";

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
import { AlertTriangle, Loader2, Trash2, X, ArrowRight } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Categoria } from "@/types/categoria";

import { useRemoverCategoria } from "@/hooks/useCategorias";
import { useToast } from "@/hooks/use-toast";

interface Props {
  aberto: boolean;
  onClose: () => void;
  categoria: Categoria | null;
}

// Resposta de GET /api/categorias/[id]/uso
interface UsoCategoria {
  transacoes: number;
  recorrencias: number;
  destinos: string[];
  bloqueada: boolean;
}

export default function ConfirmDeleteModal({
  aberto,
  onClose,
  categoria,
}: Props) {
  const removerCategoria = useRemoverCategoria();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const loading = removerCategoria.isPending;

  // ✅ NOVO: quantas movimentações serão movidas e para onde. Os hooks
  // ficam ANTES do `if (!categoria) return null` (regras de hooks do React).
  const { data: uso, isLoading: carregandoUso } = useQuery<UsoCategoria>({
    queryKey: ["uso-categoria", categoria?.id], // não pode começar com "categorias"
    queryFn: async () => {
      const res = await fetch(`/api/categorias/${categoria!.id}/uso`);
      if (!res.ok) throw new Error("Erro ao verificar o uso da categoria");
      return res.json();
    },
    enabled: aberto && !!categoria,
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const excluir = async () => {
    if (!categoria) return;

    const movidas = uso?.transacoes ?? 0;
    const destinosTexto = uso?.destinos?.join(" e ") ?? "";

    try {
      await removerCategoria.mutateAsync(categoria.id);

      // ✅ NOVO: excluir uma categoria agora também altera movimentações e
      // recorrências — as listas/telas que usam esses dados precisam
      // recarregar (o hook já cuida do cache de categorias)
      queryClient.invalidateQueries({ queryKey: ["transacoes"] });
      queryClient.invalidateQueries({ queryKey: ["recorrencias"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });

      if (movidas > 0) {
        toast({
          title: "Movimentações reclassificadas",
          description: `${movidas} ${movidas === 1 ? "movimentação foi movida" : "movimentações foram movidas"} para "${destinosTexto}".`,
        });
      }

      onClose();
    } catch (err: any) {
      // Toast de erro vem automaticamente do hook
      console.error("Erro ao excluir:", err);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  if (!categoria) return null;

  const semUso = !!uso && uso.transacoes === 0 && uso.recorrencias === 0;

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
              <strong className="font-semibold">&quot;{categoria.nome}&quot;</strong>?
            </AlertDescription>
          </Alert>

          {/* ✅ ATUALIZADO: o que vai acontecer com as movimentações */}
          <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 p-3 rounded-lg space-y-2">
            {carregandoUso ? (
              <p className="flex items-center gap-2 text-xs">
                <Loader2 size={14} className="animate-spin" />
                Verificando movimentações...
              </p>
            ) : uso?.bloqueada ? (
              <p className="text-xs text-red-600 dark:text-red-400">
                Esta categoria recebe as movimentações das categorias excluídas
                e não pode ser removida.
              </p>
            ) : semUso ? (
              <p className="text-xs">
                Nenhuma movimentação ou recorrência usa esta categoria.
              </p>
            ) : uso ? (
              <>
                <p className="font-medium text-gray-700 dark:text-gray-300">
                  O que acontece com as movimentações:
                </p>
                <p className="flex items-start gap-2 text-xs">
                  <ArrowRight size={14} className="mt-0.5 flex-shrink-0" />
                  <span>
                    {uso.transacoes}{" "}
                    {uso.transacoes === 1 ? "movimentação será movida" : "movimentações serão movidas"}
                    {uso.recorrencias > 0 &&
                      ` e ${uso.recorrencias} ${uso.recorrencias === 1 ? "recorrência será atualizada" : "recorrências serão atualizadas"}`}{" "}
                    para <strong>{uso.destinos.join(" e ")}</strong>.
                  </span>
                </p>
                <p className="text-xs">
                  Nos relatórios, esses valores passam a aparecer nessa categoria.
                </p>
              </>
            ) : (
              <p className="text-xs">
                As movimentações desta categoria serão movidas para &quot;Outras despesas&quot;
                ou &quot;Outras receitas&quot;, conforme o tipo.
              </p>
            )}
            <p className="text-xs">Esta ação é permanente e irreversível.</p>
          </div>
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
            disabled={loading || carregandoUso || !!uso?.bloqueada}
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