import { useEffect, useState, useCallback } from "react";
import { Transacao } from "@/types/transacao";

export function useMovimentacoes() {
  const [movimentacoes, setMovimentacoes] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

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

  const salvar = useCallback(
    async (dados: Transacao) => {
      try {
        const isUpdate = !!(dados.id && dados.id > 0);
        const url = isUpdate ? `/api/transacoes/${dados.id}` : "/api/transacoes";
        const method = isUpdate ? "PUT" : "POST";

        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dados),
        });

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(`Falha ao salvar movimentação: ${res.status} ${text}`);
        }

        await carregar();
      } catch (err) {
        console.error("useMovimentacoes.salvar:", err);
        throw err;
      }
    },
    [carregar]
  );

  const excluir = useCallback(
    async (id: number) => {
      try {
        const res = await fetch(`/api/transacoes/${id}`, { method: "DELETE" });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(`Falha ao excluir movimentação: ${res.status} ${text}`);
        }

        setMovimentacoes((prev) => prev.filter((m) => m.id !== id));
      } catch (err) {
        console.error("useMovimentacoes.excluir:", err);
        throw err;
      }
    },
    []
  );

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
