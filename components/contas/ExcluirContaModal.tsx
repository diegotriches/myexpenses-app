"use client";

import { Button } from "@/components/ui/button";
import { Archive, Loader2 } from "lucide-react";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { useUsoConta } from "@/hooks/useContas";
import { Conta } from "@/types/conta";
import { useHideValues } from "@/contexts/HideValuesContext";
import { formatarMoeda } from "@/utils/formatadores";

interface Props {
  open: boolean;
  conta: Conta | null;
  loadingExcluir?: boolean;
  loadingArquivar?: boolean;
  onClose: () => void;
  onArquivar: () => void;
  onExcluir: () => void;
}

const plural = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`;

export default function ExcluirContaModal({
  open,
  conta,
  loadingExcluir = false,
  loadingArquivar = false,
  onClose,
  onArquivar,
  onExcluir,
}: Props) {
  const { mask } = useHideValues();
  const { data: uso, isLoading, isError } = useUsoConta(conta?.id, open);
  const ocupado = loadingExcluir || loadingArquivar;

  // O que será apagado junto com a conta
  const apagados: string[] = [];
  // O que permanece no histórico, sem conta vinculada
  const mantidos: string[] = [];

  if (uso) {
    if (uso.lancamentosExtrato > 0) apagados.push(`${plural(uso.lancamentosExtrato, "lançamento", "lançamentos")} do extrato da conta`);
    if (uso.transferencias > 0) apagados.push(`${plural(uso.transferencias, "transferência", "transferências")} (o saldo da outra conta não muda)`);
    if (uso.aplicacoes > 0) apagados.push(`${plural(uso.aplicacoes, "aplicação", "aplicações")}, com aportes, resgates e rendimentos`);

    if (uso.transacoes > 0) mantidos.push(`${plural(uso.transacoes, "transação", "transações")} (continuam nos relatórios, sem conta vinculada)`);
    if (uso.faturasPagas > 0) mantidos.push(`${plural(uso.faturasPagas, "fatura paga", "faturas pagas")} por esta conta`);
    if (uso.cartoesVinculados > 0) mantidos.push(`${plural(uso.cartoesVinculados, "cartão vinculado", "cartões vinculados")} (perdem o vínculo)`);
    if (uso.recorrencias > 0) mantidos.push(`${plural(uso.recorrencias, "recorrência", "recorrências")} (perdem a conta)`);
  }

  return (
    <ConfirmDialog
      aberto={open}
      onFechar={onClose}
      titulo={<>Remover conta &quot;{conta?.nome}&quot;</>}
      onConfirmar={onExcluir}
      textoConfirmar="Excluir definitivamente"
      carregando={loadingExcluir}
      bloqueado={loadingArquivar}
      confirmarDesabilitado={isLoading}
      className="max-w-lg"
    >

        <div className="space-y-4 text-sm text-gray-600 dark:text-gray-400">
          {/* Opção 1 — arquivar */}
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-2">
            <p className="font-medium text-gray-900 dark:text-white">
              {conta?.ativo ? "Desativar (recomendado)" : "Conta já está inativa"}
            </p>
            <p>
              A conta deixa de ser usada, mas todo o histórico é mantido e você pode reativá-la depois.
              Use esta opção se você apenas encerrou a conta no banco.
            </p>
            {conta?.ativo && (
              <Button variant="outline" size="sm" onClick={onArquivar} disabled={ocupado}>
                {loadingArquivar ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Archive className="w-4 h-4 mr-2" />}
                Desativar conta
              </Button>
            )}
          </div>

          {/* Opção 2 — excluir */}
          <div className="rounded-lg border border-red-200 dark:border-red-900 p-3 space-y-2">
            <p className="font-medium text-red-600 dark:text-red-400">Excluir definitivamente</p>

            {isLoading && <p className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Verificando o que será afetado...</p>}
            {isError && <p>Não foi possível verificar o que será afetado. Você ainda pode excluir.</p>}

            {uso && (
              <>
                {apagados.length > 0 && (
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Será apagado:</p>
                    <ul className="list-disc pl-5">{apagados.map((t) => <li key={t}>{t}</li>)}</ul>
                  </div>
                )}
                {mantidos.length > 0 && (
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Será mantido:</p>
                    <ul className="list-disc pl-5">{mantidos.map((t) => <li key={t}>{t}</li>)}</ul>
                  </div>
                )}
                {apagados.length === 0 && mantidos.length === 0 && <p>Esta conta não tem nenhum movimento.</p>}

                {uso.aplicacoesAtivas > 0 && (
                  <p className="rounded bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 p-2">
                    Há {plural(uso.aplicacoesAtivas, "aplicação ativa", "aplicações ativas")} ({mask(formatarMoeda(uso.valorAplicado))}).
                    Resgate antes de excluir, senão esse valor deixa de aparecer no app.
                  </p>
                )}
                {uso.saldoAtual !== 0 && (
                  <p className="rounded bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 p-2">
                    O saldo atual da conta é {mask(formatarMoeda(uso.saldoAtual))} e deixará de entrar no patrimônio.
                  </p>
                )}
              </>
            )}
            <p className="font-medium">Esta ação não pode ser desfeita.</p>
          </div>
        </div>
    </ConfirmDialog>
  );
}