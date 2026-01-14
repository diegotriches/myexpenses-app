// src/hooks/useMovimentacaoModal.ts
"use client";

import { useState } from "react";
import { Transacao } from "@/types/transacao";

/**
 * Hook para gerenciar estado do modal de movimentação
 * 
 * @example
 * const { modalOpen, transacaoEdicao, abrirNovo, abrirEdicao, fecharModal } = useMovimentacaoModal();
 * 
 * // Abrir modal para criar
 * <button onClick={abrirNovo}>Nova Transação</button>
 * 
 * // Abrir modal para editar
 * <button onClick={() => abrirEdicao(transacao)}>Editar</button>
 * 
 * // Modal
 * <Modal open={modalOpen} onClose={fecharModal}>
 *   {transacaoEdicao ? "Editar" : "Nova"} Transação
 * </Modal>
 */
export function useMovimentacaoModal() {
  const [modalOpen, setModalOpen] = useState(false);
  const [transacaoEdicao, setTransacaoEdicao] = useState<Transacao | null>(null);

  /**
   * Abre modal para criar nova transação
   */
  function abrirNovo() {
    setTransacaoEdicao(null);
    setModalOpen(true);
  }

  /**
   * Abre modal para editar transação existente
   */
  function abrirEdicao(transacao: Transacao) {
    setTransacaoEdicao(transacao);
    setModalOpen(true);
  }

  /**
   * Fecha modal e limpa transação em edição após animação
   */
  function fecharModal() {
    setModalOpen(false);
    // Aguarda animação de fechamento antes de limpar
    setTimeout(() => setTransacaoEdicao(null), 300);
  }

  return {
    modalOpen,
    transacaoEdicao,
    abrirNovo,
    abrirEdicao,
    fecharModal,
  };
}