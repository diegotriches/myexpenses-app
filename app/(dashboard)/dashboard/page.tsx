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
import { CardSaldoHistorico } from '@/components/dashboard/CardSaldoHistorico';
import { SeletorPeriodoMeses } from '@/components/dashboard/SeletorPeriodoMeses';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PieChart, BarChart3, Calendar } from 'lucide-react';
import { BsHouse } from "react-icons/bs";

function useSaudacao() {
  const [saudacao, setSaudacao] = useState("");
  const [dataFormatada, setDataFormatada] = useState("");

  useEffect(() => {
    function atualizar() {
      const agora = new Date();
      const hora  = agora.getHours();

      const periodo =
        hora >= 5 && hora < 12  ? "Bom dia"   :
        hora >= 12 && hora < 18 ? "Boa tarde" :
        "Boa noite";

      const data = agora.toLocaleDateString("pt-BR", {
        weekday: "long",
        day:     "numeric",
        month:   "long",
      });

      setSaudacao(periodo);
      setDataFormatada(data.charAt(0).toUpperCase() + data.slice(1));
    }

    atualizar();
  }, []);

  return { saudacao, dataFormatada };
}

// ── Dashboard ──────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { data: session } = useSession();
  const { saudacao, dataFormatada } = useSaudacao();

  const { data: dashboard, isLoading: loadingDashboard } = useDashboard();
  const { data: despesasFuturas, isLoading: loadingDespesasFuturas } = useDespesasFuturas();
  const { data: contas = [], isLoading: loadingContas } = useContas();
  const { data: cartoes = [], isLoading: loadingCartoes } = useCartoes();

  const primeiroNome = useMemo(() => {
    const nome = session?.user?.name;
    if (!nome) return "";
    return nome.split(" ")[0];
  }, [session]);

  // ✅ NOVO: período (3/6/12 meses) — independente por aba
  const [periodoVisaoGeral, setPeriodoVisaoGeral] = useState<3 | 6 | 12>(6);
  const [periodoAnalises,   setPeriodoAnalises]   = useState<3 | 6 | 12>(6);

  // ── Tabs com transição automática ──────────────────────────────────────
  const TABS = ['overview', 'analytics'] as const;
  type TabValue = typeof TABS[number];
  const TAB_DURATION = 8000;

  const [activeTab, setActiveTab] = useState<TabValue>('overview');
  const [autoPlay,  setAutoPlay]  = useState(true);

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
    const totalContas  = contasAtivas.reduce((acc, c) => acc + Number(c.saldoAtual), 0);

    const cartoesCredito   = cartoes.filter(c => c.tipo === 'credito' && c.ativo);
    const limiteTotal      = cartoesCredito.reduce((acc, c) => acc + Number(c.limite), 0);
    const limiteDisponivel = cartoesCredito.reduce((acc, c) => acc + Number(c.limiteDisponivel), 0);
    const limiteUsado      = limiteTotal - limiteDisponivel;
    const percentualUso    = limiteTotal > 0 ? (limiteUsado / limiteTotal) * 100 : 0;

    return {
      totalContas,
      limiteTotal,
      limiteDisponivel: Math.max(0, limiteDisponivel),
      limiteUsado:      Math.max(0, limiteUsado),
      percentualUso:    Math.max(0, percentualUso),
      quantidadeContas:  contasAtivas.length,
      quantidadeCartoes: cartoesCredito.length,
    };
  }, [contas, cartoes]);

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
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <BsHouse className="text-3xl text-blue-700 dark:text-blue-500" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          </div>
          {dataFormatada && (
            <span className="hidden sm:flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 whitespace-nowrap">
              <Calendar className="w-3.5 h-3.5" />
              {dataFormatada}
            </span>
          )}
        </div>

        <div className="mb-4">
          <p className="text-gray-600 dark:text-gray-400">
            {saudacao}{primeiroNome ? `, ${primeiroNome}!` : "!"}{" "}
            <span className="text-gray-400 dark:text-gray-500">
              Aqui está o resumo das suas finanças.
            </span>
          </p>
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

      {/* Limite de crédito + Evolução do Patrimônio */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CardLimiteCredito />
        <CardSaldoHistorico />
      </div>

      {/* Tabs com transição automática */}
      <div className="space-y-4">
        <div className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground dark:bg-gray-800">
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
            <span
              ref={barOverviewRef}
              className="absolute bottom-0 left-0 h-[2px] bg-blue-500 dark:bg-blue-400 rounded-full"
              style={{ width: '0%' }}
            />
          </button>

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
            <span
              ref={barAnalyticsRef}
              className="absolute bottom-0 left-0 h-[2px] bg-blue-500 dark:bg-blue-400 rounded-full"
              style={{ width: '0%' }}
            />
          </button>
        </div>

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
            {/* Seletor de período da aba Visão Geral */}
            <div className="flex justify-end">
              <SeletorPeriodoMeses value={periodoVisaoGeral} onChange={setPeriodoVisaoGeral} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <CardGraficoMeses periodoMeses={periodoVisaoGeral} />
              <CardTransacoesRecentes />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <CardCondicoesPagamento periodoMeses={periodoVisaoGeral} />
              <CardFormasPagamento periodoMeses={periodoVisaoGeral} />
              <CardFaturas periodoMeses={periodoVisaoGeral} />
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
            {/* Seletor de período da aba Análises */}
            <div className="flex justify-end">
              <SeletorPeriodoMeses value={periodoAnalises} onChange={setPeriodoAnalises} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <CardCategoriasLancamentos periodoMeses={periodoAnalises} />
              <CardCategoriasReceita periodoMeses={periodoAnalises} />
              <CardCategoriasDespesa periodoMeses={periodoAnalises} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <CardMaioresGastos periodoMeses={periodoAnalises} />
              <CardValores periodoMeses={periodoAnalises} />
              <CardRecorrentes periodoMeses={periodoAnalises} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}