import { useState, useEffect } from "react";

import { Transacao } from "@/types/transacao";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type TipoExclusao = "unica" | "todas_parcelas" | "toda_recorrencia";

interface Props {
  open: boolean;
  onClose: () => void;
  transacao: Transacao | null;
  onConfirmar: (tipo: TipoExclusao) => void;
}

export default function ConfirmarExclusaoModal({
  open,
  onClose,
  transacao,
  onConfirmar,
}: Props) {
  const isParcelada = !!transacao?.parcelamentoId;
  const isRecorrente = !!transacao?.recorrenciaId;

  const [tipoExclusao, setTipoExclusao] = useState<TipoExclusao>("unica");

  const tipoValido =
    tipoExclusao === "unica" ||
    (isParcelada && tipoExclusao === "todas_parcelas") ||
    (isRecorrente && tipoExclusao === "toda_recorrencia");

  useEffect(() => {
    setTipoExclusao("unica");
  }, [transacao]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Excluir Movimentação</DialogTitle>
        </DialogHeader>

        <p className="text-gray-700 mb-3">
          Tem certeza que deseja excluir:
          <br />
          <strong>{transacao?.descricao}</strong>?
        </p>

        {isParcelada ? (
          <div className="space-y-2 mb-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={tipoExclusao === "unica"}
                onChange={() => setTipoExclusao("unica")}
              />
              Somente esta parcela
            </label>

            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={tipoExclusao === "todas_parcelas"}
                onChange={() => setTipoExclusao("todas_parcelas")}
              />
              Todas as parcelas
            </label>
          </div>
        ) : isRecorrente ? (
          <div className="space-y-2 mb-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={tipoExclusao === "unica"}
                onChange={() => setTipoExclusao("unica")}
              />
              Somente esta ocorrência
            </label>

            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={tipoExclusao === "toda_recorrencia"}
                onChange={() => setTipoExclusao("toda_recorrencia")}
              />
              Toda a recorrência
            </label>
          </div>
        ) : null}


        {/* Exclusão simples */}
        <div className="flex justify-end gap-3 mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>

          <Button
            className="bg-red-600 hover:bg-red-800"
            disabled={!transacao || !tipoValido}
            onClick={() => onConfirmar(tipoExclusao)}
          >
            Excluir
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}