import { useCallback, useState, useEffect } from "react";
import { transferenciaService } from "@/services/transferenciaService";
import { usePeriodo } from "@/contexts/PeriodoContext";
import { useContas } from "@/hooks/useContas";

export function useTransferencias() {
  const { mesSelecionado, anoSelecionado } = usePeriodo();
  const [transferencias, setTransferencias] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [idParaExcluir, setIdParaExcluir] = useState<string | null>(null);

  const { carregarContas } = useContas();

  const carregar = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await transferenciaService.listar({
        ano: anoSelecionado,
        mes: mesSelecionado + 1,
      });
      setTransferencias(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro ao carregar transferências");
    } finally {
      setLoading(false);
    }
  }, [anoSelecionado, mesSelecionado]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const transferir = useCallback(async (dados: any) => {
    setLoading(true);
    setError(null);

    try {
      await transferenciaService.criar(dados);
      await Promise.all([carregarContas(), carregar()]);
      setModalOpen(false);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro ao criar transferência");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [carregarContas, carregar]);

  const excluir = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      await transferenciaService.remover(id);
      await Promise.all([carregarContas(), carregar()]);
      setIdParaExcluir(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro ao excluir transferência");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [carregarContas, carregar]);

  const abrirModalCriar = useCallback(() => setModalOpen(true), []);
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