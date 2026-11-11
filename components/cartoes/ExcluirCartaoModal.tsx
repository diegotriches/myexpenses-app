import ConfirmDialog from "@/components/common/ConfirmDialog";

interface CartaoExclusaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  cardName: string;
  possuiDependencias?: boolean; // se o cartão possui faturas ou transações
}

export function ExcluirCartaoModal({
  isOpen,
  onClose,
  onConfirm,
  cardName,
  possuiDependencias = false,
}: CartaoExclusaoModalProps) {
  return (
    <ConfirmDialog
      aberto={isOpen}
      onFechar={onClose}
      titulo="Excluir cartão"
      onConfirmar={onConfirm}
      confirmarDesabilitado={possuiDependencias}
      textoConfirmar={possuiDependencias ? "Não é possível excluir" : "Excluir"}
    >
      <div className="py-2 text-sm text-gray-600 dark:text-gray-400">
        {possuiDependencias ? (
          <div className="space-y-3">
            <p>
              O cartão <strong className="text-gray-900 dark:text-white">{cardName}</strong> possui
              transações ou faturas vinculadas e não pode ser excluído.
            </p>
            <div className="bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-900 rounded-lg p-3">
              <p className="text-xs text-orange-800 dark:text-orange-200">
                💡 Para excluir este cartão, primeiro remova todas as transações e faturas vinculadas a ele.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p>
              Tem certeza que deseja excluir o cartão <strong className="text-gray-900 dark:text-white">{cardName}</strong>?
              Esta ação não pode ser desfeita.
            </p>
            <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 rounded-lg p-3">
              <p className="text-xs text-red-800 dark:text-red-200">
                ⚠️ Todas as informações relacionadas a este cartão serão permanentemente perdidas.
              </p>
            </div>
          </div>
        )}
      </div>
    </ConfirmDialog>
  );
}
