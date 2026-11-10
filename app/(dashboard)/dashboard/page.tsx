"use client";

import { Fragment, useMemo, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

import { useDashboard, useDespesasFuturas } from '@/hooks/useDashboard';
import { useContas } from '@/hooks/useContas';
import { usePeriodo } from '@/contexts/PeriodoContext';

import { CardResumo } from '@/components/dashboard/CardResumo';
import { CardLimiteCredito } from '@/components/dashboard/CardLimiteCredito';
import { CardTransacoesRecentes } from '@/components/dashboard/CardTransacoesRecentes';
import { CardGraficoMeses } from '@/components/dashboard/CardGraficosMeses';
import { CardParcelados } from '@/components/dashboard/CardParcelados';
import { CardRecorrentes } from '@/components/dashboard/CardRecorrente';
import { CardMaioresGastos } from '@/components/dashboard/CardMaioresGastos';
import { CardCategorias } from '@/components/dashboard/CardCategorias';
import { CardProximosVencimentos } from '@/components/dashboard/CardProximosVencimentos';
import { CardFimDoMes } from '@/components/dashboard/CardFimDoMes';
import { CardCategoriasMedia } from '@/components/dashboard/CardCategoriasMedia';
import { CardAlocacao, CardCarteira, CardProventosResumo } from '@/components/dashboard/CardsInvestimentos';
import GastosAnuaisCard from '@/components/cartoes/GastosAnuaisCard';
import { CardSaldoHistorico } from '@/components/dashboard/CardSaldoHistorico';
import { SeletorAno } from '@/components/dashboard/SeletorAno';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarClock, BarChart3, Calendar, PiggyBank } from 'lucide-react';
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

// Rótulo pequeno que deixa claro o escopo de tempo de cada bloco
function RotuloSecao({ titulo, detalhe }: { titulo: string; detalhe?: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {titulo}
      </h2>
      {detalhe && (
        <span className="text-xs text-gray-400 dark:text-gray-500">· {detalhe}</span>
      )}
    </div>
  );
}

// Abas organizadas por pergunta: o que acontece agora, como foi o ano e como estão os investimentos.
// Só mudam por clique (antes alternavam sozinhas e tiravam o gráfico da tela durante a leitura).
type Aba = 'mes' | 'ano' | 'investimentos';

const ABAS: { valor: Aba; rotulo: string; icone: typeof CalendarClock }[] = [
  { valor: 'mes', rotulo: 'Este mês', icone: CalendarClock },
  { valor: 'ano', rotulo: 'Ano', icone: BarChart3 },
  { valor: 'investimentos', rotulo: 'Investimentos', icone: PiggyBank },
];

// ── Dashboard ──────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { data: session } = useSession();
  const { saudacao, dataFormatada } = useSaudacao();

  const { data: dashboard, isLoading: loadingDashboard } = useDashboard();
  const { data: despesasFuturas, isLoading: loadingDespesasFuturas } = useDespesasFuturas();
  const { data: contas = [], isLoading: loadingContas } = useContas();
  const { mesSelecionado, anoSelecionado } = usePeriodo();

  // Rótulo do escopo dos cards de resumo (mês do PeriodoContext)
  const rotuloMes = useMemo(() => {
    const nome = new Date(anoSelecionado, mesSelecionado, 1).toLocaleDateString('pt-BR', { month: 'long' });
    return `${nome.charAt(0).toUpperCase()}${nome.slice(1)} de ${anoSelecionado}`;
  }, [mesSelecionado, anoSelecionado]);

  const primeiroNome = useMemo(() => {
    const nome = session?.user?.name;
    if (!nome) return "";
    return nome.split(" ")[0];
  }, [session]);

  const [aba, setAba] = useState<Aba>('mes');

  // Ano da aba "Ano" (padrão: ano vigente → de janeiro até o mês atual)
  const [anoDashboard, setAnoDashboard] = useState<number>(() => new Date().getFullYear());

  const totais = useMemo(() => {
    const contasAtivas = contas.filter(c => c.ativo);
    return {
      totalContas:      contasAtivas.reduce((acc, c) => acc + Number(c.saldoAtual), 0),
      quantidadeContas: contasAtivas.length,
    };
  }, [contas]);

  const isLoading = loadingDashboard || loadingContas || loadingDespesasFuturas;

  // Mesmo layout e altura do CardResumo (4 cards)
  const renderResumoSkeleton = () => (
    <Card className="border-l-4 border-l-gray-200 dark:border-l-gray-700 dark:bg-gray-900 dark:border-gray-800 overflow-hidden !py-0 !gap-0">
      <CardHeader className="flex flex-row items-center justify-between !px-3 !pt-3 !pb-1 md:!px-4 md:!pt-5 md:!pb-1.5">
        <Skeleton className="h-2.5 w-14 md:h-3.5 md:w-24" />
        <Skeleton className="h-3 w-3 md:h-4 md:w-4 rounded-full" />
      </CardHeader>
      <CardContent className="!px-3 !pt-0 !pb-3 md:!px-4 md:!pt-0 md:!pb-5">
        <Skeleton className="h-4 w-20 md:h-6 md:w-32 mb-1.5" />
        <Skeleton className="h-2 w-12 md:h-3 md:w-20" />
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

      {/* Cards de resumo principal — escopo: mês selecionado */}
      <section className="space-y-2">
        <RotuloSecao titulo="Resumo do mês" detalhe={rotuloMes} />
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
            {[...Array(4)].map((_, i) => <Fragment key={i}>{renderResumoSkeleton()}</Fragment>)}
          </div>
        ) : (
          <CardResumo
            resumo={dashboard?.resumo || { receitas: 0, despesas: 0, saldo: 0 }}
            saldoContas={totais.totalContas}
            quantidadeContas={totais.quantidadeContas}
            despesasFuturas={despesasFuturas}
          />
        )}
      </section>

      {/* Abas */}
      <div className="space-y-4">
        <div className="sticky top-0 z-20 -mx-6 px-6 py-2 bg-background/95 backdrop-blur md:static md:mx-0 md:px-0 md:py-0 md:bg-transparent md:backdrop-blur-none flex items-center justify-between gap-3">
          <div role="tablist" aria-label="Seções do dashboard" className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground dark:bg-gray-800">
            {ABAS.map(({ valor, rotulo, icone: Icone }) => (
              <button
                key={valor}
                type="button"
                role="tab"
                aria-selected={aba === valor}
                onClick={() => setAba(valor)}
                className={[
                  'inline-flex items-center gap-2 justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium',
                  'ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  aba === valor
                    ? 'bg-background text-foreground shadow-sm dark:bg-gray-700 dark:text-white'
                    : 'hover:bg-background/50 dark:hover:bg-gray-700/50',
                ].join(' ')}
              >
                <Icone className="h-4 w-4" />
                {rotulo}
              </button>
            ))}
          </div>

          {aba === 'ano' && (
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Ano
              </span>
              <SeletorAno value={anoDashboard} onChange={setAnoDashboard} />
            </div>
          )}
        </div>

        {aba === 'mes' && (
          <div className="space-y-4">
            {/* Mês corrente e o que vem pela frente: a partir de hoje, não do mês selecionado no topo */}
            <RotuloSecao titulo="Mês atual" detalhe="a partir de hoje" />
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-8 [&>*]:h-full"><CardProximosVencimentos /></div>
              <div className="lg:col-span-4 [&>*]:h-full"><CardFimDoMes /></div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-8 [&>*]:h-full"><CardCategoriasMedia /></div>
              <div className="lg:col-span-4 [&>*]:h-full"><CardLimiteCredito /></div>
            </div>
            <CardTransacoesRecentes />
          </div>
        )}

        {aba === 'ano' && (
          <div className="space-y-4">
            <RotuloSecao titulo="Patrimônio" detalhe="últimos meses" />
            <CardSaldoHistorico />

            <div className="pt-2">
              <RotuloSecao titulo="Ano" detalhe={String(anoDashboard)} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-8 [&>*]:h-full"><CardGraficoMeses ano={anoDashboard} /></div>
              <div className="lg:col-span-4 [&>*]:h-full"><CardMaioresGastos ano={anoDashboard} /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="[&>*]:h-full"><CardCategorias ano={anoDashboard} tipo="despesa" /></div>
              <div className="[&>*]:h-full"><CardCategorias ano={anoDashboard} tipo="receita" /></div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-8 [&>*]:h-full"><GastosAnuaisCard ano={anoDashboard} /></div>
              <div className="lg:col-span-4 [&>*]:h-full"><CardParcelados /></div>
            </div>
            <CardRecorrentes ano={anoDashboard} />
          </div>
        )}

        {aba === 'investimentos' && (
          <div className="space-y-4">
            <RotuloSecao titulo="Investimentos" detalhe="posição atual" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="[&>*]:h-full"><CardAlocacao /></div>
              <div className="[&>*]:h-full"><CardCarteira /></div>
              <div className="md:col-span-2 lg:col-span-1 [&>*]:h-full"><CardProventosResumo /></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
