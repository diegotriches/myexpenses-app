"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ContaCard from "./ContaCard";
import ContaModal from "./ContaModal";
import ConfirmDeleteModal from "./ConfirmDeleteModal";

import { useContas, useRemoverConta, useCriarConta, useAtualizarConta } from "@/hooks/useContas";
import { Conta, CreateContaDTO, UpdateContaDTO } from "@/types/conta";

export default function ContaList() {
  const { data: contas = [], isLoading: loading, error } = useContas();
  const criarConta = useCriarConta();
  const atualizarConta = useAtualizarConta();
  const removerConta = useRemoverConta();
  const router = useRouter();

  // Estados dos modais
  const [modalEditarAberto, setModalEditarAberto] = useState(false);
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false);
  const [contaSelecionada, setContaSelecionada] = useState<Conta | undefined>();

  // Handlers
  const handleEditar = (conta: Conta) => {
    setContaSelecionada(conta);
    setModalEditarAberto(true);
  };

  const handleSalvarEdicao = async (dados: CreateContaDTO | UpdateContaDTO) => {
    if (!contaSelecionada) return;

    try {
      await atualizarConta.mutateAsync({
        id: contaSelecionada.id,
        dados: dados as UpdateContaDTO,
      });
      setModalEditarAberto(false);
      setContaSelecionada(undefined);
    } catch (error) {
      console.error("Erro ao atualizar conta:", error);
    }
  };

  const handleAbrirConfirmacao = (conta: Conta) => {
    setContaSelecionada(conta);
    setModalExcluirAberto(true);
  };

  const handleConfirmarExclusao = async () => {
    if (!contaSelecionada) return;

    try {
      await removerConta.mutateAsync(contaSelecionada.id);
      setModalExcluirAberto(false);
      setContaSelecionada(undefined);
    } catch (error) {
      console.error("Erro ao excluir conta:", error);
    }
  };

  const handleCancelarExclusao = () => {
    setModalExcluirAberto(false);
    setContaSelecionada(undefined);
  };

  const handleExtrato = (conta: Conta) => {
    router.push(`/contas/${conta.id}/extrato`);
  };

  const handleTransferir = (contaOrigemId: string) => {
    router.push(`/transferencias?origem=${contaOrigemId}`);
  };

  // Loading state
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border rounded-lg p-4 animate-pulse bg-white dark:bg-gray-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
              </div>
            </div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
            <div className="flex gap-2">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded flex-1" />
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded flex-1" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-12 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-900">
        <p className="text-red-600 dark:text-red-400 font-medium mb-2">
          Erro ao carregar contas
        </p>
        <p className="text-sm text-red-500 dark:text-red-400">
          {error.message}
        </p>
      </div>
    );
  }

  // Empty state
  if (contas.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700">
        <p className="text-gray-600 dark:text-gray-400 font-medium">
          Nenhuma conta cadastrada.
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
          Adicione sua primeira conta para começar.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Lista de Contas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {contas.map((conta) => (
          <ContaCard
            key={conta.id}
            conta={conta}
            onEditar={handleEditar}
            onExcluir={handleAbrirConfirmacao}
            onExtrato={handleExtrato}
            onTransferir={handleTransferir}
          />
        ))}
      </div>

      {/* Modal de Edição */}
      <ContaModal
        open={modalEditarAberto}
        onOpenChange={setModalEditarAberto}
        onSalvar={handleSalvarEdicao}
        contaInicial={contaSelecionada}
      />

      {/* Modal de Confirmação de Exclusão */}
      <ConfirmDeleteModal
        open={modalExcluirAberto}
        title="Excluir Conta"
        description={`Tem certeza que deseja excluir a conta "${contaSelecionada?.nome}"? Esta ação não poderá ser desfeita e todas as movimentações serão removidas.`}
        confirmLabel="Sim, excluir conta"
        cancelLabel="Cancelar"
        loading={removerConta.isPending}
        onConfirm={handleConfirmarExclusao}
        onCancel={handleCancelarExclusao}
      />
    </>
  );
}