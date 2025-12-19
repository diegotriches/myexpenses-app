"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MdAdd } from "react-icons/md";
import { BsArrowLeftRight } from "react-icons/bs";

import FormMovimentacaoModal from "@/components/movimentacao/FormMovimentacaoModal";
import MovimentacaoTabela from "@/components/movimentacao/MovimentacaoTabela";
import ConfirmarEdicaoModal from "@/components/movimentacao/ConfirmarEdicaoModal";
import ConfirmarExclusaoModal from "@/components/movimentacao/ConfirmarExclusaoModal";
import { usePeriodo } from '@/components/PeriodoContext';

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

  const [contaSelecionadaId, setContaSelecionadaId] = useState<string>("");

  const [modalEdicao, setModalEdicao] = useState(false);
  const [tipoEdicao, setTipoEdicao] =
    useState<"unica" | "todas_parcelas" | "toda_recorrencia">("unica");

  const todasParcelas = editando?.parcelamentoId
    ? transacoes.filter(mov => mov.parcelamentoId === editando.parcelamentoId)
    : [];

  const todasRecorrencias = editando?.recorrenciaId
    ? transacoes.filter(mov => mov.recorrenciaId === editando.recorrenciaId)
    : [];

  const [modalExcluir, setModalExcluir] = useState(false);
  const [itemExcluir, setItemExcluir] = useState<Transacao | null>(null);

  const { mesSelecionado, anoSelecionado } = usePeriodo();

  const movimentacoesFiltradas = transacoes.filter((mov) => {
    if (!mov.data) return false;

    const [ano, mes] = mov.data.split("T")[0].split("-").map(Number);

    return mes - 1 === mesSelecionado && ano === anoSelecionado;
  });

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
      // CASO 1: Transferência
      if (itemExcluir.transferenciaId) {
        const res = await fetch(
          `/api/transferencias/${itemExcluir.transferenciaId}`,
          { method: "DELETE" }
        );

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(text || "Erro ao excluir transferência");
        }
      }
      // CASO 2: Transação normal
      else {
        await excluir(itemExcluir.id, tipo);
      }

      setModalExcluir(false);
      setItemExcluir(null);
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <div className="max-w-[1000px] mx-auto p-6 space-y-8">

      <div>
        <div className="flex items-center gap-2 mb-3">
          <BsArrowLeftRight className="text-3xl text-blue-700" />
          <h1 className="text-2xl font-bold text-gray-900">Movimentação</h1>
        </div>
        <p className="text-gray-600 mb-6">
          Visualize e gerencie suas movimentações financeiras, incluindo
          entradas, saídas e pagamentos.
        </p>
        <hr className="border-t border-gray-300 my-4" />
      </div>

      <div className="flex justify-end mb-6">
        <Button
          onClick={abrirNovo}
          className="flex items-center gap-2 bg-blue-700 hover:bg-blue-900 text-white"
        >
          <MdAdd className="text-xl" />
          Nova Movimentação
        </Button>
      </div>

      <MovimentacaoTabela
        movimentacoes={movimentacoesFiltradas}
        loading={loading || loadingCartoes}
        cartoes={cartoes}
        onEditar={editarItem}
        onExcluir={confirmarExclusao}
      />

      <FormMovimentacaoModal
        open={openModal}
        onOpenChange={setOpenModal}
        transacaoEdicao={editando}
        contaId={contaSelecionadaId}
        todasParcelas={todasParcelas}
        todasRecorrencias={todasRecorrencias}
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