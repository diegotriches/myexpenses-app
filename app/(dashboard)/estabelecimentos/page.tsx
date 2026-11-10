"use client";

import { useState, useMemo, Fragment } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MdAdd } from "react-icons/md";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Search,
  Store,
  RefreshCw,
  AlertCircle,
  MapPin,
  Receipt,
  TrendingUp,
  TrendingDown,
  Edit,
  Trash2,
  ListOrdered,
} from "lucide-react";

import EstabelecimentoCard from "@/components/estabelecimentos/EstabelecimentoCard";
import EstabelecimentoFormModal from "@/components/estabelecimentos/EstabelecimentoFormModal";
import ConfirmDeleteEstabelecimentoModal from "@/components/estabelecimentos/ConfirmDeleteEstabelecimentoModal";

import { Estabelecimento } from "@/types/estabelecimento";
import { iconOptions } from "@/utils/iconOptions";
import { useHideValues } from "@/contexts/HideValuesContext";
import {
  useEstabelecimentos,
  useCriarEstabelecimento,
  useAtualizarEstabelecimento,
  useRemoverEstabelecimento,
} from "@/hooks/useEstabelecimentos";
import { formatarMoeda } from "@/utils/formatadores";
import type { CreateEstabelecimentoDTO, UpdateEstabelecimentoDTO } from "@/types/estabelecimento";

// ─── Bottom Sheet — detalhes no mobile ───────────────────────────────────────

function BottomSheetConteudo({
  estabelecimento,
  onVerExtrato,
  onEditar,
  onExcluir,
  onClose,
}: {
  estabelecimento: Estabelecimento;
  onVerExtrato: () => void;
  onEditar: () => void;
  onExcluir: () => void;
  onClose: () => void;
}) {
  const { mask } = useHideValues();
  const IconComp = iconOptions.find((i) => i.name === estabelecimento.icone)?.component || null;

  const totalEntrada = estabelecimento.totalEntrada ?? 0;
  const totalSaida = estabelecimento.totalSaida ?? 0;
  const quantidade = estabelecimento.totalTransacoes ?? 0;

  return (
    <div className="space-y-5 pb-2">
      {/* Ícone + nome + localização */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md flex-shrink-0">
          {IconComp ? <IconComp size={28} className="text-white" /> : <Store size={28} className="text-white" />}
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-lg text-gray-900 dark:text-white truncate">
            {estabelecimento.nome}
          </h3>
          {estabelecimento.localizacao ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
              <MapPin size={13} className="flex-shrink-0" />
              <span className="truncate">{estabelecimento.localizacao}</span>
            </p>
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-500 italic mt-0.5">Sem localização</p>
          )}
        </div>
      </div>

      <hr className="border-gray-200 dark:border-gray-700" />

      {/* Totais */}
      <div className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
          Movimentações
        </p>
        {quantidade === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 italic">Sem movimentações registradas</p>
        ) : (
          <div className="space-y-2">
            {totalSaida > 0 && (
              <div className="flex items-center justify-between bg-red-50 dark:bg-red-900/20 rounded-lg px-4 py-2.5">
                <span className="text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
                  <TrendingDown size={15} /> Despesas
                </span>
                <span className="text-sm font-bold text-red-700 dark:text-red-400 tabular-nums">
                  {mask(formatarMoeda(totalSaida))}
                </span>
              </div>
            )}
            {totalEntrada > 0 && (
              <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 rounded-lg px-4 py-2.5">
                <span className="text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
                  <TrendingUp size={15} /> Receitas
                </span>
                <span className="text-sm font-bold text-green-700 dark:text-green-400 tabular-nums">
                  {mask(formatarMoeda(totalEntrada))}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 px-1 pt-1">
              <Receipt size={13} className="text-gray-400 dark:text-gray-500" />
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {quantidade} {quantidade === 1 ? "transação" : "transações"}
              </span>
            </div>
          </div>
        )}
      </div>

      <hr className="border-gray-200 dark:border-gray-700" />

      <Button
        className="w-full bg-blue-700 hover:bg-blue-800"
        onClick={() => { onVerExtrato(); onClose(); }}
      >
        <ListOrdered size={15} className="mr-2" />
        Ver extrato do estabelecimento
      </Button>

      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1 border-gray-200 dark:border-gray-700"
          onClick={() => { onEditar(); onClose(); }}
        >
          <Edit size={15} className="mr-2" />
          Editar
        </Button>
        <Button
          variant="outline"
          className="flex-1 border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
          onClick={() => { onExcluir(); onClose(); }}
        >
          <Trash2 size={15} className="mr-2" />
          Excluir
        </Button>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function EstabelecimentosPage() {
  const router = useRouter();
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
  const [sheet,         setSheet]         = useState<Estabelecimento | null>(null);

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

  // Extrato do estabelecimento (página própria, ano atual inteiro)
  function abrirExtrato(e: Estabelecimento) {
    router.push(`/estabelecimentos/${e.id}?ano=${new Date().getFullYear()}&mes=todos`);
  }

  function abrirEdicao(e: Estabelecimento) {
    setEditando(e);
    setFormAberto(true);
  }

  function abrirExclusao(e: Estabelecimento) {
    setExcluindo(e);
    setDeleteAberto(true);
  }

  async function handleSalvar(dados: CreateEstabelecimentoDTO | UpdateEstabelecimentoDTO) {
    if (editando) {
      await atualizarEstabelecimento.mutateAsync({ id: editando.id, dados });
    } else {
      const { nome, icone, localizacao } = dados;
      if (!nome || !icone) throw new Error("Nome e ícone são obrigatórios");
      await criarEstabelecimento.mutateAsync({ nome, icone, localizacao: localizacao ?? undefined });
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

  const renderSkeletonCard = () => (
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

  const renderEmptyState = () => (
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

  const renderErrorState = () => (
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
          {Array.from({ length: 8 }).map((_, i) => <Fragment key={i}>{renderSkeletonCard()}</Fragment>)}
        </div>
      ) : error ? (
        renderErrorState()
      ) : estabelecimentos.length === 0 ? (
        renderEmptyState()
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
                onVerExtrato={() => abrirExtrato(e)}
                onMobileSelect={() => setSheet(e)}
              />
            ))}
          </div>
        </>
      )}

      {/* Bottom Sheet — mobile */}
      <Sheet open={!!sheet} onOpenChange={(open) => { if (!open) setSheet(null); }}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto px-6 pt-6 pb-8">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-left text-base font-semibold text-gray-900 dark:text-white">
              Detalhes do estabelecimento
            </SheetTitle>
          </SheetHeader>
          {sheet && (
            <BottomSheetConteudo
              estabelecimento={sheet}
              onVerExtrato={() => abrirExtrato(sheet)}
              onEditar={() => abrirEdicao(sheet)}
              onExcluir={() => abrirExclusao(sheet)}
              onClose={() => setSheet(null)}
            />
          )}
        </SheetContent>
      </Sheet>

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