// src/components/dashboard/CardCategoriasReceita.tsx
"use client";

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { categoriasReceita } from '@/utils/dashboardUtils';
import { TrendingUp } from 'lucide-react';
import { useMemo } from 'react';
import { useTransacoes } from '@/hooks/useTransacoes';
import { Skeleton } from '@/components/ui/skeleton';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useHideValues } from '@/contexts/HideValuesContext';

const CORES_RECEITA = [
  '#22c55e', '#16a34a', '#4ade80',
  '#14b8a6', '#06b6d4',
];

interface CardCategoriasReceitaProps {
  periodoMeses: 3 | 6 | 12;
}

export function CardCategoriasReceita({ periodoMeses }: CardCategoriasReceitaProps) {
  const { data: transacoes = [], isLoading } = useTransacoes();
  const { hidden, mask } = useHideValues();

  const dataCorte = useMemo(() => {
    const hoje = new Date();
    return new Date(hoje.getFullYear(), hoje.getMonth() - periodoMeses + 1, 1);
  }, [periodoMeses]);

  const transacoesNoPeriodo = useMemo(() => {
    return transacoes.filter((t) => {
      const dataT = typeof t.data === 'string' ? new Date(t.data) : t.data;
      return dataT >= dataCorte;
    });
  }, [transacoes, dataCorte]);

  const categorias = useMemo(() => categoriasReceita(transacoesNoPeriodo), [transacoesNoPeriodo]);

  const totalReceitas = useMemo(
    () => categorias.reduce((acc, c) => acc + c.total, 0),
    [categorias]
  );

  const formatarMoeda = (valor: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);

  const fmt = (valor: number) => mask(formatarMoeda(valor));

  const chartData = useMemo(() =>
    categorias.slice(0, 5).map((c, i) => ({
      name:           c.categoria,
      value:          c.total,
      porcentagem:    totalReceitas > 0 ? (c.total / totalReceitas) * 100 : 0,
      totalFormatado: formatarMoeda(c.total),
      cor:            CORES_RECEITA[i % CORES_RECEITA.length],
    })),
    [categorias, totalReceitas]
  );

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 shadow-lg text-xs">
        <p className="font-semibold text-gray-800 dark:text-gray-200">{payload[0].name}</p>
        <p className="text-gray-600 dark:text-gray-400">
          {hidden ? "••••••" : payload[0].payload.totalFormatado} ({payload[0].payload.porcentagem.toFixed(1)}%)
        </p>
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardHeader><Skeleton className="h-4 w-[200px]" /></CardHeader>
        <CardContent className="space-y-2.5">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="dark:bg-gray-900 dark:border-gray-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
          <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
          Categorias com Maior Receita
        </CardTitle>
      </CardHeader>
      <CardContent>
        {categorias.length === 0 ? (
          <div className="text-center py-8">
            <TrendingUp className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Nenhuma receita encontrada</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              As receitas aparecerão aqui quando você registrá-las
            </p>
          </div>
        ) : (
          <div className="space-y-4">

            <div className="flex justify-center">
              <div className="w-[140px] h-[140px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={chartData} cx="50%" cy="50%" outerRadius={65} dataKey="value" strokeWidth={0}>
                      {chartData.map((entry, index) => (
                        <Cell key={index} fill={entry.cor} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="space-y-2.5">
              {categorias.slice(0, 5).map((c, index) => {
                const porcentagem = totalReceitas > 0 ? (c.total / totalReceitas) * 100 : 0;
                const cor = CORES_RECEITA[index % CORES_RECEITA.length];

                return (
                  <div
                    key={c.categoria}
                    className="flex items-center gap-2.5 p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
                  >
                    <div
                      className="flex items-center justify-center w-7 h-7 rounded-full text-white text-xs font-bold flex-shrink-0 group-hover:scale-110 transition-transform"
                      style={{ backgroundColor: cor }}
                    >
                      {index + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                          {c.categoria}
                        </span>
                        <span className="text-sm font-bold text-green-600 dark:text-green-400 ml-2 whitespace-nowrap">
                          {fmt(c.total)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full transition-all duration-300"
                            style={{ width: `${porcentagem}%`, backgroundColor: cor }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">
                          {porcentagem.toFixed(1)}%
                        </span>
                      </div>

                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {c.quantidade} lançamento{c.quantidade !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                );
              })}

              {categorias.length > 5 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center pt-1">
                  + {categorias.length - 5} categoria{categorias.length - 5 !== 1 ? 's' : ''} com receitas
                </p>
              )}

              <div className="pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total em receitas:</span>
                <span className="text-base font-bold text-green-600 dark:text-green-400">
                  {fmt(totalReceitas)}
                </span>
              </div>
            </div>

          </div>
        )}
      </CardContent>
    </Card>
  );
}