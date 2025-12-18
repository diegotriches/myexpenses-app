import { useCallback, useEffect, useState } from "react";
import { Conta, CreateContaDTO } from "@/types/conta";
import api from "@/services/api";

export type UpdateContaDTO = {
  nome?: string;
  tipo?: "BANCARIA" | "CARTAO";
  ativo?: boolean;
  observacoes?: string | null;
  banco?: string | null;
  bandeira?: string | null;
  ultimosDigitos?: string | null;
  limite?: number | null;
  fechamentoFatura?: number | null;
  vencimentoFatura?: number | null;
};

interface UseContasReturn {
  contas: Conta[];
  loading: boolean;
  error: string | null;
  carregarContas: () => Promise<void>;
  criarConta: (data: CreateContaDTO) => Promise<void>;
  atualizarConta: (id: string, data: UpdateContaDTO) => Promise<void>;
  removerConta: (id: string) => Promise<void>;
}

export function useContas(): UseContasReturn {
  const [contas, setContas] = useState<Conta[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const carregarContas = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data } = await api.get<Conta[]>("/contas");
      setContas(data);
    } catch (err) {
      console.error(err);
      setError("Erro ao carregar contas");
    } finally {
      setLoading(false);
    }
  }, []);

  const criarConta = useCallback(async (data: CreateContaDTO) => {
    setLoading(true);
    setError(null);

    try {
      const payload: CreateContaDTO = {
        ...data,
        saldoInicial: Number(data.saldoInicial) || 0,
      };

      const { data: contaCriada } = await api.post<Conta>(
        "/contas",
        payload
      );

      setContas((prev) => [...prev, contaCriada]);
    } catch (err) {
      console.error(err);
      setError("Erro ao criar conta");
    } finally {
      setLoading(false);
    }
  }, []);

  const atualizarConta = useCallback(
    async (id: string, data: UpdateContaDTO) => {
      setLoading(true);
      setError(null);

      try {
        const { data: contaAtualizada } = await api.put<Conta>(
          `/contas/${id}`,
          data
        );

        setContas((prev) =>
          prev.map((c) =>
            c.id === contaAtualizada.id ? contaAtualizada : c
          )
        );
      } catch (err) {
        console.error(err);
        setError("Erro ao atualizar conta");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const removerConta = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      await api.delete(`/contas/${id}`);
      setContas((prev) => prev.filter((c) => c.id !== id));
    } catch (err: any) {
      if (err.response?.status !== 404) {
        console.error(err);
        setError("Erro ao remover conta");
        throw err;
      }
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