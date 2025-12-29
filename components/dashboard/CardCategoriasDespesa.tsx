import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Transacao } from '@/types/transacao';
import { categoriasDespesa } from '@/utils/dashboard';
import { TrendingDown } from 'lucide-react';
import { useMemo } from 'react';

type Props = { transacoes: Transacao[] };

export function CardCategoriasDespesa({ transacoes }: Props) {
  const categorias = useMemo(() => categoriasDespesa(transacoes), [transacoes]);
  const totalDespesas = useMemo(
    () => categorias.reduce((acc, c) => acc + c.total, 0),
    [categorias]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
          Categorias com Maior Despesa
        </CardTitle>
      </CardHeader>
      <CardContent>
        {categorias.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">Nenhuma despesa encontrada</p>
        ) : (
          <div className="space-y-2.5">
            {categorias.slice(0, 5).map((c, index) => {
              const porcentagem = totalDespesas > 0 ? (c.total / totalDespesas) * 100 : 0;
              
              return (
                <div 
                  key={c.categoria}
                  className="flex items-center gap-2.5 p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-bold flex-shrink-0">
                    {index + 1}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                        {c.categoria}
                      </span>
                      <span className="text-sm font-bold text-red-600 dark:text-red-400 ml-2 whitespace-nowrap">
                        R$ {c.total.toFixed(2)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-red-500 transition-all duration-300"
                          style={{ width: `${porcentagem}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">
                        {porcentagem.toFixed(1)}%
                      </span>
                    </div>
                    
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {c.quantidade} lançamento(s)
                    </p>
                  </div>
                </div>
              );
            })}
            
            {/* Total */}
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total em despesas:</span>
              <span className="text-base font-bold text-red-600 dark:text-red-400">
                R$ {totalDespesas.toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}