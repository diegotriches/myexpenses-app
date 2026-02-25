"use client";

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { CheckCircle2, Clock, TrendingUp, CalendarDays } from 'lucide-react';
import { useValoresPeriodo } from '@/hooks/useDashboard';
import { Skeleton } from '@/components/ui/skeleton';

export function CardValores() {
  const { data, isLoading } = useValoresPeriodo();

  const recebidos = data?.recebidos ?? 0;
  const aReceber = data?.aReceber ?? 0;
  const aPagar = data?.aPagar ?? 0;
  const projecao = data?.projecao ?? 0;

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  if (isLoading) {
    return (
      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardHeader><Skeleton className="h-4 w-[180px]" /></CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="dark:bg-gray-900 dark:border-gray-800">
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-900 dark:text-white">
          <CalendarDays className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          Valores do Período
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Recebidos */}
          <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 transition-colors">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/50 rounded-full">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-0.5">Já Recebido</p>
                <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                  {formatarMoeda(recebidos)}
                </p>
              </div>
            </div>
          </div>

          {/* A Receber */}
          {aReceber > 0 && (
            <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-950/50 transition-colors">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-blue-100 dark:bg-blue-900/50 rounded-full">
                  <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-0.5">A Receber</p>
                  <p className="text-lg font-bold text-blue-700 dark:text-blue-400">
                    {formatarMoeda(aReceber)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* A Pagar */}
          {aPagar > 0 && (
            <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-amber-100 dark:bg-amber-900/50 rounded-full">
                  <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-0.5">A Pagar</p>
                  <p className="text-lg font-bold text-amber-700 dark:text-amber-400">
                    {formatarMoeda(aPagar)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Projeção */}
          {(aReceber > 0 || aPagar > 0) && (
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <TrendingUp className={`w-4 h-4 ${
                    projecao >= 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`} />
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    Projeção (a receber - a pagar):
                  </span>
                </div>
                <span className={`text-base font-bold ${
                  projecao >= 0
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {formatarMoeda(projecao)}
                </span>
              </div>
            </div>
          )}

          {aReceber === 0 && aPagar === 0 && (
            <div className="text-center py-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Sem receitas ou despesas futuras neste período
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}