import { useEffect, useState, useCallback } from "react";
import { Transacao } from "@/types/transacao";

export function useTransacoes() {
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modal
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [idEdicao, setIdEdicao] = useState<number | null>(null);

  // Exclusão
  const [idParaExcluir, setIdParaExcluir] = useState<number | null>(null);

  // Buscar lista
  const carregarTransacoes = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await fetch("/api/transacoes");
      const data = await resp.json();
      setTransacoes(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarTransacoes();
  }, [carregarTransacoes]);

  // Adicionar
  const adicionarTransacao = async (nova: Transacao) => {
    const resp = await fetch("/api/transacoes", {
      method: "POST",
      body: JSON.stringify(nova),
    });

    if (!resp.ok) throw new Error("Erro ao adicionar transação");

    await carregarTransacoes();
  };

  // Editar
  const editarTransacao = async (atualizada: Transacao) => {
    const resp = await fetch(`/api/transacoes/${atualizada.id}`, {
      method: "PUT",
      body: JSON.stringify(atualizada),
    });

    if (!resp.ok) throw new Error("Erro ao editar transação");

    await carregarTransacoes();
  };

  // Excluir
  const excluirTransacao = async (id: number) => {
    const resp = await fetch(`/api/transacoes/${id}`, {
      method: "DELETE",
    });

    if (!resp.ok) throw new Error("Erro ao excluir transação");

    setIdParaExcluir(null);
    await carregarTransacoes();
  };

  // Controle do modal
  const abrirModalCriar = () => {
    setIdEdicao(null);
    setModalOpen(true);
  };

  const abrirModalEditar = (id: number) => {
    setIdEdicao(id);
    setModalOpen(true);
  };

  const fecharModal = () => {
    setModalOpen(false);
    setIdEdicao(null);
  };

  return {
    transacoes,
    loading,
    carregarTransacoes,
    adicionarTransacao,
    editarTransacao,
    excluirTransacao,

    // Exclusão
    idParaExcluir,
    setIdParaExcluir,

    // Modal + edição
    modalOpen,
    abrirModalCriar,
    abrirModalEditar,
    fecharModal,
    idEdicao,
  };
}
