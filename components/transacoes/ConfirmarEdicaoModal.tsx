import { useState } from "react";
import { Transacao } from "@/types/transacao";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type TipoEdicao = "unica" | "todas_parcelas" | "toda_recorrencia";

interface Props {
  open: boolean;
  onClose: () => void;
  transacao: Transacao | null;
  onConfirmar: (tipo: TipoEdicao) => void;
}

export default function ConfirmarEdicaoModal({
  open,
  onClose,
  transacao,
  onConfirmar,
}: Props) {
  const isParcelada  = !!transacao?.parcelamentoId;
  const isRecorrente = !!transacao?.recorrenciaId;

  const modoEdicao: "parcelada" | "recorrente" | "simples" =
    isRecorrente ? "recorrente" : isParcelada ? "parcelada" : "simples";

  const [tipoEdicao, setTipoEdicao] = useState<TipoEdicao>("unica");

  // Ajusta o estado durante o render quando as dependências mudam (inclusive na montagem)
  const [depsAnteriores, setDepsAnteriores] = useState<readonly unknown[] | null>(null);
  const depsAtuais: readonly unknown[] = [transacao, isParcelada];
  if (!depsAnteriores || depsAtuais.some((d, i) => !Object.is(d, depsAnteriores[i]))) {
    setDepsAnteriores(depsAtuais);
    // ✅ Para parceladas, força sempre "todas_parcelas" — único modo disponível
    if (isParcelada) {
      setTipoEdicao("todas_parcelas");
    } else {
      setTipoEdicao("unica");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Editar Movimentação</DialogTitle>
        </DialogHeader>

        <p className="text-gray-700 dark:text-gray-300 mb-3">
          Como deseja editar a movimentação:
          <br />
          <strong className="text-gray-900 dark:text-white">
            {transacao?.descricao || "(Sem descrição)"}
          </strong>
          ?
        </p>

        {/* ✅ Parcelada: apenas "Todas as parcelas" — sem opção única */}
        {modoEdicao === "parcelada" && (
          <div className="mb-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              As alterações serão aplicadas a <strong>todas as parcelas</strong> deste parcelamento.
            </p>
          </div>
        )}

        {/* Recorrente: mantém as duas opções */}
        {modoEdicao === "recorrente" && (
          <div className="space-y-2 mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={tipoEdicao === "unica"}
                onChange={() => setTipoEdicao("unica")}
                className="cursor-pointer"
              />
              <span className="text-gray-700 dark:text-gray-300">
                Somente esta ocorrência
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={tipoEdicao === "toda_recorrencia"}
                onChange={() => setTipoEdicao("toda_recorrencia")}
                className="cursor-pointer"
              />
              <span className="text-gray-700 dark:text-gray-300">
                Toda a recorrência a partir desta
              </span>
            </label>
          </div>
        )}

        <div className="flex justify-end gap-3 mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={!transacao} onClick={() => onConfirmar(tipoEdicao)} className="bg-blue-700 text-white hover:bg-blue-800">
            Continuar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}