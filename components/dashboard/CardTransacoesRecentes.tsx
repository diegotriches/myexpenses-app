"use client";

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ArrowUpCircle, ArrowDownCircle, Calendar, Clock } from 'lucide-react';
import { useTransacoesRecentes } from '@/hooks/useDashboard';
import { Skeleton } from '@/components/ui/skeleton';
import { useHideValues } from '@/contexts/HideValuesContext';

export function CardTransacoesRecentes() {
  const { data, isLoading } = useTransacoesRecentes(5);
  const { mask } = useHideValues();

  const transacoes = data?.transacoes ?? [];

  const formatarData = (data: string | Date) => {
    const date = typeof data === 'string' ? new Date(data) : data;
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatarMoeda = (valor: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);

  const fmt = (valor: number) => mask(formatarMoeda(valor));

  if (isLoading) {
    return (
      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardHeader><Skeleton className="h-4 w-[180px]" /></CardHeader>
        <CardContent className="space-y-2">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="dark:bg-gray-900 dark:border-gray-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
          <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          Últimas Transações
        </CardTitle>
      </CardHeader>
      <CardContent>
        {transacoes.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Nenhuma transação encontrada
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Suas últimas transações aparecerão aqui
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {transacoes.map(t => {
              const isReceita = t.tipo === 'entrada';

              return (
                <li
                  key={t.id}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className={`p-1.5 rounded-full flex-shrink-0 group-hover:scale-110 transition-transform ${
                      isReceita
                        ? 'bg-green-100 dark:bg-green-900/30'
                        : 'bg-red-100 dark:bg-red-900/30'
                    }`}>
                      {isReceita ? (
                        <ArrowUpCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                      ) : (
                        <ArrowDownCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                      )}
                    </div>

                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                        {t.descricao || (isReceita ? 'Receita' : 'Despesa')}
                      </span>

                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        {t.data && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatarData(t.data)}
                          </div>
                        )}
                        {t.categoria && (
                          <>
                            <span>•</span>
                            <span className="truncate">{t.categoria}</span>
                          </>
                        )}
                        {t.parcelado && t.parcelas && (
                          <>
                            <span>•</span>
                            <span className="text-orange-600 dark:text-orange-400 font-medium">
                              {t.parcelaAtual}/{t.parcelas}x
                            </span>
                          </>
                        )}
                        {t.recorrente && (
                          <>
                            <span>•</span>
                            <span className="text-purple-600 dark:text-purple-400 font-medium">
                              Recorrente
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <span className={`text-sm font-bold whitespace-nowrap ml-2 ${
                    isReceita
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {isReceita ? '+' : '-'} {fmt(t.valor)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        {transacoes.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Mostrando {transacoes.length} transação{transacoes.length !== 1 ? '(ões)' : ''} mais recente{transacoes.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}