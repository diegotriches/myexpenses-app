"use client";

import { useState } from "react";
import { Transacao } from "@/types/transacao";

export function useMovimentacaoModal() {
  const [modalOpen, setModalOpen] = useState(false);
  const [transacaoEdicao, setTransacaoEdicao] = useState<Transacao | null>(null);

  function abrirNovo() {
    setTransacaoEdicao(null);
    setModalOpen(true);
  }

  function abrirEdicao(transacao: Transacao) {
    setTransacaoEdicao(transacao);
    setModalOpen(true);
  }

  function fecharModal() {
    setModalOpen(false);
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
