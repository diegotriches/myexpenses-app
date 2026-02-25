"use client";

import { useMemo, useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';

import { useDashboard, useDespesasFuturas } from '@/hooks/useDashboard';
import { useContas } from '@/hooks/useContas';
import { useCartoes } from '@/hooks/useCartoes';

import { CardResumo } from '@/components/dashboard/CardResumo';
import { CardLimiteCredito } from '@/components/dashboard/CardLimiteCredito';
import { CardTransacoesRecentes } from '@/components/dashboard/CardTransacoesRecentes';
import { CardCondicoesPagamento } from '@/components/dashboard/CardCondicoesPagamento';
import { CardFormasPagamento } from '@/components/dashboard/CardFormasPagamento';
import { CardGraficoMeses } from '@/components/dashboard/CardGraficosMeses';
import { CardParcelados } from '@/components/dashboard/CardParcelados';
import { CardRecorrentes } from '@/components/dashboard/CardRecorrente';
import { CardMaioresGastos } from '@/components/dashboard/CardMaioresGastos';
import { CardCategoriasLancamentos } from '@/components/dashboard/CardCategoriasLancamentos';
import { CardCategoriasReceita } from '@/components/dashboard/CardCategoriasReceita';
import { CardCategoriasDespesa } from '@/components/dashboard/CardCategoriasDespesa';
import { CardValores } from '@/components/dashboard/CardValores';
import { CardFaturas } from '@/components/dashboard/CardFaturas';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
// Tabs substituído por controle manual (compatibilidade Recharts + transição suave)
import { Skeleton } from '@/components/ui/skeleton';
import { Wallet, PieChart, BarChart3, Calendar } from 'lucide-react';
import { BsHouse } from "react-icons/bs";

function useSaudacao() {
  const [saudacao, setSaudacao] = useState("");
  const [dataFormatada, setDataFormatada] = useState("");

  useEffect(() => {
    function atualizar() {
      const agora = new Date();
      const hora  = agora.getHours();

      const periodo =
        hora >= 5 && hora < 12 ? "Bom dia"      :
        hora >= 12 && hora < 18 ? "Boa tarde"   :
        "Boa noite";

      const data = agora.toLocaleDateString("pt-BR", {
        weekday: "long",
        day:     "numeric",
        month:   "long",
      });

      // Capitaliza primeira letra
      setSaudacao(periodo);
      setDataFormatada(data.charAt(0).toUpperCase() + data.slice(1));
    }

    atualizar();
  }, []);

  return { saudacao, dataFormatada };
}

export default function Dashboard() {
  const { data: session } = useSession();
  const { saudacao, dataFormatada } = useSaudacao();

  const { data: dashboard, isLoading: loadingDashboard } = useDashboard();
  const { data: despesasFuturas, isLoading: loadingDespesasFuturas } = useDespesasFuturas();
  const { data: contas = [], isLoading: loadingContas } = useContas();
  const { data: cartoes = [], isLoading: loadingCartoes } = useCartoes();

  // Primeiro nome apenas
  const primeiroNome = useMemo(() => {
    const nome = session?.user?.name;
    if (!nome) return "";
    return nome.split(" ")[0];
  }, [session]);

  // ── Tabs com transição automática ──────────────────────────────────────
  const TABS = ['overview', 'analytics'] as const;
  type TabValue = typeof TABS[number];
  const TAB_DURATION = 8000; // ms

  const [activeTab, setActiveTab] = useState<TabValue>('overview');
  const [autoPlay,  setAutoPlay]  = useState(true);

  // ✅ progress como ref — atualiza a barra via DOM direto,
  // sem causar re-renders do pai e dos cards filhos (Recharts)
  const barOverviewRef  = useRef<HTMLSpanElement>(null);
  const barAnalyticsRef = useRef<HTMLSpanElement>(null);
  const rafRef          = useRef<number>(0);
  const activeTabRef    = useRef<TabValue>('overview');

  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);

  function setBarWidth(pct: number) {
    const bar = activeTabRef.current === 'overview'
      ? barOverviewRef.current
      : barAnalyticsRef.current;
    if (bar) bar.style.width = `${pct}%`;
  }

  function clearBars() {
    if (barOverviewRef.current)  barOverviewRef.current.style.width  = '0%';
    if (barAnalyticsRef.current) barAnalyticsRef.current.style.width = '0%';
  }

  // Troca de aba automática — manipula DOM direto, zero re-renders durante rAF
  useEffect(() => {
    if (!autoPlay) { clearBars(); return; }

    const start = performance.now();

    function tick(now: number) {
      const pct = Math.min(((now - start) / TAB_DURATION) * 100, 100);
      setBarWidth(pct);
      if (pct < 100) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        clearBars();
        setActiveTab(prev => prev === 'overview' ? 'analytics' : 'overview');
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [autoPlay, activeTab]);

  function handleTabChange(value: string) {
    cancelAnimationFrame(rafRef.current);
    setActiveTab(value as TabValue);
    setAutoPlay(false);
    clearBars();
  }
  // ────────────────────────────────────────────────────────────────────────

  const totais = useMemo(() => {
    if (!contas.length && !cartoes.length) return null;

    const contasAtivas = contas.filter(c => c.ativo);
    const totalContas = contasAtivas.reduce((acc, c) => acc + Number(c.saldoAtual), 0);

    const cartoesCredito = cartoes.filter(c => c.tipo === 'credito' && c.ativo);
    const limiteTotal = cartoesCredito.reduce((acc, c) => acc + Number(c.limite), 0);
    const limiteDisponivel = cartoesCredito.reduce((acc, c) => acc + Number(c.limiteDisponivel), 0);
    const limiteUsado = limiteTotal - limiteDisponivel;
    const percentualUso = limiteTotal > 0 ? (limiteUsado / limiteTotal) * 100 : 0;

    return {
      totalContas,
      limiteTotal,
      limiteDisponivel: Math.max(0, limiteDisponivel),
      limiteUsado: Math.max(0, limiteUsado),
      percentualUso: Math.max(0, percentualUso),
      quantidadeContas: contasAtivas.length,
      quantidadeCartoes: cartoesCredito.length,
    };
  }, [contas, cartoes]);

  const formatarMoeda = (valor: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);

  const isLoading = loadingDashboard || loadingContas || loadingCartoes || loadingDespesasFuturas;

  const CardSkeleton = () => (
    <Card className="dark:bg-gray-900 dark:border-gray-800">
      <CardHeader><Skeleton className="h-4 w-[200px]" /></CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-full mb-2" />
        <Skeleton className="h-4 w-3/4" />
      </CardContent>
    </Card>
  );

  return (
    <div className="max-w-[1200px] mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        {/* Título + Badge de data */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <BsHouse className="text-3xl text-blue-700 dark:text-blue-500" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          </div>
          {/* Badge: oculto no mobile, visível a partir de sm */}
          {dataFormatada && (
            <span className="hidden sm:flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 whitespace-nowrap">
              <Calendar className="w-3.5 h-3.5" />
              {dataFormatada}
            </span>
          )}
        </div>

        {/* Saudação */}
        <div className="mb-4">
          <p className="text-gray-600 dark:text-gray-400">
            {saudacao}{primeiroNome ? `, ${primeiroNome}!` : "!"}{" "}
            <span className="text-gray-400 dark:text-gray-500">
              Aqui está o resumo das suas finanças.
            </span>
          </p>
          {/* Data por extenso no mobile — abaixo da saudação, sem badge */}
          {dataFormatada && (
            <p className="sm:hidden text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {dataFormatada}
            </p>
          )}
        </div>

        <hr className="border-t border-gray-300 dark:border-gray-700" />
      </div>

      {/* Cards de resumo principal */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : (
        <CardResumo
          resumo={dashboard?.resumo || { receitas: 0, despesas: 0, saldo: 0 }}
          saldoContas={totais?.totalContas}
          quantidadeContas={totais?.quantidadeContas}
          despesasFuturas={despesasFuturas}
        />
      )}

      {/* Limite de crédito + Contas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CardLimiteCredito />

        {isLoading ? <CardSkeleton /> : (
          <Card className="dark:bg-gray-900 dark:border-gray-800">
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center justify-between text-gray-900 dark:text-white">
                <span className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  Minhas Contas
                </span>
                <Badge>{totais?.quantidadeContas || 0}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {contas.filter(c => c.ativo).slice(0, 3).map((conta) => (
                <div key={conta.id} className="flex items-center justify-between p-2 rounded-md bg-gray-100 dark:bg-gray-800">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{conta.nome}</p>
                      {conta.banco && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">{conta.banco}</p>
                      )}
                    </div>
                  </div>
                  <span className={`text-sm font-semibold ${
                    Number(conta.saldoAtual) >= 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {formatarMoeda(Number(conta.saldoAtual))}
                  </span>
                </div>
              ))}
              {(totais?.quantidadeContas || 0) === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  Nenhuma conta cadastrada
                </p>
              )}
              {(totais?.quantidadeContas || 0) > 3 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center pt-2">
                  + {(totais?.quantidadeContas || 0) - 3} contas
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Tabs com transição automática — pausa ao clicar */}
      <div className="space-y-4">
        {/* TabsList manual para suportar barra de progresso */}
        <div className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground dark:bg-gray-800">
          {/* Visão Geral */}
          <button
            onClick={() => handleTabChange('overview')}
            className={[
              'relative inline-flex items-center gap-2 justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium',
              'ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              'overflow-hidden',
              activeTab === 'overview'
                ? 'bg-background text-foreground shadow-sm dark:bg-gray-700 dark:text-white'
                : 'hover:bg-background/50 dark:hover:bg-gray-700/50',
            ].join(' ')}
          >
            <PieChart className="h-4 w-4" />
            Visão Geral
            {/* Barra de progresso — width atualizada via ref, sem re-renders */}
            <span
              ref={barOverviewRef}
              className="absolute bottom-0 left-0 h-[2px] bg-blue-500 dark:bg-blue-400 rounded-full"
              style={{ width: '0%' }}
            />
          </button>

          {/* Análises */}
          <button
            onClick={() => handleTabChange('analytics')}
            className={[
              'relative inline-flex items-center gap-2 justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium',
              'ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              'overflow-hidden',
              activeTab === 'analytics'
                ? 'bg-background text-foreground shadow-sm dark:bg-gray-700 dark:text-white'
                : 'hover:bg-background/50 dark:hover:bg-gray-700/50',
            ].join(' ')}
          >
            <BarChart3 className="h-4 w-4" />
            Análises
            {/* Barra de progresso — width atualizada via ref, sem re-renders */}
            <span
              ref={barAnalyticsRef}
              className="absolute bottom-0 left-0 h-[2px] bg-blue-500 dark:bg-blue-400 rounded-full"
              style={{ width: '0%' }}
            />
          </button>
        </div>

        {/* ── Conteúdo das abas ─────────────────────────────────────────────────
            Ambas ficam sempre montadas no DOM. A barra de progresso manipula
            o DOM via ref sem causar re-renders, mantendo os gráficos Recharts
            estáveis. A transição é feita apenas com opacity.
        ─────────────────────────────────────────────────────────────────────── */}

        {/* Wrapper relativo — necessário para o position absolute da aba inativa */}
        <div className="relative">

          {/* Visão Geral */}
          <div
            className="space-y-4"
            style={{
              opacity:       activeTab === 'overview' ? 1 : 0,
              pointerEvents: activeTab === 'overview' ? 'auto' : 'none',
              position:      activeTab === 'overview' ? 'relative' : 'absolute',
              top: 0, left: 0, right: 0,
              transition:    'opacity 0.5s ease',
            }}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <CardGraficoMeses />
              <CardTransacoesRecentes />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <CardCondicoesPagamento />
              <CardFormasPagamento />
              <CardFaturas />
            </div>
            <CardParcelados />
          </div>

          {/* Análises */}
          <div
            className="space-y-4"
            style={{
              opacity:       activeTab === 'analytics' ? 1 : 0,
              pointerEvents: activeTab === 'analytics' ? 'auto' : 'none',
              position:      activeTab === 'analytics' ? 'relative' : 'absolute',
              top: 0, left: 0, right: 0,
              transition:    'opacity 0.5s ease',
            }}
          >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <CardCategoriasLancamentos />
              <CardCategoriasReceita />
              <CardCategoriasDespesa />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <CardMaioresGastos />
              <CardValores />
              <CardRecorrentes />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}