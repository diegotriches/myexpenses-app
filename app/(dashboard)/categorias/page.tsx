"use client";

import { useEffect, useState, useMemo } from "react";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BsTags } from "react-icons/bs";
import { MdAdd } from "react-icons/md";
import { Search, Tag } from "lucide-react";

import CategoriaCard from "@/components/categorias/CategoriaCard";
import CategoriaFormModal from "@/components/categorias/CategoriaFormModal";
import ConfirmDeleteModal from "@/components/categorias/ConfirmDeleteModal";
import { useToast } from "@/hooks/use-toast";

export type Categoria = {
  id: number;
  nome: string;
  tipo: "entrada" | "saida";
  icon: string;
  transacoesCount?: number;
};

type OrdenacaoType = "nome" | "mais-usadas" | "menos-usadas";

export default function CategoriasPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [aba, setAba] = useState<"entrada" | "saida">("entrada");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [ordenacao, setOrdenacao] = useState<OrdenacaoType>("nome");

  // Modais
  const [formModalAberto, setFormModalAberto] = useState(false);
  const [deleteModalAberto, setDeleteModalAberto] = useState(false);

  // Edição
  const [categoriaEditando, setCategoriaEditando] = useState<Categoria | null>(null);
  const [categoriaExcluir, setCategoriaExcluir] = useState<Categoria | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    fetchCategorias();
  }, []);

  const fetchCategorias = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get("/categorias");
      setCategorias(res.data);
    } catch (err: any) {
      console.error("Erro ao carregar categorias:", err);
      setError(err.message || "Erro ao carregar categorias");
      toast({
        title: "Erro ao carregar",
        description: "Não foi possível carregar as categorias. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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

  const handleSucesso = (acao: "criada" | "editada" | "excluída") => {
    toast({
      title: `Categoria ${acao}!`,
      description: `A categoria foi ${acao} com sucesso.`,
    });
    fetchCategorias();
  };

  // Aplica busca e ordenação
  const categoriasFiltradas = useMemo(() => {
    let resultado = categorias.filter(c => c.tipo === aba);

    // Busca por nome
    if (busca) {
      resultado = resultado.filter(c =>
        c.nome.toLowerCase().includes(busca.toLowerCase())
      );
    }

    // Ordenação
    resultado.sort((a, b) => {
      switch (ordenacao) {
        case "nome":
          return a.nome.localeCompare(b.nome);
        case "mais-usadas":
          return (b.transacoesCount || 0) - (a.transacoesCount || 0);
        case "menos-usadas":
          return (a.transacoesCount || 0) - (b.transacoesCount || 0);
        default:
          return 0;
      }
    });

    return resultado;
  }, [categorias, aba, busca, ordenacao]);

  // Contadores
  const contadores = useMemo(() => {
    return {
      entradas: categorias.filter(c => c.tipo === "entrada").length,
      saidas: categorias.filter(c => c.tipo === "saida").length,
    };
  }, [categorias]);

  // Skeleton Loading
  const SkeletonCard = () => (
    <div className="border rounded-lg p-4 animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 bg-gray-200 rounded-full" />
        <div className="flex gap-1">
          <div className="w-8 h-8 bg-gray-200 rounded" />
          <div className="w-8 h-8 bg-gray-200 rounded" />
        </div>
      </div>
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
      <div className="h-3 bg-gray-200 rounded w-1/2" />
    </div>
  );

  // Empty State
  const EmptyState = ({ tipo }: { tipo: "entrada" | "saida" }) => (
    <div className="col-span-full text-center py-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
      <Tag className="mx-auto mb-4 text-gray-300" size={64} />
      <h3 className="text-xl font-semibold text-gray-700 mb-2">
        Nenhuma categoria de {tipo === "entrada" ? "entrada" : "saída"}
      </h3>
      <p className="text-gray-500 mb-6 max-w-md mx-auto">
        Crie sua primeira categoria de {tipo === "entrada" ? "entrada" : "saída"} para organizar suas transações
      </p>
      <Button onClick={abrirCriacao} size="lg" className="bg-blue-700 hover:bg-blue-900">
        <MdAdd className="mr-2 text-xl" />
        Criar Categoria
      </Button>
    </div>
  );

  return (
    <div className="max-w-[1200px] mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <header>
        <div className="flex items-center gap-2 mb-2">
          <BsTags className="text-2xl md:text-3xl text-blue-700" />
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
            Categorias
          </h1>
        </div>

        <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
          Organize suas transações com categorias personalizadas
        </p>

        <hr className="border-t border-gray-300 dark:border-gray-700 my-4" />
      </header>

      {/* Barra de busca e ordenação */}
      {!loading && categorias.length > 0 && (
        <div className="flex flex-col md:flex-row gap-4">
          {/* Busca */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <Input
              placeholder="Buscar categoria..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Ordenação */}
          <Select value={ordenacao} onValueChange={(v) => setOrdenacao(v as OrdenacaoType)}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nome">Nome (A-Z)</SelectItem>
              <SelectItem value="mais-usadas">Mais Usadas</SelectItem>
              <SelectItem value="menos-usadas">Menos Usadas</SelectItem>
            </SelectContent>
          </Select>

          {/* Botão adicionar - desktop */}
          <Button
            onClick={abrirCriacao}
            className="hidden md:flex items-center gap-2 bg-blue-700 hover:bg-blue-900"
          >
            <MdAdd className="text-xl" />
            Nova Categoria
          </Button>
        </div>
      )}

      {/* Botão adicionar - mobile fixo */}
      <Button
        onClick={abrirCriacao}
        className="md:hidden fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-blue-700 hover:bg-blue-900 z-50"
        size="icon"
      >
        <MdAdd className="text-2xl" />
      </Button>

      {/* Tabs */}
      {!loading && categorias.length > 0 && (
        <Tabs value={aba} onValueChange={(v) => setAba(v as "entrada" | "saida")} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="entrada" className="data-[state=active]:bg-green-600 data-[state=active]:text-white">
              Entradas ({contadores.entradas})
            </TabsTrigger>
            <TabsTrigger value="saida" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
              Saídas ({contadores.saidas})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={aba} className="space-y-4">
            {categoriasFiltradas.length === 0 ? (
              busca ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <Search className="mx-auto mb-3 text-gray-300" size={48} />
                  <p className="text-gray-600 font-medium mb-1">Nenhuma categoria encontrada</p>
                  <p className="text-sm text-gray-500">Tente ajustar a busca</p>
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

      {/* Estados */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {!loading && error && (
        <div className="text-center py-12 bg-red-50 rounded-lg border border-red-200">
          <p className="text-red-600 font-medium mb-2">Erro ao carregar categorias</p>
          <p className="text-sm text-red-500 mb-4">{error}</p>
          <Button onClick={fetchCategorias} variant="outline">
            Tentar Novamente
          </Button>
        </div>
      )}

      {!loading && !error && categorias.length === 0 && (
        <EmptyState tipo={aba} />
      )}

      {/* Modais */}
      <CategoriaFormModal
        aberto={formModalAberto}
        onClose={() => setFormModalAberto(false)}
        categoria={categoriaEditando}
        refresh={() => handleSucesso(categoriaEditando ? "editada" : "criada")}
      />

      <ConfirmDeleteModal
        aberto={deleteModalAberto}
        onClose={() => setDeleteModalAberto(false)}
        categoria={categoriaExcluir}
        refresh={() => handleSucesso("excluída")}
      />
    </div>
  );
}