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
import FaturaFechadaModal from "@/components/transacao/FaturaFechadaModal";
import FiltrosMovimentacoes, { FiltrosState } from "@/components/transacao/FiltrosMovimentacoes";

import {
  useTransacoes,
  useCriarTransacao,
  useAtualizarTransacao,
  useExcluirTransacao
} from "@/hooks/useTransacoes";
import { useCartoes } from "@/hooks/useCartoes";
import { useContas } from "@/hooks/useContas";
import { Transacao, ModoEdicao } from "@/types/transacao";
import { calcularFaturaDaTransacao, faturaEstaFechada } from "@/utils/faturaUtils";
import { useFaturas } from "@/hooks/useFaturas";

export default function TransacoesPage() {
  const router = useRouter();

  const { data: transacoes = [], isLoading: loadingTransacoes } = useTransacoes();
  const { data: cartoes    = [], isLoading: loadingCartoes    } = useCartoes();
  const { data: contas     = [], isLoading: loadingContas     } = useContas();
  const { buscarFatura }                                        = useFaturas();

  const criarTransacao     = useCriarTransacao();
  const atualizarTransacao = useAtualizarTransacao();
  const excluirTransacao   = useExcluirTransacao();

  const [openModal,          setOpenModal]          = useState(false);
  const [editando,           setEditando]           = useState<Transacao | null>(null);
  const [modalEdicao,        setModalEdicao]        = useState(false);
  const [tipoEdicao,         setTipoEdicao]         = useState<ModoEdicao>("unica");
  const [modalExcluir,       setModalExcluir]       = useState(false);
  const [itemExcluir,        setItemExcluir]        = useState<Transacao | null>(null);
  const [modalFaturaFechada, setModalFaturaFechada] = useState(false);

  const [filtros, setFiltros] = useState<FiltrosState>({
    tipo: "todas",
    categoria: "",
    formaPagamento: "",
    busca: "",
    valorMin: "",
    valorMax: "",
  });

  const temContasAtivas = useMemo(() => contas.some(c => c.ativo), [contas]);

  const movimentacoesFiltradas = useMemo(() => {
    return transacoes.filter((mov) => {
      if (filtros.tipo !== "todas" && mov.tipo !== filtros.tipo) return false;
      if (filtros.categoria && mov.categoria !== filtros.categoria) return false;
      if (filtros.formaPagamento && mov.formaPagamento !== filtros.formaPagamento) return false;
      if (filtros.busca) {
        const busca     = filtros.busca.toLowerCase();
        const descricao = mov.descricao?.toLowerCase() || "";
        const categoria = mov.categoria?.toLowerCase()  || "";
        if (!descricao.includes(busca) && !categoria.includes(busca)) return false;
      }
      if (filtros.valorMin !== "") {
        const min = parseFloat(filtros.valorMin);
        if (!isNaN(min) && Math.abs(Number(mov.valor)) < min) return false;
      }
      if (filtros.valorMax !== "") {
        const max = parseFloat(filtros.valorMax);
        if (!isNaN(max) && Math.abs(Number(mov.valor)) > max) return false;
      }
      return true;
    });
  }, [transacoes, filtros]);

  const categoriasUnicas = useMemo(() =>
    Array.from(new Set(transacoes.map(m => m.categoria).filter(Boolean))).sort() as string[],
    [transacoes]
  );

  const formasPagamentoUnicas = useMemo(() =>
    Array.from(new Set(transacoes.map(m => m.formaPagamento).filter(Boolean))).sort() as string[],
    [transacoes]
  );

  // ============================================================
  // Verifica se uma transação parcelada em crédito tem fatura
  // fechada ou paga — bloqueia edição nesses casos
  // ============================================================
  async function faturaParcelaEstaBloqueada(mov: Transacao): Promise<boolean> {
    if (!mov.parcelamentoId || !mov.cartaoId || mov.formaPagamento !== "cartao") return false;

    const cartao = cartoes.find(c => c.id === mov.cartaoId);
    if (!cartao || cartao.tipo !== "credito") return false;

    const diaFechamento = cartao.diaFechamento || 1;
    const { mes, ano }  = calcularFaturaDaTransacao(new Date(mov.data), diaFechamento);

    // Verifica se a fatura está fechada (sem precisar de dados externos)
    if (faturaEstaFechada(mes, ano, diaFechamento)) return true;

    // Verifica se a fatura está paga (busca da API/cache)
    try {
      const faturaData = await buscarFatura(mov.cartaoId, ano, mes);
      return faturaData?.fatura?.paga === true;
    } catch {
      // Se não encontrou fatura, não bloqueia
      return false;
    }
  }

  function abrirNovo() {
    if (!temContasAtivas) return;
    setEditando(null);
    setTipoEdicao("unica");
    setOpenModal(true);
  }

  async function editarItem(mov: Transacao) {
    // ✅ Bloqueia edição de parceladas em crédito com fatura fechada/paga
    if (await faturaParcelaEstaBloqueada(mov)) {
      setModalFaturaFechada(true);
      return;
    }

    const isParcelada  = !!mov.parcelamentoId;
    const isRecorrente = !!mov.recorrenciaId;

    setEditando(mov);

    if (isParcelada) {
      setTipoEdicao("todas_parcelas");
      setOpenModal(true);
    } else if (isRecorrente) {
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

  async function handleExcluir(tipo: ModoEdicao) {
    if (!itemExcluir) return;
    try {
      if (itemExcluir.transferenciaId) {
        alert("Transferências devem ser gerenciadas na página de Extrato ou Transferências");
        setModalExcluir(false);
        setItemExcluir(null);
        return;
      }
      await excluirTransacao.mutateAsync({ id: itemExcluir.id, tipo });
      setModalExcluir(false);
      setItemExcluir(null);
    } catch (error) {
      console.error("Erro ao excluir:", error);
    }
  }

  async function handleSalvar(dados: any) {
    try {
      if (editando) {
        await atualizarTransacao.mutateAsync({
          id: editando.id,
          dados: { ...dados, modoEdicao: tipoEdicao },
        });
      } else {
        await criarTransacao.mutateAsync(dados);
      }
      setOpenModal(false);
      setEditando(null);
      setTipoEdicao("unica");
    } catch (error) {
      console.error("Erro ao salvar transação:", error);
      throw error;
    }
  }

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
      <Button onClick={() => router.push('/contas')} size="lg" className="bg-blue-700 hover:bg-blue-900">
        <BsBank className="mr-2 text-xl" />
        Cadastrar Primeira Conta
      </Button>
    </div>
  );

  const loading = loadingTransacoes || loadingCartoes || loadingContas;

  if (loadingContas) {
    return (
      <div className="page-container mx-auto p-4 md:p-6">
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <BsArrowLeftRight className="text-2xl md:text-3xl text-blue-700 dark:text-blue-500" />
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
            Movimentações
          </h1>
        </div>
        <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
          {movimentacoesFiltradas.length} transação(ões) encontrada(s)
        </p>
        <hr className="border-t border-gray-300 dark:border-gray-700 my-4" />
      </div>

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

      {!temContasAtivas ? (
        <EmptyStateNoConta />
      ) : (
        <>
          <div className="space-y-4">
            <FiltrosMovimentacoes
              filtros={filtros}
              onFiltrosChange={setFiltros}
              categorias={categoriasUnicas}
              formasPagamento={formasPagamentoUnicas}
            />
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
          if (!open) { setEditando(null); setTipoEdicao("unica"); }
        }}
        transacaoEdicao={editando}
        modoEdicao={tipoEdicao}
        salvar={handleSalvar}
        loading={criarTransacao.isPending || atualizarTransacao.isPending}
      />

      <ConfirmarExclusaoModal
        open={modalExcluir}
        onClose={() => { setModalExcluir(false); setItemExcluir(null); }}
        transacao={itemExcluir}
        onConfirmar={handleExcluir}
        loading={excluirTransacao.isPending}
      />

      <ConfirmarEdicaoModal
        open={modalEdicao}
        onClose={() => setModalEdicao(false)}
        transacao={editando}
        onConfirmar={(tipo: ModoEdicao) => {
          setTipoEdicao(tipo);
          setModalEdicao(false);
          setOpenModal(true);
        }}
      />

      {/* ✅ Aviso de fatura fechada/paga */}
      <FaturaFechadaModal
        open={modalFaturaFechada}
        onClose={() => setModalFaturaFechada(false)}
      />
    </div>
  );
}