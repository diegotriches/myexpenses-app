import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Transacao } from '@/types/transacao';
import { filtrarParceladas } from '@/utils/dashboard';
import { Calendar, CreditCard, Layers } from 'lucide-react';
import { useMemo } from 'react';

type Props = { transacoes: Transacao[] };

export function CardParcelados({ transacoes }: Props) {
  const parceladas = useMemo(() => filtrarParceladas(transacoes), [transacoes]);
  
  // Agrupa por parcelamentoId para mostrar cada compra parcelada uma vez
  const comprasParceladas = useMemo(() => {
    const mapa = new Map<string, Transacao & { totalCompra: number }>();
    
    parceladas.forEach(t => {
      if (t.parcelamentoId) {
        if (!mapa.has(t.parcelamentoId)) {
          const valorParcela = Number(t.valor);
          const totalCompra = t.parcelas ? valorParcela * t.parcelas : valorParcela;
          
          mapa.set(t.parcelamentoId, {
            ...t,
            totalCompra
          });
        }
      } else {
        const valorParcela = Number(t.valor);
        const totalCompra = t.parcelas ? valorParcela * t.parcelas : valorParcela;
        
        mapa.set(t.id, {
          ...t,
          totalCompra
        });
      }
    });
    
    return Array.from(mapa.values());
  }, [parceladas]);

  const totalParcelado = useMemo(
    () => comprasParceladas.reduce((acc, t) => acc + t.totalCompra, 0),
    [comprasParceladas]
  );

  const formatarData = (data: string | Date) => {
    const date = new Date(data);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          Compras Parceladas
        </CardTitle>
      </CardHeader>
      <CardContent>
        {comprasParceladas.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
            Nenhuma compra parcelada encontrada
          </p>
        ) : (
          <div className="space-y-2.5">
            {comprasParceladas.slice(0, 5).map((t) => {
              const porcentagem = totalParcelado > 0 
                ? (t.totalCompra / totalParcelado) * 100 
                : 0;
              
              return (
                <div 
                  key={t.parcelamentoId || t.id}
                  className="flex items-center gap-2.5 p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className="p-1.5 rounded-full bg-orange-100 dark:bg-orange-900/30 flex-shrink-0">
                    <CreditCard className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                        {t.descricao || 'Compra parcelada'}
                      </span>
                      <span className="text-sm font-bold text-orange-600 dark:text-orange-400 ml-2 whitespace-nowrap">
                        R$ {t.totalCompra.toFixed(2)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-orange-500 transition-all duration-300"
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
                          {t.parcelas}x de R$ {Number(t.valor).toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            
            {/* Total e Resumo */}
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total em compras parceladas:</span>
                <span className="text-base font-bold text-orange-600 dark:text-orange-400">
                  R$ {totalParcelado.toFixed(2)}
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