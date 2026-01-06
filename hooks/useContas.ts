import { useCallback, useEffect, useState } from "react";
import { Conta } from "@/types/conta";
import { contaService } from "@/services/contaService";

export function useContas() {
  const [contas, setContas] = useState<Conta[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const carregarContas = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await contaService.listar();
      setContas(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro ao carregar contas");
    } finally {
      setLoading(false);
    }
  }, []);

  const criarConta = useCallback(async (dados: any) => {
    setLoading(true);
    setError(null);

    try {
      const novaConta = await contaService.criar(dados);
      setContas((prev) => [...prev, novaConta]);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro ao criar conta");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const atualizarConta = useCallback(async (id: string, dados: any) => {
    setLoading(true);
    setError(null);

    try {
      const contaAtualizada = await contaService.atualizar(id, dados);
      setContas((prev) =>
        prev.map((c) => (c.id === id ? contaAtualizada : c))
      );
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro ao atualizar conta");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const removerConta = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      await contaService.remover(id);
      setContas((prev) => prev.filter((c) => c.id !== id));
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro ao remover conta");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarContas();
  }, [carregarContas]);

  return {
    contas,
    loading,
    error,
    carregarContas,
    criarConta,
    atualizarConta,
    removerConta,
  };
}