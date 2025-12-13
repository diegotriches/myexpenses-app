import { useEffect, useState, useCallback } from "react";
import { Transacao } from "@/types/transacao";

type TipoExclusao = "unica" | "todas_parcelas" | "toda_recorrencia";

export function useMovimentacoes() {
  const [movimentacoes, setMovimentacoes] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // =========================
  // Carregar movimentações
  // =========================
  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/transacoes");
      if (!res.ok) throw new Error("Falha ao carregar movimentações");
      const data = (await res.json()) as Transacao[];
      setMovimentacoes(data);
    } catch (err) {
      console.error("useMovimentacoes.carregar:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // =========================
  // Salvar (criar / editar)
  // =========================
  const salvar = useCallback(
    async (dados: Transacao) => {
      try {
        const isUpdate = !!(dados.id && dados.id > 0);
        const url = isUpdate
          ? `/api/transacoes/${dados.id}`
          : "/api/transacoes";
        const method = isUpdate ? "PUT" : "POST";

        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dados),
        });

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(
            `Falha ao salvar movimentação: ${res.status} ${text}`
          );
        }

        await carregar();
      } catch (err) {
        console.error("useMovimentacoes.salvar:", err);
        throw err;
      }
    },
    [carregar]
  );

  // =========================
  // Função auxiliar: excluir por ID
  // =========================
  const excluirPorId = async (id: number) => {
    const res = await fetch(`/api/transacoes/${id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `Falha ao excluir movimentação: ${res.status} ${text}`
      );
    }
  };

  // =========================
  // Exclusão única
  // =========================
  const excluirUnica = async (id: number) => {
    await excluirPorId(id);
    setMovimentacoes((prev) => prev.filter((m) => m.id !== id));
  };

  // =========================
  // Exclusão de todas as parcelas
  // =========================
  const excluirParcelamento = async (parcelamentoId: string) => {
    const parcelas = movimentacoes.filter(
      (m) => m.parcelamentoId === parcelamentoId
    );

    for (const parcela of parcelas) {
      await excluirPorId(parcela.id);
    }

    setMovimentacoes((prev) =>
      prev.filter((m) => m.parcelamentoId !== parcelamentoId)
    );
  };

  // =========================
  // Exclusão de toda recorrência
  // =========================
  const excluirRecorrencia = async (recorrenciaId: string) => {
    const recorrentes = movimentacoes.filter(
      (m) => m.recorrenciaId === recorrenciaId
    );

    for (const mov of recorrentes) {
      await excluirPorId(mov.id);
    }

    setMovimentacoes((prev) =>
      prev.filter((m) => m.recorrenciaId !== recorrenciaId)
    );
  };

  // =========================
  // Exclusão inteligente (pública)
  // =========================
  const excluir = useCallback(
    async (id: number, tipo: TipoExclusao = "unica") => {
      try {
        const mov = movimentacoes.find((m) => m.id === id);
        if (!mov) return;

        if (tipo === "unica") {
          await excluirUnica(id);
          return;
        }

        if (tipo === "todas_parcelas" && mov.parcelamentoId) {
          await excluirParcelamento(mov.parcelamentoId);
          return;
        }

        if (tipo === "toda_recorrencia" && mov.recorrenciaId) {
          await excluirRecorrencia(mov.recorrenciaId);
          return;
        }
      } catch (err) {
        console.error("useMovimentacoes.excluir:", err);
        throw err;
      }
    },
    [movimentacoes]
  );

  // =========================
  // Load inicial
  // =========================
  useEffect(() => {
    carregar();
  }, [carregar]);

  return {
    movimentacoes,
    loading,
    carregar,
    salvar,
    excluir,
  };
}