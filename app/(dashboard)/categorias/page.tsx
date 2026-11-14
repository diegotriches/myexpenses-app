"use client";

import { useState, useMemo, Fragment } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { BsTags } from "react-icons/bs";
import { MdAdd } from "react-icons/md";
import { Search, Tag, RefreshCw, AlertCircle } from "lucide-react";

import CategoriaCard from "@/components/categorias/CategoriaCard";
import CategoriaFormModal from "@/components/categorias/CategoriaFormModal";
import ExcluirCategoriaModal from "@/components/categorias/ExcluirCategoriaModal";
import { Categoria } from "@/types/categoria";
import { useCategorias } from "@/hooks/useCategorias";
import { PageHeader } from "@/components/common/PageHeader";
import { AbasSecao } from "@/components/common/AbasSecao";

// Extrato da categoria (página própria): abre no mês atual, com filtro de ano e mês lá
function hrefExtrato(categoria: Categoria) {
  const hoje = new Date();
  return `/categorias/${categoria.id}?ano=${hoje.getFullYear()}&mes=${hoje.getMonth() + 1}`;
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function CategoriasPage() {
  const { data: categorias = [], isLoading: loading, error, refetch, isRefetching } = useCategorias();

  const [aba, setAba] = useState<"entrada" | "saida">("entrada");
  const [busca, setBusca] = useState("");

  // Modais
  const [formModalAberto, setFormModalAberto] = useState(false);
  const [deleteModalAberto, setDeleteModalAberto] = useState(false);
  const [categoriaEditando, setCategoriaEditando] = useState<Categoria | null>(null);
  const [categoriaExcluir, setCategoriaExcluir] = useState<Categoria | null>(null);

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

  const renderSkeletonCard = () => (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg flex-shrink-0" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
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
      <Button onClick={abrirCriacao} size="lg" className="bg-blue-700 text-white hover:bg-blue-800">
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
    <div className="page-container p-4 md:p-6 space-y-6">
      <PageHeader
        icone={BsTags}
        titulo="Categorias"
        descricao="Organize suas transações com categorias personalizadas"
      />

      {/* Abas: receitas / despesas (mesmo estilo das páginas Contas e Cartões) */}
      {!loading && !error && categorias.length > 0 && (
        <AbasSecao
          ariaLabel="Tipo de categoria"
          abas={[
            { id: "entrada", rotulo: "Receitas", qtd: contadores.entradas },
            { id: "saida", rotulo: "Despesas", qtd: contadores.saidas },
          ] as const}
          ativa={aba}
          onChange={setAba}
        />
      )}

      {/* Barra de busca */}
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
          <Button onClick={abrirCriacao} className="hidden md:flex items-center gap-2 bg-blue-700 text-white hover:bg-blue-800">
            <MdAdd className="text-xl" />
            Nova Categoria
          </Button>
        </div>
      )}

      {/* Botão mobile fixo */}
      {!loading && !error && (
        <Button
          onClick={abrirCriacao}
          className="md:hidden fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-blue-700 text-white hover:bg-blue-800 z-50"
          size="icon"
        >
          <MdAdd className="text-2xl" />
        </Button>
      )}

      {/* Tabs */}
      {!loading && !error && categorias.length > 0 && (
        <Tabs value={aba} onValueChange={(v) => setAba(v as "entrada" | "saida")}>
          <TabsContent value={aba}>
            {/* key no bloco interno, não no TabsContent: o Radix zera a duração da animação quando o TabsContent é montado */}
            <div key={aba} className="space-y-4 motion-safe:animate-conteudo-in">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                  {categoriasFiltradas.map((cat) => (
                    <CategoriaCard
                      key={cat.id}
                      categoria={cat}
                      hrefExtrato={hrefExtrato(cat)}
                      onEditar={() => abrirEdicao(cat)}
                      onExcluir={() => abrirExclusao(cat)}
                    />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}

      {loading && (
        <div className="space-y-4">
          <div className="h-10 w-full max-w-md bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
            {Array.from({ length: 8 }).map((_, i) => <Fragment key={i}>{renderSkeletonCard()}</Fragment>)}
          </div>
        </div>
      )}

      {!loading && error && renderErrorState()}
      {!loading && !error && categorias.length === 0 && renderEmptyState({ tipo: aba })}

      {/* Modais */}
      <CategoriaFormModal
        aberto={formModalAberto}
        onClose={() => setFormModalAberto(false)}
        categoria={categoriaEditando}
      />
      <ExcluirCategoriaModal
        aberto={deleteModalAberto}
        onClose={() => setDeleteModalAberto(false)}
        categoria={categoriaExcluir}
      />
    </div>
  );
}