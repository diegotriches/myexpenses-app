"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { MdAdd } from "react-icons/md";
import { BsArrowLeftRight } from "react-icons/bs";

import FormMovimentacaoModal from "@/components/movimentacao/FormMovimentacaoModal";
import MovimentacaoTabela from "@/components/movimentacao/MovimentacaoTabela";
import ConfirmarEdicaoModal from "@/components/movimentacao/ConfirmarEdicaoModal";
import ConfirmarExclusaoModal from "@/components/movimentacao/ConfirmarExclusaoModal";
import FiltrosMovimentacoes, { FiltrosState } from "@/components/movimentacao/FiltrosMovimentacoes";
import { usePeriodo } from '@/contexts/PeriodoContext';

import { useTransacoes } from "@/hooks/useTransacoes";
import { useCartoes } from "@/hooks/useCartoes";
import { Transacao } from "@/types/transacao";

export default function MovimentacoesConteudo() {
  const {
    transacoes,
    loading,
    salvar,
    excluir,
  } = useTransacoes();

  const { cartoes, loading: loadingCartoes } = useCartoes();

  const [openModal, setOpenModal] = useState(false);
  const [editando, setEditando] = useState<Transacao | null>(null);

  const [modalEdicao, setModalEdicao] = useState(false);
  const [tipoEdicao, setTipoEdicao] =
    useState<"unica" | "todas_parcelas" | "toda_recorrencia">("unica");

  const [modalExcluir, setModalExcluir] = useState(false);
  const [itemExcluir, setItemExcluir] = useState<Transacao | null>(null);

  const { mesSelecionado, anoSelecionado } = usePeriodo();

  // Estado dos filtros
  const [filtros, setFiltros] = useState<FiltrosState>({
    tipo: "todas",
    categoria: "",
    formaPagamento: "",
    busca: "",
  });

  // Movimentações filtradas por período
  const movimentacoesPeriodo = useMemo(() => {
    return transacoes.filter((mov) => {
      if (!mov.data) return false;
      const [ano, mes] = mov.data.split("T")[0].split("-").map(Number);
      return mes - 1 === mesSelecionado && ano === anoSelecionado;
    });
  }, [transacoes, mesSelecionado, anoSelecionado]);

  // Aplicar filtros adicionais
  const movimentacoesFiltradas = useMemo(() => {
    return movimentacoesPeriodo.filter((mov) => {
      // Filtro por tipo (receita/despesa)
      if (filtros.tipo !== "todas" && mov.tipo !== filtros.tipo) return false;

      // Filtro por categoria
      if (filtros.categoria && mov.categoria !== filtros.categoria) return false;

      // Filtro por forma de pagamento
      if (filtros.formaPagamento && mov.formaPagamento !== filtros.formaPagamento) return false;

      // Filtro por busca textual
      if (filtros.busca) {
        const busca = filtros.busca.toLowerCase();
        const descricao = mov.descricao?.toLowerCase() || "";
        const categoria = mov.categoria?.toLowerCase() || "";
        if (!descricao.includes(busca) && !categoria.includes(busca)) return false;
      }

      return true;
    });
  }, [movimentacoesPeriodo, filtros]);

  // Extrair opções únicas para os filtros
  const categoriasUnicas = useMemo(() => {
    return Array.from(
      new Set(movimentacoesPeriodo.map(m => m.categoria).filter(Boolean))
    ).sort() as string[];
  }, [movimentacoesPeriodo]);

  const formasPagamentoUnicas = useMemo(() => {
    return Array.from(
      new Set(movimentacoesPeriodo.map(m => m.formaPagamento).filter(Boolean))
    ).sort() as string[];
  }, [movimentacoesPeriodo]);

  function abrirNovo() {
    setEditando(null);
    setOpenModal(true);
  }

  function editarItem(mov: Transacao) {
    const isParcelada = !!mov.parcelamentoId;
    const isRecorrente = !!mov.recorrenciaId;

    setEditando(mov);

    if (isParcelada || isRecorrente) {
      setModalEdicao(true);
    } else {
      setTipoEdicao("unica");
      setOpenModal(true);
    }
  }

  function confirmarExclusao(mov: Transacao) {
    setItemExcluir(mov);
    setModalExcluir(true);
  }

  async function handleExcluir(tipo: "unica" | "todas_parcelas" | "toda_recorrencia") {
    if (!itemExcluir) return;

    try {
      // Proteção contra transferências
      if (itemExcluir.transferenciaId) {
        alert("Transferências devem ser gerenciadas na página de Extrato ou Transferências");
        setModalExcluir(false);
        setItemExcluir(null);
        return;
      }

      await excluir(itemExcluir.id, tipo);

      setModalExcluir(false);
      setItemExcluir(null);
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <div className="max-w-[1200px] mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BsArrowLeftRight className="text-3xl text-blue-700 dark:text-blue-500" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Movimentações
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {movimentacoesFiltradas.length} transação(ões) encontrada(s)
              </p>
            </div>
          </div>

          <Button
            onClick={abrirNovo}
            className="flex items-center gap-2 bg-blue-700 hover:bg-blue-900 text-white"
          >
            <MdAdd className="text-xl" />
            Nova Movimentação
          </Button>
        </div>
        <hr className="border-t border-gray-300 dark:border-gray-700" />
      </div>

      {/* Filtros */}
      <FiltrosMovimentacoes
        filtros={filtros}
        onFiltrosChange={setFiltros}
        categorias={categoriasUnicas}
        formasPagamento={formasPagamentoUnicas}
      />

      {/* Tabela de movimentações */}
      <MovimentacaoTabela
        movimentacoes={movimentacoesFiltradas}
        loading={loading || loadingCartoes}
        cartoes={cartoes}
        onEditar={editarItem}
        onExcluir={confirmarExclusao}
      />

      {/* Modais */}
      <FormMovimentacaoModal
        open={openModal}
        onOpenChange={setOpenModal}
        transacaoEdicao={editando}
        modoEdicao={tipoEdicao}
        salvar={async (d) => {
          await salvar(d);
          setOpenModal(false);
        }}
      />

      <ConfirmarExclusaoModal
        open={modalExcluir}
        onClose={() => setModalExcluir(false)}
        transacao={itemExcluir}
        onConfirmar={handleExcluir}
      />

      <ConfirmarEdicaoModal
        open={modalEdicao}
        onClose={() => setModalEdicao(false)}
        transacao={editando}
        onConfirmar={(tipo) => {
          setTipoEdicao(tipo);
          setModalEdicao(false);
          setOpenModal(true);
        }}
      />
    </div>
  );
}