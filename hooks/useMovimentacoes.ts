import { useEffect, useState, useCallback } from "react";
import { Transacao } from "@/types/transacao";

type TipoExclusao = "unica" | "todas_parcelas" | "toda_recorrencia";
type TipoEdicao = "unica" | "todas_parcelas" | "toda_recorrencia";

export function useMovimentacoes() {
  const [movimentacoes, setMovimentacoes] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/transacoes");
      if (!res.ok) throw new Error("Falha ao carregar movimentações");
      const data = (await res.json()) as Transacao[];
      setMovimentacoes(data);
    } finally {
      setLoading(false);
    }
  }, []);

  const salvar = useCallback(
    async (dados: Transacao) => {
      const isUpdate = !!(dados.id && dados.id > 0);
      const url = isUpdate
        ? `/api/transacoes/${dados.id}`
        : "/api/transacoes";

      const res = await fetch(url, {
        method: isUpdate ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados),
      });

      if (!res.ok) {
        throw new Error("Falha ao salvar movimentação");
      }

      await carregar();
    },
    [carregar]
  );

  const editar = useCallback(
    async (dados: Transacao, tipo: TipoEdicao) => {
      if (tipo === "unica") {
        await salvar(dados);
        return;
      }

      const baseData = new Date(dados.data);

      const futuras = movimentacoes.filter((m) => {
        if (tipo === "todas_parcelas") {
          return (
            m.parcelamentoId === dados.parcelamentoId &&
            new Date(m.data) >= baseData
          );
        }

        if (tipo === "toda_recorrencia") {
          return (
            m.recorrenciaId === dados.recorrenciaId &&
            new Date(m.data) >= baseData
          );
        }

        return false;
      });

      for (const mov of futuras) {
        const res = await fetch(`/api/transacoes/${mov.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...mov,
            descricao: dados.descricao,
            categoria: dados.categoria,
            valor: dados.valor,
            formaPagamento: dados.formaPagamento,
            cartaoId: dados.cartaoId,
          }),
        });

        if (!res.ok) {
          throw new Error(`Falha ao editar transação ${mov.id}`);
        }
      }

      await carregar();
    },
    [movimentacoes, salvar, carregar]
  );

  const excluir = useCallback(
    async (id: number, tipo: TipoExclusao = "unica") => {
      const res = await fetch(
        `/api/transacoes/${id}?tipo=${tipo}`,
        { method: "DELETE" }
      );

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Falha ao excluir: ${text}`);
      }

      await carregar();
    },
    [carregar]
  );

  useEffect(() => {
    carregar();
  }, [carregar]);

  return {
    movimentacoes,
    loading,
    carregar,
    salvar,
    editar,
    excluir,
  };
}