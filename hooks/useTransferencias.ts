import { useCallback, useState } from "react";
import api from "@/services/api";

export interface CreateTransferenciaDTO {
  contaOrigemId: string;
  contaDestinoId: string;
  valor: number;
  descricao?: string;
  data: Date | string;
}

interface UseTransferenciasReturn {
  loading: boolean;
  error: string | null;
  transferir: (data: CreateTransferenciaDTO) => Promise<void>;
}

export function useTransferencias(): UseTransferenciasReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const transferir = useCallback(async (data: CreateTransferenciaDTO) => {
    setLoading(true);
    setError(null);

    try {
      await api.post("/transferencias", {
        ...data,
        data: data.data instanceof Date ? data.data.toISOString() : data.data,
      });
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.message || "Erro ao realizar transferência");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    transferir,
  };
}