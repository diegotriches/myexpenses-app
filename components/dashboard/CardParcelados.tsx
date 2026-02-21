"use client";

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { filtrarParceladas } from '@/utils/dashboardUtils';
import { Calendar, CreditCard, Layers } from 'lucide-react';
import { useMemo } from 'react';
import { useTransacoes } from '@/hooks/useTransacoes';
import { Skeleton } from '@/components/ui/skeleton';
import { Transacao } from '@/types/transacao';

export function CardParcelados() {
  const { data: transacoes = [], isLoading } = useTransacoes();

  const parceladas = useMemo(() => filtrarParceladas(transacoes), [transacoes]);

  const comprasParceladas = useMemo(() => {
    const mapa = new Map<string, Transacao & { totalCompra: number }>();

    parceladas.forEach(t => {
      if (t.parcelamentoId) {
        if (!mapa.has(t.parcelamentoId)) {
          const valorParcela = Number(t.valor);
          const totalCompra = t.parcelas ? valorParcela * t.parcelas : valorParcela;
          mapa.set(t.parcelamentoId, { ...t, totalCompra });
        }
      } else {
        const valorParcela = Number(t.valor);
        const totalCompra = t.parcelas ? valorParcela * t.parcelas : valorParcela;
        mapa.set(t.id, { ...t, totalCompra });
      }
    });

    return Array.from(mapa.values());
  }, [parceladas]);

  const totalParcelado = useMemo(() => {
    return comprasParceladas.reduce((acc, t) => acc + t.totalCompra, 0);
  }, [comprasParceladas]);

  const formatarData = (data: string | Date) => {
    const date = typeof data === 'string' ? new Date(data) : data;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
  };

  if (isLoading) {
    return (
      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardHeader><Skeleton className="h-4 w-[180px]" /></CardHeader>
        <CardContent className="space-y-2.5">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="dark:bg-gray-900 dark:border-gray-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
          <Layers className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          Compras Parceladas
        </CardTitle>
      </CardHeader>
      <CardContent>
        {comprasParceladas.length === 0 ? (
          <div className="text-center py-8">
            <Layers className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Nenhuma compra parcelada encontrada
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Compras parceladas aparecerão aqui
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {comprasParceladas.slice(0, 5).map((t) => {
              const porcentagem = totalParcelado > 0 ? (t.totalCompra / totalParcelado) * 100 : 0;

              return (
                <div
                  key={t.parcelamentoId || t.id}
                  className="flex items-center gap-2.5 p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
                >
                  <div className="p-1.5 rounded-full bg-orange-100 dark:bg-orange-900/30 flex-shrink-0 group-hover:scale-110 transition-transform">
                    <CreditCard className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                        {t.descricao || 'Compra parcelada'}
                      </span>
                      <span className="text-sm font-bold text-orange-600 dark:text-orange-400 ml-2 whitespace-nowrap">
                        {formatarMoeda(t.totalCompra)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-orange-500 to-orange-600 transition-all duration-300"
                          style={{ width: `${porcentagem}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">
                        {porcentagem.toFixed(1)}%
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                      {t.data && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatarData(t.data)}
                        </div>
                      )}
                      {t.parcelas && (
                        <div className="flex items-center gap-1 font-medium text-orange-600 dark:text-orange-400">
                          <Layers className="w-3 h-3" />
                          {t.parcelas}x de {formatarMoeda(Number(t.valor))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {comprasParceladas.length > 5 && (
              <div className="text-center pt-1">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  + {comprasParceladas.length - 5} compra{comprasParceladas.length - 5 !== 1 ? 's' : ''} parcelada{comprasParceladas.length - 5 !== 1 ? 's' : ''}
                </p>
              </div>
            )}

            <div className="pt-2 border-t border-gray-200 dark:border-gray-700 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total em compras parceladas:
                </span>
                <span className="text-base font-bold text-orange-600 dark:text-orange-400">
                  {formatarMoeda(totalParcelado)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500 dark:text-gray-400">Número de compras:</span>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {comprasParceladas.length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500 dark:text-gray-400">Total de parcelas:</span>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {parceladas.length}
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}