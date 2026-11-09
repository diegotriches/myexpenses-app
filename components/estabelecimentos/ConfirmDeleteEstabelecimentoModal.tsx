"use client";

import { AlertTriangle } from "lucide-react";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { Estabelecimento } from "@/types/estabelecimento";

interface Props {
  aberto: boolean;
  onClose: () => void;
  estabelecimento: Estabelecimento | null;
  onConfirmar: () => void;
  loading?: boolean;
}

export default function ConfirmDeleteEstabelecimentoModal({
  aberto,
  onClose,
  estabelecimento,
  onConfirmar,
  loading = false,
}: Props) {
  const temTransacoes = (estabelecimento?.totalTransacoes ?? 0) > 0;

  return (
    <ConfirmDialog
      aberto={aberto}
      onFechar={onClose}
      titulo="Excluir estabelecimento"
      onConfirmar={onConfirmar}
      carregando={loading}
    >
      <div className="space-y-4 py-2">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Tem certeza que deseja excluir{" "}
          <span className="font-semibold text-gray-900 dark:text-white">
            &quot;{estabelecimento?.nome}&quot;
          </span>
          ? Esta ação não pode ser desfeita.
        </p>

        {/* Aviso quando há transações vinculadas */}
        {temTransacoes && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800 dark:text-amber-200">
              <p className="font-medium mb-0.5">
                {estabelecimento?.totalTransacoes}{" "}
                {estabelecimento?.totalTransacoes === 1
                  ? "transação vinculada"
                  : "transações vinculadas"}
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                As transações serão mantidas, mas deixarão de estar associadas a este estabelecimento.
              </p>
            </div>
          </div>
        )}
      </div>
    </ConfirmDialog>
  );
}
