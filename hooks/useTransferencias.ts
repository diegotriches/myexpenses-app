import { useCallback, useState, useEffect } from "react";
import api from "@/services/api";
import { useContas } from "@/hooks/useContas";
import { usePeriodo } from "@/contexts/PeriodoContext";

export interface CreateTransferenciaDTO {
  contaOrigemId: string;
  contaDestinoId: string;
  valor: number;
  descricao?: string;
  data: Date | string;
}

export interface Transferencia {
  id: string; // referenciaId que vincula as duas movimentações
  contaOrigemId: string;
  contaOrigemNome: string;
  contaDestinoId: string;
  contaDestinoNome: string;
  valor: number;
  descricao: string;
  data: string;
  createdAt: string;
}

interface UseTransferenciasReturn {
  transferencias: Transferencia[];
  loading: boolean;
  error: string | null;
  modalOpen: boolean;
  idParaExcluir: string | null;
  carregar: () => Promise<void>;
  transferir: (data: CreateTransferenciaDTO) => Promise<void>;
  excluir: (transferenciaId: string) => Promise<void>;
  abrirModalCriar: () => void;
  fecharModal: () => void;
  setIdParaExcluir: (id: string | null) => void;
}

export function useTransferencias(): UseTransferenciasReturn {
  const { mesSelecionado, anoSelecionado } = usePeriodo();
  const [transferencias, setTransferencias] = useState<Transferencia[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [idParaExcluir, setIdParaExcluir] = useState<string | null>(null);

  const { carregarContas } = useContas();

  // Carregar transferências do período
  const carregar = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        ano: String(anoSelecionado),
        mes: String(mesSelecionado + 1),
      });

      const response = await api.get(`/transferencias?${params.toString()}`);
      setTransferencias(response.data);
    } catch (err: any) {
      console.error("Erro ao carregar transferências:", err);
      setError(
        err?.response?.data?.message || "Erro ao carregar transferências"
      );
    } finally {
      setLoading(false);
    }
  }, [anoSelecionado, mesSelecionado]);

  // Carregar ao montar e quando período mudar
  useEffect(() => {
    carregar();
  }, [carregar]);

  // Criar transferência
  const transferir = useCallback(
    async (data: CreateTransferenciaDTO) => {
      setLoading(true);
      setError(null);

      try {
        await api.post("/transferencias", {
          ...data,
          data:
            data.data instanceof Date
              ? data.data.toISOString()
              : data.data,
        });

        // Recarrega contas e transferências
        await Promise.all([
          carregarContas(),
          carregar(),
        ]);

        // Fecha modal após sucesso
        setModalOpen(false);
      } catch (err: any) {
        console.error("Erro ao realizar transferência:", err);
        setError(
          err?.response?.data?.message ||
            "Erro ao realizar transferência"
        );
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [carregarContas, carregar]
  );

  // Excluir transferência (estorna)
  const excluir = useCallback(
    async (transferenciaId: string) => {
      setLoading(true);
      setError(null);

      try {
        await api.delete(`/transferencias/${transferenciaId}`);

        // Recarrega contas e transferências
        await Promise.all([
          carregarContas(),
          carregar(),
        ]);

        setIdParaExcluir(null);
      } catch (err: any) {
        console.error("Erro ao excluir transferência:", err);
        setError(
          err?.response?.data?.message ||
            "Erro ao excluir transferência"
        );
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [carregarContas, carregar]
  );

  // Controle de Modal
  const abrirModalCriar = useCallback(() => {
    setModalOpen(true);
  }, []);

  const fecharModal = useCallback(() => {
    setModalOpen(false);
    setError(null);
  }, []);

  return {
    transferencias,
    loading,
    error,
    modalOpen,
    idParaExcluir,
    carregar,
    transferir,
    excluir,
    abrirModalCriar,
    fecharModal,
    setIdParaExcluir,
  };
}