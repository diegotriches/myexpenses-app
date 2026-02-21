"use client";

import { useMemo } from 'react';

import { useDashboard, useDespesasFuturas } from '@/hooks/useDashboard';
import { useContas } from '@/hooks/useContas';
import { useCartoes } from '@/hooks/useCartoes';

import { CardResumo } from '@/components/dashboard/CardResumo';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Wallet, CreditCard, PieChart, BarChart3, DollarSign } from 'lucide-react';
import { BsHouse } from "react-icons/bs";

export default function Dashboard() {
  const { data: dashboard, isLoading: loadingDashboard } = useDashboard();
  const { data: despesasFuturas, isLoading: loadingDespesasFuturas } = useDespesasFuturas();
  const { data: contas = [], isLoading: loadingContas } = useContas();
  const { data: cartoes = [], isLoading: loadingCartoes } = useCartoes();

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
        <div className="flex items-center gap-2 mb-3">
          <BsHouse className="text-3xl text-blue-700 dark:text-blue-500" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400 mb-4">Visão geral das suas finanças</p>
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
        {isLoading ? <CardSkeleton /> : (
          <Card className="dark:bg-gray-900 dark:border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-900 dark:text-white">
                Limite Total de Crédito
              </CardTitle>
              <CreditCard className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatarMoeda(totais?.limiteTotal || 0)}
              </div>
              <div className="mt-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Disponível:</span>
                  <span className="font-medium text-green-600 dark:text-green-400">
                    {formatarMoeda(totais?.limiteDisponivel || 0)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Usado:</span>
                  <span className="font-medium text-red-600 dark:text-red-400">
                    {formatarMoeda(totais?.limiteUsado || 0)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      (totais?.percentualUso || 0) > 80 ? 'bg-red-500'
                      : (totais?.percentualUso || 0) > 50 ? 'bg-yellow-500'
                      : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(totais?.percentualUso || 0, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 text-right">
                  {(totais?.percentualUso || 0).toFixed(1)}% utilizado
                </p>
              </div>
              {totais?.quantidadeCartoes === 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4">
                  Nenhum cartão de crédito cadastrado
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {isLoading ? <CardSkeleton /> : (
          <Card className="dark:bg-gray-900 dark:border-gray-800">
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center justify-between text-gray-900 dark:text-white">
                Minhas Contas
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

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="dark:bg-gray-800">
          <TabsTrigger value="overview" className="gap-2 dark:data-[state=active]:bg-gray-700">
            <PieChart className="h-4 w-4" />Visão Geral
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2 dark:data-[state=active]:bg-gray-700">
            <BarChart3 className="h-4 w-4" />Análises
          </TabsTrigger>
          <TabsTrigger value="details" className="gap-2 dark:data-[state=active]:bg-gray-700">
            <DollarSign className="h-4 w-4" />Detalhes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <CardGraficoMeses />
            <CardTransacoesRecentes />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <CardCondicoesPagamento />
            <CardFormasPagamento />
            <CardFaturas />
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <CardCategoriasLancamentos />
            <CardCategoriasReceita />
            <CardCategoriasDespesa />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CardMaioresGastos />
            <CardValores />
          </div>
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CardParcelados />
            <CardRecorrentes />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}