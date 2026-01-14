"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BsTags } from "react-icons/bs";
import { MdAdd } from "react-icons/md";
import { Search, Tag, RefreshCw, AlertCircle } from "lucide-react";

import CategoriaCard from "@/components/categorias/CategoriaCard";
import CategoriaFormModal from "@/components/categorias/CategoriaFormModal";
import ConfirmDeleteModal from "@/components/categorias/ConfirmDeleteModal";
import { Categoria } from "@/types/categoria";

import { useCategorias } from "@/hooks/useCategorias";

export default function CategoriasPage() {
  // React Query
  const { data: categorias = [], isLoading: loading, error, refetch, isRefetching } = useCategorias();

  const [aba, setAba] = useState<"entrada" | "saida">("entrada");
  const [busca, setBusca] = useState("");

  // Modais
  const [formModalAberto, setFormModalAberto] = useState(false);
  const [deleteModalAberto, setDeleteModalAberto] = useState(false);

  // Edição
  const [categoriaEditando, setCategoriaEditando] = useState<Categoria | null>(null);
  const [categoriaExcluir, setCategoriaExcluir] = useState<Categoria | null>(null);

  const abrirCriacao = () => {
    setCategoriaEditando(null);
    setFormModalAberto(true);
  };

  const abrirEdicao = (categoria: Categoria) => {
    setCategoriaEditando(categoria);
    setFormModalAberto(true);
  };

  const abrirExclusao = (categoria: Categoria) => {
    setCategoriaExcluir(categoria);
    setDeleteModalAberto(true);
  };

  // Aplica busca e ordenação
  const categoriasFiltradas = useMemo(() => {
    let resultado = categorias.filter(c => 
      c.tipo === aba || c.tipo === "ambos"
    );

    // Busca por nome
    if (busca) {
      resultado = resultado.filter(c =>
        c.nome.toLowerCase().includes(busca.toLowerCase())
      );
    }

    // Ordenação por nome (A-Z)
    resultado.sort((a, b) => a.nome.localeCompare(b.nome));

    return resultado;
  }, [categorias, aba, busca]);

  // Contadores
  const contadores = useMemo(() => {
    return {
      entradas: categorias.filter(c => c.tipo === "entrada" || c.tipo === "ambos").length,
      saidas: categorias.filter(c => c.tipo === "saida" || c.tipo === "ambos").length,
    };
  }, [categorias]);

  // Skeleton Loading
  const SkeletonCard = () => (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 animate-pulse">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-xl" />
        <div className="flex-1">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
        </div>
      </div>
    </div>
  );

  // Empty State
  const EmptyState = ({ tipo }: { tipo: "entrada" | "saida" }) => (
    <div className="col-span-full text-center py-12 md:py-16 bg-gray-50 dark:bg-gray-900 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700">
      <Tag className="mx-auto mb-4 text-gray-300 dark:text-gray-600" size={48} />
      <h3 className="text-lg md:text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
        Nenhuma categoria de {tipo === "entrada" ? "entrada" : "saída"}
      </h3>
      <p className="text-sm md:text-base text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto px-4">
        Crie sua primeira categoria de {tipo === "entrada" ? "entrada" : "saída"} para organizar suas transações
      </p>
      <Button 
        onClick={abrirCriacao} 
        size="lg" 
        className="bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-700"
        aria-label={`Criar categoria de ${tipo}`}
      >
        <MdAdd className="mr-2 text-xl" />
        Criar Categoria
      </Button>
    </div>
  );

  // Error State
  const ErrorState = () => (
    <div className="text-center py-12 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
      <AlertCircle className="mx-auto mb-4 text-red-500 dark:text-red-400" size={48} />
      <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">
        Erro ao carregar categorias
      </h3>
      <p className="text-sm text-red-500 dark:text-red-400 mb-6 max-w-md mx-auto px-4">
        {error?.message || "Ocorreu um erro inesperado"}
      </p>
      <Button 
        onClick={() => refetch()} 
        variant="outline"
        disabled={isRefetching}
        className="border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
        aria-label="Tentar carregar novamente"
      >
        {isRefetching ? (
          <>
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            Carregando...
          </>
        ) : (
          <>
            <RefreshCw className="mr-2 h-4 w-4" />
            Tentar Novamente
          </>
        )}
      </Button>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <header>
        <div className="flex items-center gap-2 mb-2">
          <BsTags className="text-2xl md:text-3xl text-blue-700 dark:text-blue-500" />
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
            Categorias
          </h1>
        </div>

        <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
          Organize suas transações com categorias personalizadas
        </p>

        <hr className="border-t border-gray-300 dark:border-gray-700 my-4" />
      </header>

      {/* Barra de busca */}
      {!loading && !error && categorias.length > 0 && (
        <div className="flex flex-col md:flex-row gap-4">
          {/* Busca */}
          <div className="flex-1 relative">
            <Search 
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" 
              size={18} 
            />
            <Input
              placeholder="Buscar categoria..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-10 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700"
              aria-label="Campo de busca de categorias"
            />
          </div>

          {/* Botão adicionar - desktop */}
          <Button
            onClick={abrirCriacao}
            className="hidden md:flex items-center gap-2 bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-700"
            aria-label="Criar nova categoria"
          >
            <MdAdd className="text-xl" />
            Nova Categoria
          </Button>
        </div>
      )}

      {/* Botão adicionar - mobile fixo */}
      {!loading && !error && (
        <Button
          onClick={abrirCriacao}
          className="md:hidden fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-700 z-50"
          size="icon"
          aria-label="Criar nova categoria"
        >
          <MdAdd className="text-2xl" />
        </Button>
      )}

      {/* Tabs */}
      {!loading && !error && categorias.length > 0 && (
        <Tabs value={aba} onValueChange={(v) => setAba(v as "entrada" | "saida")} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2 bg-gray-100 dark:bg-gray-800">
            <TabsTrigger 
              value="entrada" 
              className="data-[state=active]:bg-green-600 data-[state=active]:text-white dark:data-[state=active]:bg-green-700"
              aria-label={`Categorias de entrada (${contadores.entradas})`}
            >
              Entradas ({contadores.entradas})
            </TabsTrigger>
            <TabsTrigger 
              value="saida" 
              className="data-[state=active]:bg-red-600 data-[state=active]:text-white dark:data-[state=active]:bg-red-700"
              aria-label={`Categorias de saída (${contadores.saidas})`}
            >
              Saídas ({contadores.saidas})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={aba} className="space-y-4">
            {categoriasFiltradas.length === 0 ? (
              busca ? (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <Search className="mx-auto mb-3 text-gray-300 dark:text-gray-600" size={48} />
                  <p className="text-gray-600 dark:text-gray-400 font-medium mb-1">
                    Nenhuma categoria encontrada
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
                <EmptyState tipo={aba} />
              )
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {categoriasFiltradas.map(cat => (
                  <CategoriaCard
                    key={cat.id}
                    categoria={cat}
                    onEditar={() => abrirEdicao(cat)}
                    onExcluir={() => abrirExclusao(cat)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Loading State */}
      {loading && (
        <div className="space-y-4">
          <div className="h-10 w-full max-w-md bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      )}

      {/* Error State */}
      {!loading && error && <ErrorState />}

      {/* Empty State Inicial */}
      {!loading && !error && categorias.length === 0 && (
        <EmptyState tipo={aba} />
      )}

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