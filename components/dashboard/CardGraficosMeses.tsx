// src/components/dashboard/CardGraficosMeses.tsx
"use client";

import { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Loader2, AlertCircle } from 'lucide-react';
import { useGraficoMeses } from '@/hooks/useDashboard';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useHideValues } from '@/contexts/HideValuesContext';

type DadosGrafico = {
  mes: string;
  Receitas: number;
  Despesas: number;
  Balanço: number;
};

function formatarMes(mes: string) {
  try {
    const [ano, mesNum] = mes.split('-');
    const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    return `${meses[parseInt(mesNum) - 1] || mes}/${ano.slice(2)}`;
  } catch {
    return mes;
  }
}

// ✅ Agora recebe o período como prop — controlado pelo seletor global da aba
interface CardGraficoMesesProps {
  periodoMeses: 3 | 6 | 12;
}

export function CardGraficoMeses({ periodoMeses }: CardGraficoMesesProps) {
  const periodo = String(periodoMeses) as "3" | "6" | "12";
  const { data: dados, isLoading, error } = useGraficoMeses(periodo);
  const { hidden, mask } = useHideValues();

  const formatarMoeda = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(value);

  const formatarMoedaCurta = (value: number) =>
    value >= 1000 ? `R$ ${(value / 1000).toFixed(1)}k` : formatarMoeda(value);

  const fmt  = (v: number) => mask(formatarMoeda(v));
  const fmtC = (v: number) => mask(formatarMoedaCurta(v));

  const totais = useMemo(() => {
    if (!dados || dados.length === 0) return { receitas: 0, despesas: 0, balanco: 0 };
    return dados.reduce(
      (acc: { receitas: number; despesas: number; balanco: number }, item: any) => ({
        receitas: acc.receitas + (item.receitas ?? 0),
        despesas: acc.despesas + (item.despesas ?? 0),
        balanco:  acc.balanco  + (item.balanco  ?? 0),
      }),
      { receitas: 0, despesas: 0, balanco: 0 }
    );
  }, [dados]);

  const dadosGrafico = useMemo<DadosGrafico[]>(() => {
    if (!dados || dados.length === 0) return [];
    return dados.map((item: any) => ({
      mes:      formatarMes(item.mes ?? ''),
      Receitas: item.receitas ?? 0,
      Despesas: item.despesas ?? 0,
      Balanço:  item.balanco  ?? 0,
    }));
  }, [dados]);

  const colors = { receitas: '#16a34a', despesas: '#dc2626', balanco: '#2563eb' };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg text-xs space-y-1">
        <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.dataKey} style={{ color: p.fill }}>
            {p.name}: {hidden ? "••••••" : formatarMoeda(p.value)}
          </p>
        ))}
      </div>
    );
  };

  // ✅ Removido o botão de período do header — agora é só o título,
  // controlado pelo SeletorPeriodoMeses no topo da aba
  const cardTitle = (
    <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-900 dark:text-white">
      <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      <span className="hidden sm:inline">Evolução Financeira - Últimos {periodoMeses} Meses</span>
      <span className="sm:hidden">Evolução ({periodoMeses}m)</span>
    </CardTitle>
  );

  if (isLoading) {
    return (
      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardHeader>{cardTitle}</CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardHeader>{cardTitle}</CardHeader>
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
      <CardHeader>{cardTitle}</CardHeader>
      <CardContent>
        {!dados || dados.length === 0 ? (
          <div className="text-center py-8">
            <TrendingUp className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum dado disponível</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Dados dos últimos {periodoMeses} meses aparecerão aqui
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <div className="flex flex-col items-center p-2 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400 mb-1" />
                <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Receitas</span>
                <span className="text-sm font-bold text-green-700 dark:text-green-400">
                  <span className="hidden sm:inline">{fmt(totais.receitas)}</span>
                  <span className="sm:hidden">{fmtC(totais.receitas)}</span>
                </span>
              </div>
              <div className="flex flex-col items-center p-2 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
                <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400 mb-1" />
                <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Despesas</span>
                <span className="text-sm font-bold text-red-700 dark:text-red-400">
                  <span className="hidden sm:inline">{fmt(totais.despesas)}</span>
                  <span className="sm:hidden">{fmtC(totais.despesas)}</span>
                </span>
              </div>
              <div className={`flex flex-col items-center p-2 rounded-lg border ${
                totais.balanco >= 0
                  ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800'
                  : 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800'
              }`}>
                <DollarSign className={`w-4 h-4 mb-1 ${
                  totais.balanco >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'
                }`} />
                <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Balanço</span>
                <span className={`text-sm font-bold ${
                  totais.balanco >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-orange-700 dark:text-orange-400'
                }`}>
                  <span className="hidden sm:inline">{fmt(totais.balanco)}</span>
                  <span className="sm:hidden">{fmtC(totais.balanco)}</span>
                </span>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={280} className="hidden sm:block">
              <BarChart data={dadosGrafico} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-300 dark:stroke-gray-700" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} className="fill-gray-600 dark:fill-gray-400" />
                <YAxis
                  tick={{ fontSize: 11 }}
                  className="fill-gray-600 dark:fill-gray-400"
                  tickFormatter={(v) => hidden ? "••••" : `R$ ${(v / 1000).toFixed(0)}k`}
                  width={60}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} iconType="circle" iconSize={10} />
                <Bar dataKey="Receitas" fill={colors.receitas} radius={[4,4,0,0]} maxBarSize={40} />
                <Bar dataKey="Despesas" fill={colors.despesas} radius={[4,4,0,0]} maxBarSize={40} />
                <Bar dataKey="Balanço"  fill={colors.balanco}  radius={[4,4,0,0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>

            <ResponsiveContainer width="100%" height={220} className="sm:hidden">
              <BarChart data={dadosGrafico} margin={{ top: 10, right: 5, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-300 dark:stroke-gray-700" />
                <XAxis dataKey="mes" tick={{ fontSize: 9 }} className="fill-gray-600 dark:fill-gray-400" angle={-45} textAnchor="end" height={50} />
                <YAxis
                  tick={{ fontSize: 9 }}
                  className="fill-gray-600 dark:fill-gray-400"
                  tickFormatter={(v) => hidden ? "•••" : `${(v / 1000).toFixed(0)}k`}
                  width={40}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} iconType="circle" iconSize={8} />
                <Bar dataKey="Receitas" fill={colors.receitas} radius={[4,4,0,0]} maxBarSize={30} />
                <Bar dataKey="Despesas" fill={colors.despesas} radius={[4,4,0,0]} maxBarSize={30} />
                <Bar dataKey="Balanço"  fill={colors.balanco}  radius={[4,4,0,0]} maxBarSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}