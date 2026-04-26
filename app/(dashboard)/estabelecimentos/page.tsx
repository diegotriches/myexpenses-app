"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MdAdd } from "react-icons/md";
import { Search, Store, RefreshCw, AlertCircle } from "lucide-react";

import EstabelecimentoCard from "@/components/estabelecimentos/EstabelecimentoCard";
import EstabelecimentoFormModal from "@/components/estabelecimentos/EstabalecimentoFormModal";
import ConfirmDeleteEstabelecimentoModal from "@/components/estabelecimentos/ConfirmDeleteEstabelecimentoModal";

import { Estabelecimento } from "@/types/estabelecimento";
import {
  useEstabelecimentos,
  useCriarEstabelecimento,
  useAtualizarEstabelecimento,
  useRemoverEstabelecimento,
} from "@/hooks/useEstabelecimentos";

export default function EstabelecimentosPage() {
  const {
    data: estabelecimentos = [],
    isLoading: loading,
    error,
    refetch,
    isRefetching,
  } = useEstabelecimentos();

  const criarEstabelecimento    = useCriarEstabelecimento();
  const atualizarEstabelecimento = useAtualizarEstabelecimento();
  const removerEstabelecimento  = useRemoverEstabelecimento();

  const [busca,         setBusca]         = useState("");
  const [formAberto,    setFormAberto]    = useState(false);
  const [deleteAberto,  setDeleteAberto]  = useState(false);
  const [editando,      setEditando]      = useState<Estabelecimento | null>(null);
  const [excluindo,     setExcluindo]     = useState<Estabelecimento | null>(null);

  const estabelecimentosFiltrados = useMemo(() => {
    let lista = [...estabelecimentos];
    if (busca.trim()) {
      const q = busca.trim().toLowerCase();
      lista = lista.filter(
        (e) =>
          e.nome.toLowerCase().includes(q) ||
          e.localizacao?.toLowerCase().includes(q)
      );
    }
    // Ordenação: com transações primeiro, depois alfabética
    lista.sort((a, b) => {
      const diffTransacoes = (b.totalTransacoes ?? 0) - (a.totalTransacoes ?? 0);
      if (diffTransacoes !== 0) return diffTransacoes;
      return a.nome.localeCompare(b.nome);
    });
    return lista;
  }, [estabelecimentos, busca]);

  function abrirCriacao() {
    setEditando(null);
    setFormAberto(true);
  }

  function abrirEdicao(e: Estabelecimento) {
    setEditando(e);
    setFormAberto(true);
  }

  function abrirExclusao(e: Estabelecimento) {
    setExcluindo(e);
    setDeleteAberto(true);
  }

  async function handleSalvar(dados: any) {
    if (editando) {
      await atualizarEstabelecimento.mutateAsync({ id: editando.id, dados });
    } else {
      await criarEstabelecimento.mutateAsync(dados);
    }
    setFormAberto(false);
    setEditando(null);
  }

  async function handleExcluir() {
    if (!excluindo) return;
    await removerEstabelecimento.mutateAsync(excluindo.id);
    setDeleteAberto(false);
    setExcluindo(null);
  }

  // ── Sub-componentes ──────────────────────────────────────────────────────

  const SkeletonCard = () => (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
        </div>
      </div>
    </div>
  );

  const EmptyState = () => (
    <div className="col-span-full text-center py-16 bg-gray-50 dark:bg-gray-900 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700">
      <Store className="mx-auto mb-4 text-gray-300 dark:text-gray-600" size={56} />
      <h3 className="text-lg md:text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
        Nenhum estabelecimento cadastrado
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto px-4">
        Cadastre mercados, farmácias, restaurantes e outros locais para associar às suas transações
      </p>
      <Button
        onClick={abrirCriacao}
        size="lg"
        className="bg-blue-700 hover:bg-blue-800"
      >
        <MdAdd className="mr-2 text-xl" />
        Cadastrar Estabelecimento
      </Button>
    </div>
  );

  const ErrorState = () => (
    <div className="text-center py-12 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
      <AlertCircle className="mx-auto mb-4 text-red-500" size={48} />
      <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">
        Erro ao carregar estabelecimentos
      </h3>
      <p className="text-sm text-red-500 dark:text-red-400 mb-6">
        {error?.message || "Ocorreu um erro inesperado"}
      </p>
      <Button
        variant="outline"
        onClick={() => refetch()}
        disabled={isRefetching}
        className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400"
      >
        {isRefetching ? (
          <><RefreshCw className="mr-2 h-4 w-4 animate-spin" />Carregando...</>
        ) : (
          <><RefreshCw className="mr-2 h-4 w-4" />Tentar Novamente</>
        )}
      </Button>
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <header>
        <div className="flex items-center gap-2 mb-2">
          <Store className="text-2xl md:text-3xl text-blue-700 dark:text-blue-500" size={28} />
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
            Estabelecimentos
          </h1>
        </div>
        <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
          Gerencie os locais associados às suas transações
        </p>
        <hr className="border-t border-gray-300 dark:border-gray-700 my-4" />
      </header>

      {/* Barra de busca + botão */}
      {!loading && !error && estabelecimentos.length > 0 && (
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"
              size={18}
            />
            <Input
              placeholder="Buscar por nome ou localização..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-10 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700"
            />
          </div>
          <Button
            onClick={abrirCriacao}
            className="hidden md:flex items-center gap-2 bg-blue-700 hover:bg-blue-800"
          >
            <MdAdd className="text-xl" />
            Novo Estabelecimento
          </Button>
        </div>
      )}

      {/* FAB mobile */}
      {!loading && !error && (
        <Button
          onClick={abrirCriacao}
          className="md:hidden fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-blue-700 hover:bg-blue-800 z-50"
          size="icon"
          aria-label="Criar novo estabelecimento"
        >
          <MdAdd className="text-2xl" />
        </Button>
      )}

      {/* Conteúdo principal */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : error ? (
        <ErrorState />
      ) : estabelecimentos.length === 0 ? (
        <EmptyState />
      ) : estabelecimentosFiltrados.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <Search className="mx-auto mb-3 text-gray-300 dark:text-gray-600" size={48} />
          <p className="text-gray-600 dark:text-gray-400 font-medium mb-1">
            Nenhum estabelecimento encontrado
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Tente ajustar a busca ou{" "}
            <button
              onClick={() => setBusca("")}
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              limpar filtro
            </button>
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {estabelecimentosFiltrados.length}{" "}
            {estabelecimentosFiltrados.length === 1
              ? "estabelecimento encontrado"
              : "estabelecimentos encontrados"}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {estabelecimentosFiltrados.map((e) => (
              <EstabelecimentoCard
                key={e.id}
                estabelecimento={e}
                onEditar={() => abrirEdicao(e)}
                onExcluir={() => abrirExclusao(e)}
              />
            ))}
          </div>
        </>
      )}

      {/* Modais */}
      <EstabelecimentoFormModal
        aberto={formAberto}
        onClose={() => { setFormAberto(false); setEditando(null); }}
        estabelecimento={editando}
        onSalvar={handleSalvar}
        salvando={criarEstabelecimento.isPending || atualizarEstabelecimento.isPending}
      />

      <ConfirmDeleteEstabelecimentoModal
        aberto={deleteAberto}
        onClose={() => { setDeleteAberto(false); setExcluindo(null); }}
        estabelecimento={excluindo}
        onConfirmar={handleExcluir}
        loading={removerEstabelecimento.isPending}
      />
    </div>
  );
}