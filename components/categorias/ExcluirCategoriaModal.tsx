"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Loader2, Trash2, ArrowRight } from "lucide-react";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { useQueryClient } from "@tanstack/react-query";
import { Categoria } from "@/types/categoria";

import { useRemoverCategoria, useUsoCategoria } from "@/hooks/useCategorias";
import { useToast } from "@/hooks/use-toast";

interface Props {
  aberto: boolean;
  onClose: () => void;
  categoria: Categoria | null;
}

export default function ExcluirCategoriaModal({
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
  const { data: uso, isLoading: carregandoUso } = useUsoCategoria(categoria?.id, aberto);

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
    } catch (err) {
      // Toast de erro vem automaticamente do hook
      console.error("Erro ao excluir:", err);
    }
  };

  if (!categoria) return null;

  const semUso = !!uso && uso.transacoes === 0 && uso.recorrencias === 0;

  return (
    <ConfirmDialog
      aberto={aberto}
      onFechar={onClose}
      titulo="Confirmar Exclusão"
      descricao="Esta ação não pode ser desfeita"
      onConfirmar={excluir}
      textoConfirmar="Excluir Categoria"
      iconeConfirmar={<Trash2 size={16} className="mr-2" />}
      carregando={loading}
      confirmarDesabilitado={carregandoUso || !!uso?.bloqueada}
      className="sm:max-w-[440px]"
    >

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
    </ConfirmDialog>
  );
}