import { useCallback, useEffect, useState } from "react";
import { Conta, CreateContaDTO } from "@/types/conta";
import api from "@/services/api";

export type UpdateContaDTO = Partial<
  Omit<Conta, "id" | "createdAt" | "updatedAt">
>;

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
      const response = await api.get<Conta[]>("/contas");
      setContas(response.data);
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
        banco: data.banco || undefined,
        saldoInicial: Number(data.saldoInicial) || 0,
      };

      const response = await api.post<Conta>("/contas", payload);

      // mantém estado sincronizado com backend
      setContas((prev) => [...prev, response.data]);
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
        const response = await api.put<Conta>(`/contas/${id}`, data);
        const contaAtualizada = response.data;

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
