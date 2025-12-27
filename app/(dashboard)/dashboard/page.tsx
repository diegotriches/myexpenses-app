"use client"

import { useMemo } from 'react';
import useSWR from 'swr';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

import { Transacao } from '@/types/transacao';
import {
  calcularResumo,
  ultimasTransacoes,
  contarCondicoes,
  contarFormas,
  calcularGraficoMeses
} from '@/utils/dashboard';
import { usePeriodo } from '@/components/PeriodoContext';

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
import {
  Wallet,
  CreditCard,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface Conta {
  id: string;
  nome: string;
  tipo: string;
  saldoAtual: number;
  banco?: string;
}

interface Cartao {
  id: number;
  nome: string;
  tipo: string;
  limite: number;
  limiteDisponivel: number;
  bandeira: string;
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

    const contasBancarias = contas.filter(c => c.tipo === 'BANCARIA');
    const cartoesCredito = cartoes.filter(c => c.tipo === 'credito');

    const totalContas = contasBancarias.reduce((acc, c) => acc + Number(c.saldoAtual), 0);
    const limiteTotal = cartoesCredito.reduce((acc, c) => acc + c.limite, 0);
    const limiteDisponivel = cartoesCredito.reduce((acc, c) => acc + c.limiteDisponivel, 0);
    const limiteUsado = limiteTotal - limiteDisponivel;

    return {
      totalContas,
      limiteTotal,
      limiteDisponivel,
      limiteUsado,
      percentualUso: limiteTotal > 0 ? (limiteUsado / limiteTotal) * 100 : 0
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
    <div className="space-y-6">
      {/* Header simples */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral das suas finanças</p>
      </div>

      {/* Cards de resumo principal - agora usando CardResumo */}
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
          quantidadeContas={contas?.filter(c => c.tipo === 'BANCARIA').length}
        />
      )}

      {/* Cards de Cartões - 2 colunas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Limite Total de Crédito */}
        {loadingCartoes ? skeleton : (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Limite Total de Crédito</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatarMoeda(totais?.limiteTotal || 0)}
              </div>
              <div className="mt-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Disponível:</span>
                  <span className="font-medium text-green-600">
                    {formatarMoeda(totais?.limiteDisponivel || 0)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Usado:</span>
                  <span className="font-medium text-red-600">
                    {formatarMoeda(totais?.limiteUsado || 0)}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 mt-2">
                  <div
                    className={`h-2 rounded-full transition-all ${(totais?.percentualUso || 0) > 80
                      ? 'bg-red-500'
                      : (totais?.percentualUso || 0) > 50
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                      }`}
                    style={{ width: `${totais?.percentualUso || 0}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground text-right">
                  {(totais?.percentualUso || 0).toFixed(1)}% utilizado
                </p>
              </div>
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
                  {contas?.filter(c => c.tipo === 'BANCARIA').length || 0}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {contas
                ?.filter(c => c.tipo === 'BANCARIA')
                .slice(0, 3)
                .map((conta) => (
                  <div
                    key={conta.id}
                    className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{conta.nome}</p>
                        {conta.banco && (
                          <p className="text-xs text-muted-foreground">{conta.banco}</p>
                        )}
                      </div>
                    </div>
                    <span
                      className={`text-sm font-semibold ${conta.saldoAtual >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                    >
                      {formatarMoeda(conta.saldoAtual)}
                    </span>
                  </div>
                ))}
              {(contas?.filter(c => c.tipo === 'BANCARIA').length || 0) === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma conta cadastrada
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