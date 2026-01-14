"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MdAdd } from "react-icons/md";
import { BsArrowLeftRight, BsBank } from "react-icons/bs";
import { AlertCircle } from "lucide-react";

import FormMovimentacaoModal from "@/components/transacao/FormMovimentacaoModal";
import MovimentacaoTabela from "@/components/transacao/MovimentacaoTabela";
import ConfirmarEdicaoModal from "@/components/transacao/ConfirmarEdicaoModal";
import ConfirmarExclusaoModal from "@/components/transacao/ConfirmarExclusaoModal";
import FiltrosMovimentacoes, { FiltrosState } from "@/components/transacao/FiltrosMovimentacoes";

// ✅ REACT QUERY HOOKS
import { 
  useTransacoes, 
  useCriarTransacao, 
  useAtualizarTransacao, 
  useExcluirTransacao 
} from "@/hooks/useTransacoes";
import { useCartoes } from "@/hooks/useCartoes";
import { useContas } from "@/hooks/useContas";
import { Transacao, ModoEdicao } from "@/types/transacao";

export default function TransacoesPage() {
  const router = useRouter();

  // ✅ HOOKS REACT QUERY
  const { data: transacoes = [], isLoading: loadingTransacoes } = useTransacoes();
  const { data: cartoes = [], isLoading: loadingCartoes } = useCartoes();
  const { data: contas = [], isLoading: loadingContas } = useContas();

  // ✅ MUTATIONS
  const criarTransacao = useCriarTransacao();
  const atualizarTransacao = useAtualizarTransacao();
  const excluirTransacao = useExcluirTransacao();

  // Estados locais
  const [openModal, setOpenModal] = useState(false);
  const [editando, setEditando] = useState<Transacao | null>(null);

  const [modalEdicao, setModalEdicao] = useState(false);
  const [tipoEdicao, setTipoEdicao] = useState<ModoEdicao>("unica");

  const [modalExcluir, setModalExcluir] = useState(false);
  const [itemExcluir, setItemExcluir] = useState<Transacao | null>(null);

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

  // ✅ OTIMIZADO: Aplica filtros diretamente (sem filtro duplicado de período)
  // useTransacoes() já filtra por período no backend via PeriodoContext
  const movimentacoesFiltradas = useMemo(() => {
    return transacoes.filter((mov) => {
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
  }, [transacoes, filtros]);

  // ✅ Extrair opções únicas para os filtros (usa transacoes diretamente)
  const categoriasUnicas = useMemo(() => {
    return Array.from(
      new Set(transacoes.map(m => m.categoria).filter(Boolean))
    ).sort() as string[];
  }, [transacoes]);

  const formasPagamentoUnicas = useMemo(() => {
    return Array.from(
      new Set(transacoes.map(m => m.formaPagamento).filter(Boolean))
    ).sort() as string[];
  }, [transacoes]);

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

  // ✅ HANDLER DE EXCLUSÃO
  async function handleExcluir(tipo: ModoEdicao) {
    if (!itemExcluir) return;

    try {
      // Proteção contra transferências
      if (itemExcluir.transferenciaId) {
        alert("Transferências devem ser gerenciadas na página de Extrato ou Transferências");
        setModalExcluir(false);
        setItemExcluir(null);
        return;
      }

      await excluirTransacao.mutateAsync({
        id: itemExcluir.id,
        tipo,
      });

      // Fecha modal após sucesso (toast automático)
      setModalExcluir(false);
      setItemExcluir(null);
    } catch (error) {
      console.error("Erro ao excluir:", error);
      // Toast de erro já foi exibido pela mutation
    }
  }

  // ✅ HANDLER UNIFICADO DE SALVAR
  async function handleSalvar(dados: any) {
    try {
      if (editando) {
        // Modo edição
        await atualizarTransacao.mutateAsync({
          id: editando.id,
          dados: {
            ...dados,
            modoEdicao: tipoEdicao,
          },
        });
      } else {
        // Modo criação
        await criarTransacao.mutateAsync(dados);
      }

      // Fecha modal após sucesso (toast automático)
      setOpenModal(false);
      setEditando(null);
      setTipoEdicao("unica");
    } catch (error) {
      console.error("Erro ao salvar transação:", error);
      // Toast de erro já foi exibido pela mutation
      throw error; // Re-throw para o modal tratar (se necessário)
    }
  }

  // ✅ EMPTY STATE - Sem contas cadastradas
  const EmptyStateNoConta = () => (
    <div className="text-center py-12 md:py-16 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg border-2 border-dashed border-yellow-300 dark:border-yellow-700">
      <div className="flex justify-center mb-4">
        <div className="relative">
          <BsBank className="text-5xl md:text-6xl text-yellow-500 dark:text-yellow-400" />
          <AlertCircle className="absolute -top-2 -right-2 text-red-500 bg-white dark:bg-gray-800 rounded-full" size={20} />
        </div>
      </div>

      <h3 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white mb-2 px-4">
        Nenhuma conta cadastrada
      </h3>

      <p className="text-sm md:text-base text-gray-700 dark:text-gray-300 mb-2 max-w-md mx-auto px-4">
        Você precisa cadastrar pelo menos uma conta bancária antes de registrar movimentações.
      </p>

      <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto px-4">
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

  // ✅ LOADING STATE
  const loading = loadingTransacoes || loadingCartoes || loadingContas;

  if (loadingContas) {
    return (
      <div className="max-w-[1200px] mx-auto p-4 md:p-6">
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto p-4 md:p-6 space-y-6">
      {/* ✅ Header - Responsivo */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <BsArrowLeftRight className="text-2xl md:text-3xl text-blue-700 dark:text-blue-500" />
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
              Movimentações
            </h1>
          </div>
        </div>

        <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
          {movimentacoesFiltradas.length} transação(ões) encontrada(s)
        </p>

        <hr className="border-t border-gray-300 dark:border-gray-700 my-4" />
      </div>

      {/* ✅ Botão flutuante mobile - Mesmo padrão de Contas */}
      {temContasAtivas && (
        <Button
          onClick={abrirNovo}
          disabled={criarTransacao.isPending}
          className="md:hidden fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-blue-700 hover:bg-blue-900 z-50"
          size="icon"
        >
          <MdAdd className="text-2xl" />
        </Button>
      )}

      {/* ✅ Verificação de contas */}
      {!temContasAtivas ? (
        <EmptyStateNoConta />
      ) : (
        <>
          {/* ✅ Filtros + Botão Desktop */}
          <div className="space-y-4">
            <FiltrosMovimentacoes
              filtros={filtros}
              onFiltrosChange={setFiltros}
              categorias={categoriasUnicas}
              formasPagamento={formasPagamentoUnicas}
            />

            {/* ✅ Botão desktop - Alinhado com filtros */}
            <div className="hidden md:flex justify-end">
              <Button
                onClick={abrirNovo}
                disabled={criarTransacao.isPending}
                className="flex items-center gap-2 bg-blue-700 hover:bg-blue-900 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <MdAdd className="text-xl" />
                {criarTransacao.isPending ? "Criando..." : "Nova Movimentação"}
              </Button>
            </div>
          </div>

          {/* Tabela de movimentações */}
          <MovimentacaoTabela
            movimentacoes={movimentacoesFiltradas}
            loading={loading}
            cartoes={cartoes}
            onEditar={editarItem}
            onExcluir={confirmarExclusao}
          />
        </>
      )}

      {/* Modais */}
      <FormMovimentacaoModal
        open={openModal}
        onOpenChange={(open: boolean) => {
          setOpenModal(open);
          if (!open) {
            setEditando(null);
            setTipoEdicao("unica");
          }
        }}
        transacaoEdicao={editando}
        modoEdicao={tipoEdicao}
        salvar={handleSalvar}
        loading={criarTransacao.isPending || atualizarTransacao.isPending}
      />

      <ConfirmarExclusaoModal
        open={modalExcluir}
        onClose={() => {
          setModalExcluir(false);
          setItemExcluir(null);
        }}
        transacao={itemExcluir}
        onConfirmar={handleExcluir}
        loading={excluirTransacao.isPending}
      />

      <ConfirmarEdicaoModal
        open={modalEdicao}
        onClose={() => {
          setModalEdicao(false);
        }}
        transacao={editando}
        onConfirmar={(tipo: ModoEdicao) => {
          setTipoEdicao(tipo);
          setModalEdicao(false);
          setOpenModal(true);
        }}
      />
    </div>
  );
}