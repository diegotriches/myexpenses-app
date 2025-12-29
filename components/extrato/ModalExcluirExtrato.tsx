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

interface ExtratoItem {
  id: string;
  data: string;
  tipo: "entrada" | "saida";
  descricao: string;
  valor: number;
  origem: "TRANSACAO_MANUAL" | "PAGAMENTO_FATURA" | "TRANSFERENCIA" | "AJUSTE" | "ESTORNO";
}

interface Props {
  open: boolean;
  onClose: () => void;
  item: ExtratoItem | null;
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
          icon: <Info className="h-6 w-6 text-blue-600" />,
        };

      case "TRANSFERENCIA":
        return {
          titulo: "Confirmar exclusão de transferência",
          descricao:
            "Ao excluir esta transferência, o valor será devolvido à conta de origem e removido da conta de destino. Esta ação não pode ser desfeita.",
          podeExcluir: true,
          icon: <AlertTriangle className="h-6 w-6 text-orange-600" />,
        };

      case "TRANSACAO_MANUAL":
        return {
          titulo: "Confirmar exclusão de transação",
          descricao:
            "Esta transação será removida do extrato e da página de movimentações. O saldo da conta será recalculado. Esta ação não pode ser desfeita.",
          podeExcluir: true,
          icon: <AlertTriangle className="h-6 w-6 text-red-600" />,
        };

      case "PAGAMENTO_FATURA":
        return {
          titulo: "Confirmar cancelamento de pagamento",
          descricao:
            "Ao cancelar este pagamento, o valor será devolvido à conta e a fatura do cartão será reaberta. Esta ação não pode ser desfeita.",
          podeExcluir: true,
          icon: <AlertTriangle className="h-6 w-6 text-orange-600" />,
        };

      case "ESTORNO":
        return {
          titulo: "Confirmar exclusão de estorno",
          descricao:
            "Este estorno será removido do extrato e o saldo será recalculado. Esta ação não pode ser desfeita.",
          podeExcluir: true,
          icon: <AlertTriangle className="h-6 w-6 text-red-600" />,
        };

      default:
        return {
          titulo: "Confirmar exclusão",
          descricao: "Este lançamento será removido do extrato.",
          podeExcluir: true,
          icon: <AlertTriangle className="h-6 w-6 text-red-600" />,
        };
    }
  };

  const { titulo, descricao, podeExcluir, icon } = getMensagemPorOrigem();

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            {icon}
            <AlertDialogTitle>{titulo}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-3">
            <p>{descricao}</p>

            <div className="bg-muted p-3 rounded-md space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Data:</span>
                <span className="font-medium">
                  {new Date(item.data).toLocaleDateString("pt-BR")}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Descrição:</span>
                <span className="font-medium">{item.descricao}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Valor:</span>
                <span
                  className={`font-bold ${
                    item.tipo === "entrada" ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {item.tipo === "entrada" ? "+" : "-"} R$ {item.valor.toFixed(2)}
                </span>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          {podeExcluir && (
            <AlertDialogAction
              onClick={async () => {
                await onConfirmar();
                onClose();
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              {item.origem === "PAGAMENTO_FATURA" ? "Cancelar Pagamento" : "Confirmar Exclusão"}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}