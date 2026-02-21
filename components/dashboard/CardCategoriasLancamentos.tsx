"use client";

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { agruparPorCategoria } from '@/utils/dashboardUtils';
import { BarChart3 } from 'lucide-react';
import { useMemo } from 'react';
import { useTransacoes } from '@/hooks/useTransacoes';
import { Skeleton } from '@/components/ui/skeleton';

export function CardCategoriasLancamentos() {
  const { data: transacoes = [], isLoading } = useTransacoes();

  const categorias = useMemo(() => {
    return agruparPorCategoria(transacoes);
  }, [transacoes]);

  const totalLancamentos = useMemo(() => {
    return categorias.reduce((acc, c) => acc + c.quantidade, 0);
  }, [categorias]);

  const totalValor = useMemo(() => {
    return categorias.reduce((acc, c) => acc + c.total, 0);
  }, [categorias]);

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
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
          <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          Categorias com Mais Lançamentos
        </CardTitle>
      </CardHeader>
      <CardContent>
        {categorias.length === 0 ? (
          <div className="text-center py-8">
            <BarChart3 className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum lançamento encontrado</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Os lançamentos aparecerão aqui quando você registrá-los
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {categorias.slice(0, 5).map((c, index) => {
              const porcentagemQuantidade = totalLancamentos > 0
                ? (c.quantidade / totalLancamentos) * 100
                : 0;

              return (
                <div
                  key={c.categoria}
                  className="flex items-center gap-2.5 p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
                >
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-bold flex-shrink-0 group-hover:scale-110 transition-transform">
                    {index + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                        {c.categoria}
                      </span>
                      <span className="text-sm font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap ml-2">
                        {c.quantidade} lançamento{c.quantidade !== 1 ? 's' : ''}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300"
                          style={{ width: `${porcentagemQuantidade}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">
                        {porcentagemQuantidade.toFixed(1)}%
                      </span>
                    </div>

                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Total: {formatarMoeda(c.total)}
                    </p>
                  </div>
                </div>
              );
            })}

            {categorias.length > 5 && (
              <div className="text-center pt-1">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  + {categorias.length - 5} categoria{categorias.length - 5 !== 1 ? 's' : ''} com lançamentos
                </p>
              </div>
            )}

            <div className="pt-2 border-t border-gray-200 dark:border-gray-700 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total de lançamentos:
                </span>
                <span className="text-base font-bold text-blue-600 dark:text-blue-400">
                  {totalLancamentos}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500 dark:text-gray-400">Valor total:</span>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {formatarMoeda(totalValor)}
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}