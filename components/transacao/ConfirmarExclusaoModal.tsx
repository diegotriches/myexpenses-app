import { useState } from "react";

import { Transacao } from "@/types/transacao";
import ConfirmDialog from "@/components/common/ConfirmDialog";

type TipoExclusao = "unica" | "todas_parcelas" | "toda_recorrencia";

interface Props {
  open: boolean;
  onClose: () => void;
  transacao: Transacao | null;
  onConfirmar: (tipo: TipoExclusao) => void;
  loading?: boolean;
}

export default function ConfirmarExclusaoModal({
  open,
  onClose,
  transacao,
  onConfirmar,
  loading = false,
}: Props) {
  const isParcelada = !!transacao?.parcelamentoId;
  const isRecorrente = !!transacao?.recorrenciaId;
  const isTransferencia = !!transacao?.transferenciaId;

  const [tipoExclusao, setTipoExclusao] = useState<TipoExclusao>("unica");

  const tipoValido =
    tipoExclusao === "unica" ||
    (isParcelada && tipoExclusao === "todas_parcelas") ||
    (isRecorrente && tipoExclusao === "toda_recorrencia");

  // Ajusta o estado durante o render quando as dependências mudam (inclusive na montagem)
  const [depsAnteriores, setDepsAnteriores] = useState<readonly unknown[] | null>(null);
  const depsAtuais: readonly unknown[] = [transacao];
  if (!depsAnteriores || depsAtuais.some((d, i) => !Object.is(d, depsAnteriores[i]))) {
    setDepsAnteriores(depsAtuais);
    setTipoExclusao("unica");
  }

  // Opções de alcance da exclusão (parcelas ou recorrência)
  const opcoes: { valor: TipoExclusao; rotulo: string }[] = isTransferencia
    ? []
    : isParcelada
      ? [{ valor: "unica", rotulo: "Somente esta parcela" }, { valor: "todas_parcelas", rotulo: "Todas as parcelas" }]
      : isRecorrente
        ? [{ valor: "unica", rotulo: "Somente esta ocorrência" }, { valor: "toda_recorrencia", rotulo: "Toda a recorrência" }]
        : [];

  return (
    <ConfirmDialog
      aberto={open}
      onFechar={onClose}
      titulo={isTransferencia ? "Excluir Transferência" : "Excluir Movimentação"}
      onConfirmar={() => onConfirmar(isTransferencia ? "unica" : tipoExclusao)}
      carregando={loading}
      confirmarDesabilitado={!transacao || (!isTransferencia && !tipoValido)}
      className="max-w-sm"
    >
      <p className="text-gray-700 dark:text-gray-300">
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

      {opcoes.length > 0 && (
        <div className="space-y-2">
          {opcoes.map((o) => (
            <label key={o.valor} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={tipoExclusao === o.valor}
                onChange={() => setTipoExclusao(o.valor)}
                disabled={loading}
                className="cursor-pointer"
              />
              <span className="text-gray-700 dark:text-gray-300">{o.rotulo}</span>
            </label>
          ))}
        </div>
      )}
    </ConfirmDialog>
  );
}
