"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { BsTags } from "react-icons/bs";
import { MdAdd } from "react-icons/md";
import {
  Search,
  Tag,
  RefreshCw,
  AlertCircle,
  Calendar,
  TrendingUp,
  TrendingDown,
  Receipt,
  Edit,
  Trash2,
  ListOrdered,
} from "lucide-react";

import CategoriaCard from "@/components/categorias/CategoriaCard";
import CategoriaFormModal from "@/components/categorias/CategoriaFormModal";
import ConfirmDeleteModal from "@/components/categorias/ConfirmDeleteModal";
import { Categoria } from "@/types/categoria";
import { iconOptions } from "@/utils/iconOptions";
import { useCategorias } from "@/hooks/useCategorias";
import { useHideValues } from "@/contexts/HideValuesContext";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface TotalCategoria {
  total: number;
  totalEntrada: number;
  totalSaida: number;
  quantidade: number;
}

interface TotaisResponse {
  ano: number;
  totais: Record<string, TotalCategoria>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ANO_ATUAL = new Date().getFullYear();
const ANOS_DISPONIVEIS = Array.from({ length: 6 }, (_, i) => ANO_ATUAL - i);

const formatarMoeda = (valor: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);

// ─── Bottom Sheet — conteúdo dos detalhes mobile ─────────────────────────────

function BottomSheetConteudo({
  categoria,
  totais,
  loadingTotais,
  onEditar,
  onExcluir,
  onVerExtrato,
  onClose,
}: {
  categoria: Categoria;
  totais?: TotalCategoria;
  loadingTotais: boolean;
  onEditar: () => void;
  onExcluir: () => void;
  onVerExtrato: () => void;
  onClose: () => void;
}) {
  const { mask } = useHideValues();

  const IconComp = iconOptions.find((i) => i.name === categoria.icone)?.component || null;

  const getCorGradiente = () => {
    if (categoria.tipo === "entrada") return "from-green-500 to-green-600";
    if (categoria.tipo === "saida")   return "from-red-500 to-red-600";
    return "from-blue-500 to-purple-600";
  };

  const getCorBadge = () => {
    if (categoria.tipo === "entrada") return "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300";
    if (categoria.tipo === "saida")   return "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300";
    return "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300";
  };

  const getTipoLabel = () => {
    if (categoria.tipo === "entrada") return "Receita";
    if (categoria.tipo === "saida")   return "Despesa";
    return "Ambos";
  };

  const temMovimentacao = (totais?.totalEntrada ?? 0) > 0 || (totais?.totalSaida ?? 0) > 0;

  return (
    <div className="space-y-5 pb-2">
      {/* Ícone + nome + badge */}
      <div className="flex items-center gap-4">
        <div
          className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${getCorGradiente()} flex items-center justify-center shadow-md flex-shrink-0`}
        >
          {IconComp ? (
            <IconComp size={28} className="text-white" />
          ) : (
            <Tag size={28} className="text-white" />
          )}
        </div>
        <div>
          <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
            {categoria.nome}
          </h3>
          <Badge className={`${getCorBadge()} text-xs mt-1`}>
            {categoria.tipo === "entrada" && <TrendingUp size={12} className="mr-1" />}
            {categoria.tipo === "saida"   && <TrendingDown size={12} className="mr-1" />}
            {categoria.tipo === "ambos"   && <Tag size={12} className="mr-1" />}
            {getTipoLabel()}
          </Badge>
        </div>
      </div>

      {/* Divisor */}
      <hr className="border-gray-200 dark:border-gray-700" />

      {/* Totais */}
      <div className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
          Movimentações no ano
        </p>

        {loadingTotais ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
          </div>
        ) : !temMovimentacao ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 italic">
            Sem movimentações no ano selecionado
          </p>
        ) : (
          <div className="space-y-2">
            {categoria.tipo !== "saida" && (totais?.totalEntrada ?? 0) > 0 && (
              <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 rounded-lg px-4 py-2.5">
                <span className="text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
                  <TrendingUp size={15} />
                  {categoria.tipo === "ambos" ? "Entradas" : "Total"}
                </span>
                <span className="text-sm font-bold text-green-700 dark:text-green-400 tabular-nums">
                  {mask(formatarMoeda(totais?.totalEntrada ?? 0))}
                </span>
              </div>
            )}
            {categoria.tipo !== "entrada" && (totais?.totalSaida ?? 0) > 0 && (
              <div className="flex items-center justify-between bg-red-50 dark:bg-red-900/20 rounded-lg px-4 py-2.5">
                <span className="text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
                  <TrendingDown size={15} />
                  {categoria.tipo === "ambos" ? "Saídas" : "Total"}
                </span>
                <span className="text-sm font-bold text-red-700 dark:text-red-400 tabular-nums">
                  {mask(formatarMoeda(totais?.totalSaida ?? 0))}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 px-1 pt-1">
              <Receipt size={13} className="text-gray-400 dark:text-gray-500" />
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {totais?.quantidade ?? 0}{" "}
                {(totais?.quantidade ?? 0) === 1 ? "transação" : "transações"}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Divisor */}
      <hr className="border-gray-200 dark:border-gray-700" />

      {/* Extrato da categoria */}
      <Button
        className="w-full bg-blue-700 hover:bg-blue-800"
        onClick={() => { onVerExtrato(); onClose(); }}
      >
        <ListOrdered size={15} className="mr-2" />
        Ver extrato da categoria
      </Button>

      {/* Botões */}
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

export default function CategoriasPage() {
  const { data: categorias = [], isLoading: loading, error, refetch, isRefetching } = useCategorias();

  const router = useRouter();
  const [aba, setAba] = useState<"entrada" | "saida">("entrada");
  const [busca, setBusca] = useState("");
  const [anoSelecionado, setAnoSelecionado] = useState(ANO_ATUAL);

  // Bottom sheet mobile
  const [categoriaSheet, setCategoriaSheet] = useState<Categoria | null>(null);

  // Modais
  const [formModalAberto, setFormModalAberto] = useState(false);
  const [deleteModalAberto, setDeleteModalAberto] = useState(false);
  const [categoriaEditando, setCategoriaEditando] = useState<Categoria | null>(null);
  const [categoriaExcluir, setCategoriaExcluir] = useState<Categoria | null>(null);

  const { data: totaisData, isLoading: loadingTotais } = useQuery<TotaisResponse>({
    queryKey: ["categorias-totais", anoSelecionado],
    queryFn: async () => {
      const res = await fetch(`/api/categorias/totais?ano=${anoSelecionado}`);
      if (!res.ok) throw new Error("Erro ao carregar totais");
      return res.json();
    },
    enabled: !loading && categorias.length > 0,
    staleTime: 1000 * 60 * 5,
  });

  // Extrato da categoria (página própria), já no ano selecionado nesta tela
  const abrirExtrato = (categoria: Categoria) => {
    const params = new URLSearchParams({ ano: String(anoSelecionado) });
    // Ano vigente abre no mês atual; outros anos abrem com o ano inteiro
    params.set("mes", anoSelecionado === ANO_ATUAL ? String(new Date().getMonth() + 1) : "todos");
    router.push(`/categorias/${categoria.id}?${params.toString()}`);
  };

  const abrirCriacao = () => { setCategoriaEditando(null); setFormModalAberto(true); };

  const abrirEdicao = (categoria: Categoria) => {
    setCategoriaEditando(categoria);
    setFormModalAberto(true);
  };

  const abrirExclusao = (categoria: Categoria) => {
    setCategoriaExcluir(categoria);
    setDeleteModalAberto(true);
  };

  const categoriasFiltradas = useMemo(() => {
    let resultado = categorias.filter((c) => c.tipo === aba || c.tipo === "ambos");
    if (busca) resultado = resultado.filter((c) => c.nome.toLowerCase().includes(busca.toLowerCase()));
    resultado.sort((a, b) => a.nome.localeCompare(b.nome));
    return resultado;
  }, [categorias, aba, busca]);

  const contadores = useMemo(() => ({
    entradas: categorias.filter((c) => c.tipo === "entrada" || c.tipo === "ambos").length,
    saidas:   categorias.filter((c) => c.tipo === "saida"   || c.tipo === "ambos").length,
  }), [categorias]);

  // ─── Sub-componentes ────────────────────────────────────────────────────────

  const SkeletonCard = () => (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 animate-pulse" style={{ height: "128px" }}>
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-xl flex-shrink-0" />
        <div className="flex-1">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
        </div>
      </div>
    </div>
  );

  const renderEmptyState = ({ tipo }: { tipo: "entrada" | "saida" }) => (
    <div className="col-span-full text-center py-12 md:py-16 bg-gray-50 dark:bg-gray-900 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700">
      <Tag className="mx-auto mb-4 text-gray-300 dark:text-gray-600" size={48} />
      <h3 className="text-lg md:text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
        Nenhuma categoria de {tipo === "entrada" ? "receita" : "despesa"}
      </h3>
      <p className="text-sm md:text-base text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto px-4">
        Crie sua primeira categoria de {tipo === "entrada" ? "receita" : "despesa"} para organizar suas transações
      </p>
      <Button onClick={abrirCriacao} size="lg" className="bg-blue-700 hover:bg-blue-800">
        <MdAdd className="mr-2 text-xl" />
        Criar Categoria
      </Button>
    </div>
  );

  const renderErrorState = () => (
    <div className="text-center py-12 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
      <AlertCircle className="mx-auto mb-4 text-red-500" size={48} />
      <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">Erro ao carregar categorias</h3>
      <p className="text-sm text-red-500 dark:text-red-400 mb-6">{error?.message || "Ocorreu um erro inesperado"}</p>
      <Button variant="outline" onClick={() => refetch()} disabled={isRefetching}
        className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400">
        {isRefetching
          ? <><RefreshCw className="mr-2 h-4 w-4 animate-spin" />Carregando...</>
          : <><RefreshCw className="mr-2 h-4 w-4" />Tentar Novamente</>}
      </Button>
    </div>
  );

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <header>
        <div className="flex items-center gap-2 mb-2">
          <BsTags className="text-2xl md:text-3xl text-blue-700 dark:text-blue-500" />
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Categorias</h1>
        </div>
        <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
          Organize suas transações com categorias personalizadas
        </p>
        <hr className="border-t border-gray-300 dark:border-gray-700 my-4" />
      </header>

      {/* Abas: receitas / despesas (mesmo estilo das páginas Contas e Cartões) */}
      {!loading && !error && categorias.length > 0 && (
        <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700" role="tablist">
          {([
            { id: "entrada", label: "Receitas", qtd: contadores.entradas },
            { id: "saida", label: "Despesas", qtd: contadores.saidas },
          ] as const).map((item) => {
            const selecionada = aba === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={selecionada}
                onClick={() => setAba(item.id)}
                className={[
                  "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
                  selecionada
                    ? "border-blue-700 text-blue-700 dark:border-blue-500 dark:text-blue-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200",
                ].join(" ")}
              >
                {item.label}
                <span
                  className={[
                    "ml-2 rounded-full px-2 py-0.5 text-xs",
                    selecionada
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                      : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
                  ].join(" ")}
                >
                  {item.qtd}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Barra de busca + seletor de ano */}
      {!loading && !error && categorias.length > 0 && (
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
            <Input
              placeholder="Buscar categoria..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-10 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700"
            />
          </div>
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-gray-400 dark:text-gray-500 hidden md:block" />
            <Select value={String(anoSelecionado)} onValueChange={(v) => setAnoSelecionado(Number(v))}>
              <SelectTrigger className="w-full md:w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ANOS_DISPONIVEIS.map((ano) => (
                  <SelectItem key={ano} value={String(ano)}>{ano}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={abrirCriacao} className="hidden md:flex items-center gap-2 bg-blue-700 hover:bg-blue-800">
            <MdAdd className="text-xl" />
            Nova Categoria
          </Button>
        </div>
      )}

      {/* Botão mobile fixo */}
      {!loading && !error && (
        <Button
          onClick={abrirCriacao}
          className="md:hidden fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-blue-700 hover:bg-blue-800 z-50"
          size="icon"
        >
          <MdAdd className="text-2xl" />
        </Button>
      )}

      {/* Tabs */}
      {!loading && !error && categorias.length > 0 && (
        <Tabs value={aba} onValueChange={(v) => setAba(v as "entrada" | "saida")}>
          <TabsContent value={aba} className="space-y-4">
            {categoriasFiltradas.length === 0 ? (
              busca ? (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <Search className="mx-auto mb-3 text-gray-300 dark:text-gray-600" size={48} />
                  <p className="text-gray-600 dark:text-gray-400 font-medium mb-1">Nenhuma categoria encontrada</p>
                  <p className="text-sm text-gray-500 dark:text-gray-500">
                    Tente ajustar a busca ou{" "}
                    <button onClick={() => setBusca("")} className="text-blue-600 dark:text-blue-400 hover:underline">
                      limpar filtro
                    </button>
                  </p>
                </div>
              ) : (
                renderEmptyState({ tipo: aba })
              )
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {categoriasFiltradas.map((cat) => {
                  const totais = totaisData?.totais[cat.id];
                  return (
                    <CategoriaCard
                      key={cat.id}
                      categoria={cat}
                      onEditar={() => abrirEdicao(cat)}
                      onExcluir={() => abrirExclusao(cat)}
                      totalEntrada={totais?.totalEntrada ?? 0}
                      totalSaida={totais?.totalSaida ?? 0}
                      quantidade={totais?.quantidade ?? 0}
                      loadingTotais={loadingTotais}
                      onMobileSelect={() => setCategoriaSheet(cat)}
                      onVerExtrato={() => abrirExtrato(cat)}
                    />
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      {loading && (
        <div className="space-y-4">
          <div className="h-10 w-full max-w-md bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        </div>
      )}

      {!loading && error && renderErrorState()}
      {!loading && !error && categorias.length === 0 && renderEmptyState({ tipo: aba })}

      {/* ✅ Bottom Sheet — mobile */}
      <Sheet open={!!categoriaSheet} onOpenChange={(open) => { if (!open) setCategoriaSheet(null); }}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto px-6 pt-6 pb-8">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-left text-base font-semibold text-gray-900 dark:text-white">
              Detalhes da categoria
            </SheetTitle>
          </SheetHeader>

          {categoriaSheet && (
            <BottomSheetConteudo
              categoria={categoriaSheet}
              totais={totaisData?.totais[categoriaSheet.id]}
              loadingTotais={loadingTotais}
              onEditar={() => abrirEdicao(categoriaSheet)}
              onExcluir={() => abrirExclusao(categoriaSheet)}
              onVerExtrato={() => abrirExtrato(categoriaSheet)}
              onClose={() => setCategoriaSheet(null)}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Modais */}
      <CategoriaFormModal
        aberto={formModalAberto}
        onClose={() => setFormModalAberto(false)}
        categoria={categoriaEditando}
      />
      <ConfirmDeleteModal
        aberto={deleteModalAberto}
        onClose={() => setDeleteModalAberto(false)}
        categoria={categoriaExcluir}
      />
    </div>
  );
}