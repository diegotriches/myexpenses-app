"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, Info } from "lucide-react";
import { MovimentacaoExtrato } from "@/types/conta";

// ✅ CORREÇÃO: Importar função de formatação de data
import { formatarDataParaExibicao } from "@/utils/dateUtils";

interface Props {
  open: boolean;
  onClose: () => void;
  item: MovimentacaoExtrato | null;
  onConfirmar: () => Promise<void>;
}

export default function ModalExcluirExtrato({ open, onClose, item, onConfirmar }: Props) {
  if (!item) return null;

  const getMensagemPorOrigem = () => {
    switch (item.origem) {
      case "AJUSTE":
        return {
          titulo: "Não é possível excluir ajuste de saldo",
          descricao:
            "Ajustes de saldo inicial não podem ser excluídos pois são fundamentais para o histórico da conta. Se necessário, crie um novo ajuste para corrigir o saldo.",
          podeExcluir: false,
          icon: <Info className="h-6 w-6 text-blue-600 dark:text-blue-400" />,
        };

      case "TRANSFERENCIA":
        return {
          titulo: "Confirmar exclusão de transferência",
          descricao:
            "Ao excluir esta transferência, o valor será devolvido à conta de origem e removido da conta de destino. Esta ação não pode ser desfeita.",
          podeExcluir: true,
          icon: <AlertTriangle className="h-6 w-6 text-orange-600 dark:text-orange-400" />,
        };

      case "TRANSACAO_MANUAL":
        return {
          titulo: "Confirmar exclusão de transação",
          descricao:
            "Esta transação será removida do extrato e da página de movimentações. O saldo da conta será recalculado. Esta ação não pode ser desfeita.",
          podeExcluir: true,
          icon: <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />,
        };

      case "PAGAMENTO_FATURA":
        return {
          titulo: "Confirmar cancelamento de pagamento",
          descricao:
            "Ao cancelar este pagamento, o valor será devolvido à conta e a fatura do cartão será reaberta. Esta ação não pode ser desfeita.",
          podeExcluir: true,
          icon: <AlertTriangle className="h-6 w-6 text-orange-600 dark:text-orange-400" />,
        };

      case "ESTORNO":
        return {
          titulo: "Confirmar exclusão de estorno",
          descricao:
            "Este estorno será removido do extrato e o saldo será recalculado. Esta ação não pode ser desfeita.",
          podeExcluir: true,
          icon: <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />,
        };

      default:
        return {
          titulo: "Confirmar exclusão",
          descricao: "Este lançamento será removido do extrato.",
          podeExcluir: true,
          icon: <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />,
        };
    }
  };

  const { titulo, descricao, podeExcluir, icon } = getMensagemPorOrigem();

  // Formatar valor monetário (pt-BR)
  const formatarMoeda = (valor: number): string => {
    return valor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent className="dark:bg-gray-800 dark:border-gray-700">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            {icon}
            <AlertDialogTitle className="text-gray-900 dark:text-white">
              {titulo}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-3 text-gray-600 dark:text-gray-400">
            <p>{descricao}</p>

            <div className="bg-muted dark:bg-gray-900 p-3 rounded-md space-y-1 border border-gray-200 dark:border-gray-700">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground dark:text-gray-500">Data:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {/* ✅ CORRIGIDO: Usar formatarDataParaExibicao */}
                  {formatarDataParaExibicao(item.data)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground dark:text-gray-500">Descrição:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {item.descricao}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground dark:text-gray-500">Valor:</span>
                <span
                  className={`font-bold ${
                    item.tipo === "entrada" 
                      ? "text-green-600 dark:text-green-400" 
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {item.tipo === "entrada" ? "+" : "-"} {formatarMoeda(item.valor)}
                </span>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel className="dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600">
            Cancelar
          </AlertDialogCancel>
          {podeExcluir && (
            <AlertDialogAction
              onClick={async () => {
                await onConfirmar();
                onClose();
              }}
              className="bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
            >
              {item.origem === "PAGAMENTO_FATURA" ? "Cancelar Pagamento" : "Confirmar Exclusão"}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}