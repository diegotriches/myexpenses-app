"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MdAdd } from "react-icons/md";
import { BsArrowLeftRight, BsBank } from "react-icons/bs";
import { AlertCircle } from "lucide-react";

import FormMovimentacaoModal from "@/components/movimentacao/FormMovimentacaoModal";
import MovimentacaoTabela from "@/components/movimentacao/MovimentacaoTabela";
import ConfirmarEdicaoModal from "@/components/movimentacao/ConfirmarEdicaoModal";
import ConfirmarExclusaoModal from "@/components/movimentacao/ConfirmarExclusaoModal";
import FiltrosMovimentacoes, { FiltrosState } from "@/components/movimentacao/FiltrosMovimentacoes";
import { usePeriodo } from '@/contexts/PeriodoContext';

import { useTransacoes } from "@/hooks/useTransacoes";
import { useCartoes } from "@/hooks/useCartoes";
import { useContas } from "@/hooks/useContas";
import { Transacao } from "@/types/transacao";

export default function MovimentacoesConteudo() {
  const router = useRouter();
  
  const {
    transacoes,
    loading,
    criar,
    atualizar, // ✅ NOVO - hook deve retornar isso
    excluir,
  } = useTransacoes();

  const { cartoes, loading: loadingCartoes } = useCartoes();
  const { contas, loading: loadingContas } = useContas();

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

  // Verificar se há contas ativas
  const temContasAtivas = useMemo(() => {
    return contas.some(conta => conta.ativo);
  }, [contas]);

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
    // Verificar se há contas antes de abrir o modal
    if (!temContasAtivas) {
      return; // Não abre o modal se não houver contas
    }
    setEditando(null);
    setTipoEdicao("unica");
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

  // ✅ CORRIGIDO: Função unificada para salvar (criar ou editar)
  async function handleSalvar(dados: any) {
    try {
      if (editando) {
        // ✅ MODO EDIÇÃO: Chamar atualizar() ao invés de excluir + criar
        await atualizar(editando.id, dados, tipoEdicao);
      } else {
        // ✅ MODO CRIAÇÃO: Criar nova transação
        await criar(dados);
      }
      
      setOpenModal(false);
      setEditando(null);
      setTipoEdicao("unica");
    } catch (error) {
      console.error("Erro ao salvar transação:", error);
      throw error; // Re-throw para o modal tratar
    }
  }

  // ✅ Estado vazio - Sem contas cadastradas
  const EmptyStateNoConta = () => (
    <div className="text-center py-16 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg border-2 border-dashed border-yellow-300 dark:border-yellow-700">
      <div className="flex justify-center mb-4">
        <div className="relative">
          <BsBank className="text-6xl text-yellow-500 dark:text-yellow-400" />
          <AlertCircle className="absolute -top-2 -right-2 text-red-500 bg-white dark:bg-gray-800 rounded-full" size={24} />
        </div>
      </div>
      
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        Nenhuma conta cadastrada
      </h3>
      
      <p className="text-gray-700 dark:text-gray-300 mb-2 max-w-md mx-auto">
        Você precisa cadastrar pelo menos uma conta bancária antes de registrar movimentações.
      </p>
      
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
        As movimentações são vinculadas a contas para calcular saldos e gerar relatórios precisos.
      </p>
      
      <Button 
        onClick={() => router.push('/contas')} 
        size="lg"
        className="bg-blue-700 hover:bg-blue-900"
      >
        <BsBank className="mr-2 text-xl" />
        Cadastrar Primeira Conta
      </Button>
    </div>
  );

  // Loading state
  if (loadingContas) {
    return (
      <div className="max-w-[1200px] mx-auto p-6">
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
        </div>
      </div>
    );
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
            disabled={!temContasAtivas}
            className="flex items-center gap-2 bg-blue-700 hover:bg-blue-900 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            title={!temContasAtivas ? "Cadastre uma conta primeiro" : ""}
          >
            <MdAdd className="text-xl" />
            Nova Movimentação
          </Button>
        </div>
        <hr className="border-t border-gray-300 dark:border-gray-700" />
      </div>

      {/* ✅ Verificação de contas */}
      {!temContasAtivas ? (
        <EmptyStateNoConta />
      ) : (
        <>
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
        </>
      )}

      {/* Modais */}
      <FormMovimentacaoModal
        open={openModal}
        onOpenChange={(open) => {
          setOpenModal(open);
          if (!open) {
            setEditando(null);
            setTipoEdicao("unica");
          }
        }}
        transacaoEdicao={editando}
        modoEdicao={tipoEdicao}
        salvar={handleSalvar}
      />

      <ConfirmarExclusaoModal
        open={modalExcluir}
        onClose={() => {
          setModalExcluir(false);
          setItemExcluir(null);
        }}
        transacao={itemExcluir}
        onConfirmar={handleExcluir}
      />

      <ConfirmarEdicaoModal
        open={modalEdicao}
        onClose={() => {
          setModalEdicao(false);
        }}
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