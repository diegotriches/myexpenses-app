"use client";

import { useState, useMemo } from "react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BsCreditCard } from "react-icons/bs";
import { MdAdd } from "react-icons/md";
import { Search, CreditCard, AlertTriangle } from "lucide-react";

import CartaoFormModal from "@/components/cartoes/CartaoFormModal";
import CartaoItem from "@/components/cartoes/CartaoItem";
import CartaoItemInativo from "@/components/cartoes/CartaoItemInativo";
import { CartaoExclusaoModal } from "@/components/cartoes/CartaoExclusaoModal";
import GastosAnuaisCard from "@/components/cartoes/GastosAnuaisCard"; // ✅ NOVO

import { Cartao, CreateCartaoDTO, UpdateCartaoDTO } from "@/types/cartao";

import {
  useCartoes,
  useCriarCartao,
  useAtualizarCartao,
  useRemoverCartao,
} from "@/hooks/useCartoes";
import { useTransacoes } from "@/hooks/useTransacoes";

type OrdenacaoType = "nome" | "limite-maior" | "limite-menor" | "uso-maior" | "uso-menor";

export default function CartoesPage() {
  const { data: cartoes = [], isLoading: loading, error } = useCartoes();
  const criarCartao     = useCriarCartao();
  const atualizarCartao = useAtualizarCartao();
  const removerCartao   = useRemoverCartao();

  const { data: transacoes = [] } = useTransacoes();

  const [modalOpen,         setModalOpen]         = useState(false);
  const [cartaoEdicao,      setCartaoEdicao]       = useState<Cartao | null>(null);
  const [modalExclusaoOpen, setModalExclusaoOpen]  = useState(false);
  const [cartaoParaExcluir, setCartaoParaExcluir]  = useState<Cartao | null>(null);
  const [busca,             setBusca]              = useState("");
  const [ordenacao,         setOrdenacao]          = useState<OrdenacaoType>("nome");
  const [abaAtiva,          setAbaAtiva]           = useState("ativos");
  const [alertaBloqueio,    setAlertaBloqueio]     = useState<string | null>(null);

  const router = useRouter();

  // ✅ NOVO: só exibe o card de gastos se houver pelo menos um cartão de crédito
  const temCartaoCredito = useMemo(
    () => cartoes.some((c) => c.tipo === "credito"),
    [cartoes]
  );

  const possuiDependencias = (cartaoId: number) =>
    transacoes.some((t) => t.cartaoId === cartaoId);

  const toggleAtivo = async (cartao: Cartao) => {
    try {
      await atualizarCartao.mutateAsync({
        id: cartao.id,
        dados: { ativo: !cartao.ativo } as UpdateCartaoDTO,
      });
    } catch (err) {
      console.error("Erro ao alterar status do cartão:", err);
    }
  };

  // ── Filtro + ordenação ────────────────────────────────────────────────────
  const cartoesAtivos = useMemo(() => {
    let r = cartoes.filter((c) => c.ativo);
    if (busca) {
      r = r.filter((c) =>
        c.nome.toLowerCase().includes(busca.toLowerCase()) ||
        c.empresa?.toLowerCase().includes(busca.toLowerCase()) ||
        c.bandeira?.toLowerCase().includes(busca.toLowerCase())
      );
    }
    return r.sort((a, b) => {
      switch (ordenacao) {
        case "nome":         return a.nome.localeCompare(b.nome);
        case "limite-maior": return (Number(b.limite) || 0) - (Number(a.limite) || 0);
        case "limite-menor": return (Number(a.limite) || 0) - (Number(b.limite) || 0);
        case "uso-maior":    return (Number(b.emUso)  || 0) - (Number(a.emUso)  || 0);
        case "uso-menor":    return (Number(a.emUso)  || 0) - (Number(b.emUso)  || 0);
        default:             return 0;
      }
    });
  }, [cartoes, busca, ordenacao]);

  const cartoesInativos = useMemo(() => {
    let r = cartoes.filter((c) => !c.ativo);
    if (busca) {
      r = r.filter((c) =>
        c.nome.toLowerCase().includes(busca.toLowerCase()) ||
        c.empresa?.toLowerCase().includes(busca.toLowerCase()) ||
        c.bandeira?.toLowerCase().includes(busca.toLowerCase())
      );
    }
    return r.sort((a, b) => a.nome.localeCompare(b.nome));
  }, [cartoes, busca]);

  const contadores = useMemo(() => ({
    ativos:   cartoes.filter((c) =>  c.ativo).length,
    inativos: cartoes.filter((c) => !c.ativo).length,
  }), [cartoes]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const abrirNovo   = () => { setCartaoEdicao(null); setModalOpen(true); };
  const abrirEdicao = (c: Cartao) => { setCartaoEdicao(c); setModalOpen(true); };

  const abrirExclusao = (c: Cartao) => {
    setAlertaBloqueio(null);
    setCartaoParaExcluir(c);
    setModalExclusaoOpen(true);
  };

  const confirmarExclusao = async () => {
    if (!cartaoParaExcluir) return;
    try {
      await removerCartao.mutateAsync(cartaoParaExcluir.id);
      setModalExclusaoOpen(false);
      setCartaoParaExcluir(null);
      setAlertaBloqueio(null);
    } catch (err: any) {
      if (err?.status === 409 || err?.response?.status === 409 || err?.code === "HAS_TRANSACTIONS") {
        setModalExclusaoOpen(false);
        setAlertaBloqueio(
          `O cartão "${cartaoParaExcluir.nome}" possui movimentações e não pode ser excluído. ` +
          `Ele foi movido para a aba de inativos automaticamente.`
        );
        await atualizarCartao.mutateAsync({
          id: cartaoParaExcluir.id,
          dados: { ativo: false } as UpdateCartaoDTO,
        });
        setCartaoParaExcluir(null);
        setAbaAtiva("inativos");
      } else {
        console.error("Erro ao excluir cartão:", err);
      }
    }
  };

  const salvar = async (dados: CreateCartaoDTO | UpdateCartaoDTO) => {
    try {
      if (cartaoEdicao) {
        await atualizarCartao.mutateAsync({ id: cartaoEdicao.id, dados: dados as UpdateCartaoDTO });
      } else {
        await criarCartao.mutateAsync(dados as CreateCartaoDTO);
      }
      setModalOpen(false);
      setCartaoEdicao(null);
    } catch (err) {
      console.error("Erro ao salvar cartão:", err);
    }
  };

  const abrirFatura = (cartaoId: number) => router.push(`/cartoes/${cartaoId}/fatura`);

  // ── Sub-componentes ───────────────────────────────────────────────────────
  const SkeletonCard = () => (
    <div className="border rounded-lg p-6 animate-pulse space-y-4 bg-white dark:bg-gray-800">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
          </div>
        </div>
        <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
      <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded" />
      <div className="flex gap-2">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded flex-1" />
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded flex-1" />
      </div>
    </div>
  );

  const EmptyState = () => (
    <div className="text-center py-16 bg-gray-50 dark:bg-gray-900 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700">
      <CreditCard className="text-gray-300 dark:text-gray-600 mx-auto mb-4" size={64} />
      <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
        Nenhum cartão cadastrado
      </h3>
      <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
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
          <BsCreditCard className="text-2xl md:text-3xl text-blue-700 dark:text-blue-500" />
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Cartões</h1>
        </div>
        <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
          Gerencie seus cartões de crédito e débito
        </p>
        <hr className="border-t border-gray-300 dark:border-gray-700 my-4" />
      </header>

      {/* ✅ NOVO: Card de gastos anuais — só para cartões de crédito */}
      {!loading && temCartaoCredito && <GastosAnuaisCard />}

      {/* Alerta de bloqueio de exclusão */}
      {alertaBloqueio && (
        <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertDescription className="text-amber-800 dark:text-amber-300">
            {alertaBloqueio}
          </AlertDescription>
        </Alert>
      )}

      {/* Barra de busca e ordenação */}
      {!loading && cartoes.length > 0 && (
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
            <Input
              placeholder="Buscar por nome, empresa ou bandeira..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-10"
            />
          </div>

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

          <Button
            onClick={abrirNovo}
            className="hidden md:flex items-center gap-2 bg-blue-700 hover:bg-blue-900"
          >
            <MdAdd className="text-xl" />
            Adicionar Cartão
          </Button>
        </div>
      )}

      {/* FAB mobile */}
      <Button
        onClick={abrirNovo}
        className="md:hidden fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-blue-700 hover:bg-blue-900 z-50"
        size="icon"
      >
        <MdAdd className="text-2xl" />
      </Button>

      {/* Tabs */}
      {!loading && cartoes.length > 0 && (
        <Tabs value={abaAtiva} onValueChange={(v) => { setAbaAtiva(v); setAlertaBloqueio(null); }} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-xs">
            <TabsTrigger value="ativos">Ativos ({contadores.ativos})</TabsTrigger>
            <TabsTrigger value="inativos">Inativos ({contadores.inativos})</TabsTrigger>
          </TabsList>

          <TabsContent value="ativos" className="space-y-4">
            {cartoesAtivos.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <Search className="text-gray-300 dark:text-gray-600 mx-auto mb-3" size={48} />
                <p className="text-gray-600 dark:text-gray-300 font-medium mb-1">Nenhum cartão ativo encontrado</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Tente ajustar a busca</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                {cartoesAtivos.map((cartao) => (
                  <CartaoItem
                    key={cartao.id}
                    cartao={cartao}
                    onEditar={abrirEdicao}
                    onExcluir={abrirExclusao}
                    onFatura={abrirFatura}
                    onToggleAtivo={toggleAtivo}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="inativos" className="space-y-4">
            {cartoesInativos.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <CreditCard className="text-gray-300 dark:text-gray-600 mx-auto mb-3" size={48} />
                <p className="text-gray-600 dark:text-gray-300 font-medium mb-1">Nenhum cartão inativo</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Cartões desativados aparecerão aqui</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {cartoesInativos.map((cartao) => (
                  <CartaoItemInativo
                    key={cartao.id}
                    cartao={cartao}
                    onEditar={abrirEdicao}
                    onExcluir={abrirExclusao}
                    onToggleAtivo={toggleAtivo}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="text-center py-12 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-900">
          <p className="text-red-600 dark:text-red-400 font-medium mb-2">Erro ao carregar cartões</p>
          <p className="text-sm text-red-500 dark:text-red-400 mb-4">{error.message}</p>
          <Button onClick={() => window.location.reload()} variant="outline">Tentar Novamente</Button>
        </div>
      )}

      {/* Empty */}
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
          onClose={() => { setModalExclusaoOpen(false); setCartaoParaExcluir(null); }}
          onConfirm={confirmarExclusao}
          cardName={cartaoParaExcluir.nome}
          possuiDependencias={possuiDependencias(cartaoParaExcluir.id)}
        />
      )}
    </div>
  );
}