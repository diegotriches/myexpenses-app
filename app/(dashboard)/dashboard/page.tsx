"use client"

import { useMemo } from 'react';
import useSWR from 'swr';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

import { Transacao } from '@/types/transacao';
import {
  calcularResumo, ultimasTransacoes,
  contarCondicoes, contarFormas, calcularGraficoMeses
} from '@/utils/dashboard';
import { usePeriodo } from '@/contexts/PeriodoContext';

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
import { Wallet, CreditCard, DollarSign, PieChart, BarChart3, } from 'lucide-react';
import { BsHouse } from "react-icons/bs";

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface Conta {
  id: string;
  nome: string;
  saldoAtual: number;
  banco?: string;
  ativo: boolean;
}

interface Cartao {
  id: number;
  nome: string;
  tipo: string;
  limite: number;
  limiteDisponivel: number;
  bandeira: string;
  ativo: boolean;
}

export default function Dashboard() {
  const { mesSelecionado, anoSelecionado } = usePeriodo();

  // Formata período no formato YYYY-MM para API
  const periodo = `${anoSelecionado}-${String(mesSelecionado + 1).padStart(2, '0')}`;

  const { data: transacoes, isLoading: loadingTransacoes } = useSWR<Transacao[]>(
    `/api/transacoes?ano=${anoSelecionado}&mes=${mesSelecionado + 1}`,
    fetcher
  );
  const { data: contas, isLoading: loadingContas } = useSWR<Conta[]>('/api/contas', fetcher);
  const { data: cartoes, isLoading: loadingCartoes } = useSWR<Cartao[]>('/api/cartoes', fetcher);
  
  const graficoMeses = useMemo(() => {
    if (!transacoes) return [];
    return calcularGraficoMeses(transacoes, 6);
  }, [transacoes]);

  const resumo = transacoes ? calcularResumo(transacoes) : null;
  const ultimas = transacoes ? ultimasTransacoes(transacoes, 5) : [];
  const condicoes = transacoes ? contarCondicoes(transacoes) : { dinheiro: 0, pix: 0, cartao: 0 };
  const formas = transacoes ? contarFormas(transacoes) : { aVista: 0, parcelado: 0, recorrente: 0 };

  // Cálculos de totais
  const totais = useMemo(() => {
    if (!contas || !cartoes) return null;

    // Total de todas as contas ativas
    const contasAtivas = contas.filter(c => c.ativo);
    const totalContas = contasAtivas.reduce((acc, c) => acc + Number(c.saldoAtual), 0);

    // Cartões de crédito ativos
    const cartoesCredito = cartoes.filter(c => c.tipo === 'credito' && c.ativo);
    const limiteTotal = cartoesCredito.reduce((acc, c) => acc + Number(c.limite), 0);

    // Calcular limite usado: soma dos gastos já feitos em cada cartão
    // O limiteDisponivel vem da API e já foi calculado considerando as transações
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
      quantidadeCartoes: cartoesCredito.length
    };
  }, [contas, cartoes]);

  const skeleton = <Skeleton count={1} height={120} />;

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  return (
    <div className="max-w-[1200px] mx-auto p-6 space-y-6">
      {/* Header simples */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <BsHouse className="text-3xl text-blue-700 dark:text-blue-500" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Visão geral das suas finanças
        </p>
        <hr className="border-t border-gray-300 dark:border-gray-700" />
      </div>

      {/* Cards de resumo principal */}
      {loadingTransacoes || loadingContas ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} count={1} height={120} />
          ))}
        </div>
      ) : (
        <CardResumo
          resumo={resumo!}
          saldoContas={totais?.totalContas}
          quantidadeContas={totais?.quantidadeContas}
        />
      )}

      {/* Cards de Cartões - 2 colunas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Limite Total de Crédito */}
        {loadingCartoes || loadingTransacoes ? skeleton : (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Limite Total de Crédito</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground dark:text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatarMoeda(totais?.limiteTotal || 0)}
              </div>
              <div className="mt-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground dark:text-gray-400">Disponível:</span>
                  <span className="font-medium text-green-600 dark:text-green-400">
                    {formatarMoeda(totais?.limiteDisponivel || 0)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground dark:text-gray-400">Usado:</span>
                  <span className="font-medium text-red-600 dark:text-red-400">
                    {formatarMoeda(totais?.limiteUsado || 0)}
                  </span>
                </div>
                <div className="w-full bg-muted dark:bg-gray-700 rounded-full h-2 mt-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      (totais?.percentualUso || 0) > 80
                        ? 'bg-red-500'
                        : (totais?.percentualUso || 0) > 50
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(totais?.percentualUso || 0, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground dark:text-gray-400 text-right">
                  {(totais?.percentualUso || 0).toFixed(1)}% utilizado
                </p>
              </div>
              {totais?.quantidadeCartoes === 0 && (
                <p className="text-xs text-muted-foreground dark:text-gray-400 text-center mt-4">
                  Nenhum cartão de crédito cadastrado
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Lista de Contas */}
        {loadingContas ? skeleton : (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                Minhas Contas
                <Badge variant="secondary">
                  {totais?.quantidadeContas || 0}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {contas
                ?.filter(c => c.ativo)
                .slice(0, 3)
                .map((conta) => (
                  <div
                    key={conta.id}
                    className="flex items-center justify-between p-2 rounded-md bg-muted/50 dark:bg-gray-800/50"
                  >
                    <div className="flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-muted-foreground dark:text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{conta.nome}</p>
                        {conta.banco && (
                          <p className="text-xs text-muted-foreground dark:text-gray-400">{conta.banco}</p>
                        )}
                      </div>
                    </div>
                    <span
                      className={`text-sm font-semibold ${
                        conta.saldoAtual >= 0 
                          ? 'text-green-600 dark:text-green-400' 
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {formatarMoeda(conta.saldoAtual)}
                    </span>
                  </div>
                ))}
              {(totais?.quantidadeContas || 0) === 0 && (
                <p className="text-sm text-muted-foreground dark:text-gray-400 text-center py-4">
                  Nenhuma conta cadastrada
                </p>
              )}
              {(totais?.quantidadeContas || 0) > 3 && (
                <p className="text-xs text-muted-foreground dark:text-gray-400 text-center pt-2">
                  + {(totais?.quantidadeContas || 0) - 3} contas
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Tabs de visualização */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview" className="gap-2">
            <PieChart className="h-4 w-4" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Análises
          </TabsTrigger>
          <TabsTrigger value="details" className="gap-2">
            <DollarSign className="h-4 w-4" />
            Detalhes
          </TabsTrigger>
        </TabsList>

        {/* Tab: Visão Geral */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {loadingTransacoes ? skeleton : <CardGraficoMeses dados={graficoMeses} />}
            {loadingTransacoes ? skeleton : <CardTransacoesRecentes transacoes={ultimas} />}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {loadingTransacoes ? skeleton : <CardCondicoesPagamento dados={condicoes} />}
            {loadingTransacoes ? skeleton : <CardFormasPagamento dados={formas} />}
            {loadingTransacoes ? skeleton : <CardFaturas transacoes={transacoes!} periodo={periodo} />}
          </div>
        </TabsContent>

        {/* Tab: Análises */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {loadingTransacoes ? skeleton : <CardCategoriasLancamentos transacoes={transacoes!} />}
            {loadingTransacoes ? skeleton : <CardCategoriasReceita transacoes={transacoes!} />}
            {loadingTransacoes ? skeleton : <CardCategoriasDespesa transacoes={transacoes!} />}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loadingTransacoes ? skeleton : <CardMaioresGastos transacoes={transacoes!} mesAno={periodo} />}
            {loadingTransacoes ? skeleton : <CardValores transacoes={transacoes!} />}
          </div>
        </TabsContent>

        {/* Tab: Detalhes */}
        <TabsContent value="details" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loadingTransacoes ? skeleton : <CardParcelados transacoes={transacoes!} />}
            {loadingTransacoes ? skeleton : <CardRecorrentes transacoes={transacoes!} />}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}