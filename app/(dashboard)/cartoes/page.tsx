"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
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
import { BsCreditCard } from "react-icons/bs";
import { MdAdd } from "react-icons/md";
import { Search, CreditCard } from "lucide-react";

import CartaoFormModal from "@/components/cartoes/CartaoFormModal";
import CartaoItem from "@/components/cartoes/CartaoItem";
import { CartaoExclusaoModal } from "@/components/cartoes/CartaoExclusaoModal";

import { Cartao } from "@/types/cartao";
import { cartaoService } from "@/services/cartaoService";
import { useTransacoes } from "@/hooks/useTransacoes";
import { useToast } from "@/hooks/use-toast";

type OrdenacaoType = "nome" | "limite-maior" | "limite-menor" | "uso-maior" | "uso-menor";

export default function CartoesPage() {
  const [cartoes, setCartoes] = useState<Cartao[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [cartaoEdicao, setCartaoEdicao] = useState<Cartao | null>(null);
  const [modalExclusaoOpen, setModalExclusaoOpen] = useState(false);
  const [cartaoParaExcluir, setCartaoParaExcluir] = useState<Cartao | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [ordenacao, setOrdenacao] = useState<OrdenacaoType>("nome");
  const [abaAtiva, setAbaAtiva] = useState("todos");

  const router = useRouter();
  const { toast } = useToast();

  const { transacoes } = useTransacoes();

  // Função para checar se o cartão tem transações ou faturas
  const possuiDependencias = (cartaoId: number) => {
    const temTransacoes = transacoes.some((t) => t.cartaoId === cartaoId);
    return temTransacoes;
  };

  const carregarCartoes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await cartaoService.listar();
      setCartoes(data);
    } catch (err: any) {
      console.error("Erro ao carregar cartões:", err);
      setError(err.message || "Erro ao carregar cartões");
      toast({
        title: "Erro ao carregar",
        description: "Não foi possível carregar os cartões. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const transacoesPorCartao = useMemo(() => {
    const map = new Map<number, { valor: number | string; cartaoId: number }[]>();

    transacoes.forEach((t) => {
      if (typeof t.cartaoId === "number") {
        const lista = map.get(t.cartaoId) ?? [];
        lista.push({
          valor: t.valor,
          cartaoId: t.cartaoId,
        });
        map.set(t.cartaoId, lista);
      }
    });

    return map;
  }, [transacoes]);

  // Calcula uso do cartão
  const calcularUsoCartao = (cartaoId: number): number => {
    const movs = transacoesPorCartao.get(cartaoId) ?? [];
    return movs.reduce((total, mov) => total + Number(mov.valor ?? 0), 0);
  };

  // Aplica busca, filtro de aba e ordenação
  const cartoesFiltrados = useMemo(() => {
    let resultado = [...cartoes];

    // Busca por nome
    if (busca) {
      resultado = resultado.filter((c) =>
        c.nome.toLowerCase().includes(busca.toLowerCase()) ||
        c.empresa?.toLowerCase().includes(busca.toLowerCase()) ||
        c.bandeira?.toLowerCase().includes(busca.toLowerCase())
      );
    }

    // Filtro por aba (ativo/inativo)
    if (abaAtiva === "ativos") {
      resultado = resultado.filter((c) => c.ativo);
    } else if (abaAtiva === "inativos") {
      resultado = resultado.filter((c) => !c.ativo);
    }

    // Ordenação
    resultado.sort((a, b) => {
      switch (ordenacao) {
        case "nome":
          return a.nome.localeCompare(b.nome);
        case "limite-maior":
          return (Number(b.limite) || 0) - (Number(a.limite) || 0);
        case "limite-menor":
          return (Number(a.limite) || 0) - (Number(b.limite) || 0);
        case "uso-maior": {
          const usoA = calcularUsoCartao(a.id);
          const usoB = calcularUsoCartao(b.id);
          return usoB - usoA;
        }
        case "uso-menor": {
          const usoA = calcularUsoCartao(a.id);
          const usoB = calcularUsoCartao(b.id);
          return usoA - usoB;
        }
        default:
          return 0;
      }
    });

    return resultado;
  }, [cartoes, busca, abaAtiva, ordenacao]);

  // Contadores
  const contadores = useMemo(() => {
    return {
      total: cartoes.length,
      ativos: cartoes.filter((c) => c.ativo).length,
      inativos: cartoes.filter((c) => !c.ativo).length,
    };
  }, [cartoes]);

  useEffect(() => {
    carregarCartoes();
  }, [carregarCartoes]);

  const abrirNovo = () => {
    setCartaoEdicao(null);
    setModalOpen(true);
  };

  const abrirEdicao = (cartao: Cartao) => {
    setCartaoEdicao(cartao);
    setModalOpen(true);
  };

  const abrirExclusao = (cartao: Cartao) => {
    setCartaoParaExcluir(cartao);
    setModalExclusaoOpen(true);
  };

  const confirmarExclusao = async () => {
    if (!cartaoParaExcluir) return;

    try {
      await cartaoService.remover(cartaoParaExcluir.id);
      await carregarCartoes();
      setModalExclusaoOpen(false);
      setCartaoParaExcluir(null);
      
      toast({
        title: "Cartão excluído",
        description: `${cartaoParaExcluir.nome} foi removido com sucesso.`,
      });
    } catch (error: any) {
      console.error("Erro ao excluir cartão:", error);
      toast({
        title: "Erro ao excluir",
        description: error.message || "Não foi possível excluir o cartão.",
        variant: "destructive",
      });
    }
  };

  const salvar = async (dados: Cartao) => {
    try {
      if (cartaoEdicao) {
        await cartaoService.atualizar(cartaoEdicao.id, dados);
        toast({
          title: "Cartão atualizado",
          description: `${dados.nome} foi atualizado com sucesso.`,
        });
      } else {
        await cartaoService.criar(dados);
        toast({
          title: "Cartão adicionado",
          description: `${dados.nome} foi adicionado com sucesso.`,
        });
      }
      await carregarCartoes();
    } catch (error: any) {
      console.error("Erro ao salvar cartão:", error);
      toast({
        title: "Erro ao salvar",
        description: error.message || "Não foi possível salvar o cartão.",
        variant: "destructive",
      });
    }
  };

  const abrirFatura = (cartaoId: number) => {
    router.push(`/cartoes/${cartaoId}/fatura`);
  };

  // Skeleton Loading
  const SkeletonCard = () => (
    <div className="border rounded-lg p-6 animate-pulse space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <div className="w-12 h-12 bg-gray-200 rounded-lg" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
          </div>
        </div>
        <div className="w-12 h-12 bg-gray-200 rounded" />
      </div>
      <div className="h-20 bg-gray-200 rounded" />
      <div className="flex gap-2">
        <div className="h-8 bg-gray-200 rounded flex-1" />
        <div className="h-8 bg-gray-200 rounded flex-1" />
      </div>
    </div>
  );

  // Empty State
  const EmptyState = () => (
    <div className="text-center py-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
      <CreditCard className="text-6xl text-gray-300 mx-auto mb-4" size={64} />
      <h3 className="text-xl font-semibold text-gray-700 mb-2">
        Nenhum cartão cadastrado
      </h3>
      <p className="text-gray-500 mb-6 max-w-md mx-auto">
        Adicione seu primeiro cartão para começar a gerenciar limites e faturas
      </p>
      <Button onClick={abrirNovo} size="lg" className="bg-blue-700 hover:bg-blue-900">
        <MdAdd className="mr-2 text-xl" />
        Adicionar Primeiro Cartão
      </Button>
    </div>
  );

  return (
    <div className="max-w-[1200px] mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <header>
        <div className="flex items-center gap-2 mb-2">
          <BsCreditCard className="text-2xl md:text-3xl text-blue-700" />
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
            Cartões
          </h1>
        </div>

        <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
          Gerencie seus cartões de crédito e débito
        </p>

        <hr className="border-t border-gray-300 dark:border-gray-700 my-4" />
      </header>

      {/* Barra de busca e ordenação */}
      {!loading && cartoes.length > 0 && (
        <div className="flex flex-col md:flex-row gap-4">
          {/* Busca */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <Input
              placeholder="Buscar por nome, empresa ou bandeira..."
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
              <SelectItem value="limite-maior">Maior Limite</SelectItem>
              <SelectItem value="limite-menor">Menor Limite</SelectItem>
              <SelectItem value="uso-maior">Maior Uso</SelectItem>
              <SelectItem value="uso-menor">Menor Uso</SelectItem>
            </SelectContent>
          </Select>

          {/* Botão adicionar - desktop */}
          <Button
            onClick={abrirNovo}
            className="hidden md:flex items-center gap-2 bg-blue-700 hover:bg-blue-900"
          >
            <MdAdd className="text-xl" />
            Adicionar Cartão
          </Button>
        </div>
      )}

      {/* Botão adicionar - mobile fixo */}
      <Button
        onClick={abrirNovo}
        className="md:hidden fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-blue-700 hover:bg-blue-900 z-50"
        size="icon"
      >
        <MdAdd className="text-2xl" />
      </Button>

      {/* Tabs */}
      {!loading && cartoes.length > 0 && (
        <Tabs value={abaAtiva} onValueChange={setAbaAtiva} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="todos">
              Todos ({contadores.total})
            </TabsTrigger>
            <TabsTrigger value="ativos">
              Ativos ({contadores.ativos})
            </TabsTrigger>
            <TabsTrigger value="inativos">
              Inativos ({contadores.inativos})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={abaAtiva} className="space-y-4">
            {cartoesFiltrados.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <Search className="text-4xl text-gray-300 mx-auto mb-3" size={48} />
                <p className="text-gray-600 font-medium mb-1">Nenhum cartão encontrado</p>
                <p className="text-sm text-gray-500">Tente ajustar a busca ou filtros</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {cartoesFiltrados.map((cartao) => (
                  <CartaoItem
                    key={cartao.id}
                    cartao={cartao}
                    movimentacoes={transacoesPorCartao.get(cartao.id) ?? []}
                    onEditar={abrirEdicao}
                    onExcluir={abrirExclusao}
                    onFatura={abrirFatura}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Estados */}
      {loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
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
          <p className="text-red-600 font-medium mb-2">Erro ao carregar cartões</p>
          <p className="text-sm text-red-500 mb-4">{error}</p>
          <Button onClick={carregarCartoes} variant="outline">
            Tentar Novamente
          </Button>
        </div>
      )}

      {!loading && !error && cartoes.length === 0 && <EmptyState />}

      {/* Modais */}
      <CartaoFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        cartaoEdicao={cartaoEdicao}
        salvar={salvar}
      />

      {cartaoParaExcluir && (
        <CartaoExclusaoModal
          isOpen={modalExclusaoOpen}
          onClose={() => setModalExclusaoOpen(false)}
          onConfirm={confirmarExclusao}
          cardName={cartaoParaExcluir.nome}
          possuiDependencias={possuiDependencias(cartaoParaExcluir.id)}
        />
      )}
    </div>
  );
}