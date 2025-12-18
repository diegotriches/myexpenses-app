import { useEffect, useState, useCallback } from "react";
import { Transacao } from "@/types/transacao";

type TipoExclusao = "unica" | "todas_parcelas" | "toda_recorrencia" | "transferencia";
type TipoEdicao = "unica" | "todas_parcelas" | "toda_recorrencia";

export function useTransacoes() {
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState(true);

  // UI / Controle
  const [modalOpen, setModalOpen] = useState(false);
  const [idEdicao, setIdEdicao] = useState<number | null>(null);
  const [idParaExcluir, setIdParaExcluir] = useState<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  // Carregar transações
  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/transacoes");
      if (!res.ok) throw new Error("Falha ao carregar transações");
      const data = (await res.json()) as Transacao[];
      setTransacoes(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Criar / Atualizar
  const salvar = useCallback(
    async (dados: Transacao) => {
      const isUpdate = !!dados.id;
      const url = isUpdate
        ? `/api/transacoes/${dados.id}`
        : "/api/transacoes";

      const res = await fetch(url, {
        method: isUpdate ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados),
      });

      if (!res.ok) {
        throw new Error("Erro ao salvar transação");
      }

      await carregar();
    },
    [carregar]
  );

  // Edição avançada
  const editar = useCallback(
    async (dados: Transacao, tipo: TipoEdicao) => {
      if (tipo === "unica") {
        await salvar(dados);
        return;
      }

      const baseData = new Date(dados.data);

      const futuras = transacoes.filter((t) => {
        if (tipo === "todas_parcelas") {
          return (
            t.parcelamentoId === dados.parcelamentoId &&
            new Date(t.data) >= baseData
          );
        }

        if (tipo === "toda_recorrencia") {
          return (
            t.recorrenciaId === dados.recorrenciaId &&
            new Date(t.data) >= baseData
          );
        }

        return false;
      });

      for (const t of futuras) {
        const res = await fetch(`/api/transacoes/${t.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...t,
            descricao: dados.descricao,
            categoria: dados.categoria,
            valor: dados.valor,
            formaPagamento: dados.formaPagamento,
            cartaoId: dados.cartaoId,
          }),
        });

        if (!res.ok) {
          throw new Error(`Erro ao editar transação ${t.id}`);
        }
      }

      await carregar();
    },
    [transacoes, salvar, carregar]
  );

  // Exclusão (com bloqueio de transferência)
  const excluir = useCallback(
    async (id: number, tipo: TipoExclusao = "unica") => {
      setErro(null);

      const transacao = transacoes.find((t) => t.id === id);

      if (!transacao) {
        throw new Error("Transação não encontrada");
      }

      // Transferência: exclui sempre em conjunto
      if (transacao.transferenciaId) {
        const res = await fetch(
          `/api/transferencias/${transacao.transferenciaId}`,
          { method: "DELETE" }
        );

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(text || "Erro ao excluir transferência");
        }

        setIdParaExcluir(null);
        await carregar();
        return;
      }

      // Transação comum
      const res = await fetch(
        `/api/transacoes/${id}?tipo=${tipo}`,
        { method: "DELETE" }
      );

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "Erro ao excluir transação");
      }

      setIdParaExcluir(null);
      await carregar();
    },
    [transacoes, carregar]
  );

  // Controle de Modal
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
    erro,

    carregar,
    salvar,
    editar,
    excluir,

    // UI
    modalOpen,
    abrirModalCriar,
    abrirModalEditar,
    fecharModal,

    idEdicao,
    idParaExcluir,
    setIdParaExcluir,
  };
}