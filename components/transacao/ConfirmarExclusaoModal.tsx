import { useState, useEffect } from "react";

import { Transacao } from "@/types/transacao";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

type TipoExclusao = "unica" | "todas_parcelas" | "toda_recorrencia";

interface Props {
  open: boolean;
  onClose: () => void;
  transacao: Transacao | null;
  onConfirmar: (tipo: TipoExclusao) => void;
  loading?: boolean; // ✅ NOVO - Recebe loading do pai
}

export default function ConfirmarExclusaoModal({
  open,
  onClose,
  transacao,
  onConfirmar,
  loading = false, // ✅ NOVO - Default false
}: Props) {
  const isParcelada = !!transacao?.parcelamentoId;
  const isRecorrente = !!transacao?.recorrenciaId;
  const isTransferencia = !!transacao?.transferenciaId;

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
          <DialogTitle>
            {isTransferencia ? "Excluir Transferência" : "Excluir Movimentação"}
          </DialogTitle>
        </DialogHeader>

        <p className="text-gray-700 dark:text-gray-300 mb-3">
          {isTransferencia ? (
            <>
              Tem certeza que deseja excluir esta transferência?
              <br />
              <span className="text-sm text-gray-500 dark:text-gray-400">
                A movimentação de saída e a de entrada serão removidas.
              </span>
            </>
          ) : (
            <>
              Tem certeza que deseja excluir:
              <br />
              <strong className="text-gray-900 dark:text-white">
                {transacao?.descricao || "(Sem descrição)"}
              </strong>
              ?
            </>
          )}
        </p>

        {!isTransferencia && (
          <>
            {isParcelada ? (
              <div className="space-y-2 mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={tipoExclusao === "unica"}
                    onChange={() => setTipoExclusao("unica")}
                    disabled={loading}
                    className="cursor-pointer"
                  />
                  <span className="text-gray-700 dark:text-gray-300">
                    Somente esta parcela
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={tipoExclusao === "todas_parcelas"}
                    onChange={() => setTipoExclusao("todas_parcelas")}
                    disabled={loading}
                    className="cursor-pointer"
                  />
                  <span className="text-gray-700 dark:text-gray-300">
                    Todas as parcelas
                  </span>
                </label>
              </div>
            ) : isRecorrente ? (
              <div className="space-y-2 mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={tipoExclusao === "unica"}
                    onChange={() => setTipoExclusao("unica")}
                    disabled={loading}
                    className="cursor-pointer"
                  />
                  <span className="text-gray-700 dark:text-gray-300">
                    Somente esta ocorrência
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={tipoExclusao === "toda_recorrencia"}
                    onChange={() => setTipoExclusao("toda_recorrencia")}
                    disabled={loading}
                    className="cursor-pointer"
                  />
                  <span className="text-gray-700 dark:text-gray-300">
                    Toda a recorrência
                  </span>
                </label>
              </div>
            ) : null}
          </>
        )}

        <div className="flex justify-end gap-3 mt-4">
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </Button>

          <Button
            className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
            disabled={!transacao || (!isTransferencia && !tipoValido) || loading}
            onClick={() => onConfirmar(isTransferencia ? "unica" : tipoExclusao)}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Excluindo...
              </>
            ) : (
              "Excluir"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}