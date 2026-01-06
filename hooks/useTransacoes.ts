import { useEffect, useState, useCallback } from "react";
import { Transacao } from "@/types/transacao";
import { transacaoService } from "@/services/transacaoService";
import { usePeriodo } from "@/contexts/PeriodoContext";

export function useTransacoes() {
  const { mesSelecionado, anoSelecionado } = usePeriodo();
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [idEdicao, setIdEdicao] = useState<string | null>(null);
  const [idParaExcluir, setIdParaExcluir] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);

    try {
      const data = await transacaoService.listar({
        ano: anoSelecionado,
        mes: mesSelecionado + 1,
      });
      setTransacoes(data);
    } catch (err: any) {
      console.error(err);
      setErro(err.message || "Erro ao carregar transações");
    } finally {
      setLoading(false);
    }
  }, [anoSelecionado, mesSelecionado]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const criar = useCallback(async (dados: any) => {
    setErro(null);
    try {
      await transacaoService.criar(dados);
      await carregar();
      if (modalOpen) fecharModal();
    } catch (err: any) {
      setErro(err.message);
      throw err;
    }
  }, [carregar, modalOpen]);

  const excluir = useCallback(async (id: string, tipo?: any) => {
    setErro(null);
    try {
      await transacaoService.remover(id, tipo);
      setIdParaExcluir(null);
      await carregar();
    } catch (err: any) {
      setErro(err.message);
      throw err;
    }
  }, [carregar]);

  const abrirModalCriar = useCallback(() => {
    setIdEdicao(null);
    setErro(null);
    setModalOpen(true);
  }, []);

  const abrirModalEditar = useCallback((id: string) => {
    setIdEdicao(id);
    setErro(null);
    setModalOpen(true);
  }, []);

  const fecharModal = useCallback(() => {
    setModalOpen(false);
    setIdEdicao(null);
    setErro(null);
  }, []);

  return {
    transacoes,
    loading,
    erro,
    carregar,
    criar,
    excluir,
    modalOpen,
    abrirModalCriar,
    abrirModalEditar,
    fecharModal,
    idEdicao,
    idParaExcluir,
    setIdParaExcluir,
  };
}