// src/components/dashboard/CardGraficosMeses.tsx
"use client";

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Loader2, AlertCircle } from 'lucide-react';
import { useGraficoMeses } from '@/hooks/useDashboard';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useMemo } from 'react';

type DadosGrafico = {
  mes: string;
  Receitas: number;
  Despesas: number;
  Balanço: number;
};

export function CardGraficoMeses() {
  // ✅ React Query - busca dados do gráfico (dados é um array de DadosGraficoMeses)
  const { data: dados, isLoading, error } = useGraficoMeses("6");

  // Calcula totais do período
  const totais = useMemo(() => {
    if (!dados || dados.length === 0) {
      return { receitas: 0, despesas: 0, balanco: 0 };
    }
    
    // ✅ Type annotations explícitas para evitar 'any' implícito
    const resultado = dados.reduce(
      (acc: { receitas: number; despesas: number; balanco: number }, item: { mes: string; receitas: number; despesas: number; balanco: number }) => {
        return {
          receitas: acc.receitas + (item.receitas ?? 0),
          despesas: acc.despesas + (item.despesas ?? 0),
          balanco: acc.balanco + (item.balanco ?? 0)
        };
      },
      { receitas: 0, despesas: 0, balanco: 0 }
    );
    
    return resultado;
  }, [dados]);

  // Formata valores para tooltip
  const formatarMoeda = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2
    }).format(value);
  };

  // Formata valores curtos para cards (ex: R$ 1,2k)
  const formatarMoedaCurta = (value: number) => {
    if (value >= 1000) {
      return `R$ ${(value / 1000).toFixed(1)}k`;
    }
    return formatarMoeda(value);
  };

  // Formata o mês (YYYY-MM) para exibição
  const formatarMes = (mes: string) => {
    try {
      const [ano, mesNum] = mes.split('-');
      const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const mesNome = meses[parseInt(mesNum) - 1] || mes;
      
      // Formato: "Jan/26"
      return `${mesNome}/${ano.slice(2)}`;
    } catch {
      return mes;
    }
  };

  // Prepara dados para o gráfico
  const dadosGrafico = useMemo<DadosGrafico[]>(() => {
    if (!dados || dados.length === 0) return [];
    
    // ✅ Type annotation explícita para evitar 'any' implícito
    const resultado = dados.map((item: { mes: string; receitas: number; despesas: number; balanco: number }) => {
      return {
        mes: formatarMes(item.mes ?? ''),
        Receitas: item.receitas ?? 0,
        Despesas: item.despesas ?? 0,
        Balanço: item.balanco ?? 0
      };
    });
    
    return resultado;
  }, [dados]);

  // 🌓 Cores do gráfico (responsivas ao tema via CSS variables)
  const colors = {
    receitas: '#16a34a', // green-600
    despesas: '#dc2626', // red-600
    balanco: '#2563eb',  // blue-600
  };

  // Loading state
  if (isLoading) {
    return (
      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">
            <span className="hidden sm:inline">Evolução Financeira - Últimos 6 Meses</span>
            <span className="sm:hidden">Evolução (6 meses)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">
            <span className="hidden sm:inline">Evolução Financeira - Últimos 6 Meses</span>
            <span className="sm:hidden">Evolução (6 meses)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error instanceof Error ? error.message : 'Erro ao carregar dados'}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="dark:bg-gray-900 dark:border-gray-800">
      <CardHeader>
        <CardTitle className="text-gray-900 dark:text-white">
          <span className="hidden sm:inline">Evolução Financeira - Últimos 6 Meses</span>
          <span className="sm:hidden">Evolução (6 meses)</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {!dados || dados.length === 0 ? (
          <div className="text-center py-8">
            <TrendingUp className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Nenhum dado disponível
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Dados dos últimos 6 meses aparecerão aqui
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Cards de resumo */}
            <div className="grid grid-cols-3 gap-2">
              {/* Receitas */}
              <div className="flex flex-col items-center p-2 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400 mb-1" />
                <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                  Receitas
                </span>
                <span className="text-sm font-bold text-green-700 dark:text-green-400">
                  <span className="hidden sm:inline">{formatarMoeda(totais.receitas)}</span>
                  <span className="sm:hidden">{formatarMoedaCurta(totais.receitas)}</span>
                </span>
              </div>
              
              {/* Despesas */}
              <div className="flex flex-col items-center p-2 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
                <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400 mb-1" />
                <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                  Despesas
                </span>
                <span className="text-sm font-bold text-red-700 dark:text-red-400">
                  <span className="hidden sm:inline">{formatarMoeda(totais.despesas)}</span>
                  <span className="sm:hidden">{formatarMoedaCurta(totais.despesas)}</span>
                </span>
              </div>
              
              {/* Balanço */}
              <div className={`flex flex-col items-center p-2 rounded-lg border ${
                totais.balanco >= 0 
                  ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800' 
                  : 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800'
              }`}>
                <DollarSign className={`w-4 h-4 mb-1 ${
                  totais.balanco >= 0 
                    ? 'text-blue-600 dark:text-blue-400' 
                    : 'text-orange-600 dark:text-orange-400'
                }`} />
                <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                  Balanço
                </span>
                <span className={`text-sm font-bold ${
                  totais.balanco >= 0 
                    ? 'text-blue-700 dark:text-blue-400' 
                    : 'text-orange-700 dark:text-orange-400'
                }`}>
                  <span className="hidden sm:inline">{formatarMoeda(totais.balanco)}</span>
                  <span className="sm:hidden">{formatarMoedaCurta(totais.balanco)}</span>
                </span>
              </div>
            </div>

            {/* Gráfico */}
            <ResponsiveContainer width="100%" height={280} className="hidden sm:block">
              <BarChart 
                data={dadosGrafico} 
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-300 dark:stroke-gray-700" />
                <XAxis 
                  dataKey="mes" 
                  tick={{ fontSize: 11 }}
                  className="fill-gray-600 dark:fill-gray-400"
                />
                <YAxis 
                  tick={{ fontSize: 11 }}
                  className="fill-gray-600 dark:fill-gray-400"
                  tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                  width={60}
                />
                <Tooltip 
                  formatter={(value: number | undefined) => value !== undefined ? formatarMoeda(value) : 'R$ 0,00'}
                  contentStyle={{
                    backgroundColor: 'var(--background)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Legend 
                  wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                  iconType="circle"
                  iconSize={10}
                />
                <Bar dataKey="Receitas" fill={colors.receitas} radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="Despesas" fill={colors.despesas} radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="Balanço" fill={colors.balanco} radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>

            {/* Gráfico Mobile */}
            <ResponsiveContainer width="100%" height={220} className="sm:hidden">
              <BarChart 
                data={dadosGrafico} 
                margin={{ top: 10, right: 5, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-300 dark:stroke-gray-700" />
                <XAxis 
                  dataKey="mes" 
                  tick={{ fontSize: 9 }}
                  className="fill-gray-600 dark:fill-gray-400"
                  angle={-45}
                  textAnchor="end"
                  height={50}
                />
                <YAxis 
                  tick={{ fontSize: 9 }}
                  className="fill-gray-600 dark:fill-gray-400"
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  width={40}
                />
                <Tooltip 
                  formatter={(value: number | undefined) => value !== undefined ? formatarMoeda(value) : 'R$ 0,00'}
                  contentStyle={{
                    backgroundColor: 'var(--background)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: '11px',
                  }}
                />
                <Legend 
                  wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }}
                  iconType="circle"
                  iconSize={8}
                />
                <Bar dataKey="Receitas" fill={colors.receitas} radius={[4, 4, 0, 0]} maxBarSize={30} />
                <Bar dataKey="Despesas" fill={colors.despesas} radius={[4, 4, 0, 0]} maxBarSize={30} />
                <Bar dataKey="Balanço" fill={colors.balanco} radius={[4, 4, 0, 0]} maxBarSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}