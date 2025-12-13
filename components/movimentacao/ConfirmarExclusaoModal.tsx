import { Transacao } from "@/types/transacao";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onClose: () => void;
  transacao: Transacao | null;
  onConfirmar: (
    tipo: "unica" | "todas_parcelas" | "toda_recorrencia"
  ) => void;
}

export default function ConfirmarExclusaoModal({
  open,
  onClose,
  transacao,
  onConfirmar,
}: Props) {
  const isParcelada = !!transacao?.parcelamentoId;
  const isRecorrente = !!transacao?.recorrenciaId;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Excluir Movimentação</DialogTitle>
        </DialogHeader>

        <p className="text-gray-700 mb-4">
          Tem certeza que deseja excluir a movimentação:
          <br />
          <strong>{transacao?.descricao || "(Sem descrição)"}</strong>?
        </p>

        {/* Parcelada */}
        {isParcelada && (
          <div className="flex flex-col gap-3">
            <Button
              className="bg-red-600 hover:bg-red-800"
              onClick={() => onConfirmar("unica")}
            >
              Excluir somente esta parcela
            </Button>

            <Button
              variant="outline"
              onClick={() => onConfirmar("todas_parcelas")}
            >
              Excluir todas as parcelas
            </Button>

            <Button variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        )}

        {/* Recorrente */}
        {isRecorrente && !isParcelada && (
          <div className="flex flex-col gap-3">
            <Button
              className="bg-red-600 hover:bg-red-800"
              onClick={() => onConfirmar("unica")}
            >
              Excluir somente esta ocorrência
            </Button>

            <Button
              variant="outline"
              onClick={() => onConfirmar("toda_recorrencia")}
            >
              Excluir toda a recorrência
            </Button>

            <Button variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        )}

        {/* Exclusão simples */}
        {!isParcelada && !isRecorrente && (
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>

            <Button
              className="bg-red-600 hover:bg-red-800"
              onClick={() => onConfirmar("unica")}
            >
              Excluir
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}