import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Transacao } from '@/types/transacao';
import { maioresGastos } from '@/utils/dashboard';
import { AlertTriangle, Calendar, Tag } from 'lucide-react';
import { useMemo } from 'react';

type Props = { transacoes: Transacao[], mesAno: string };

export function CardMaioresGastos({ transacoes, mesAno }: Props) {
  // Filtra transações do período e pega os maiores gastos
  const topGastos = useMemo(() => {
    const transacoesPeriodo = transacoes.filter(t => 
      t.data.startsWith(mesAno) && t.tipo === 'saida'
    );
    return maioresGastos(transacoesPeriodo, 5);
  }, [transacoes, mesAno]);
  
  const totalGastos = useMemo(
    () => topGastos.reduce((acc, t) => acc + Number(t.valor), 0),
    [topGastos]
  );

  const formatarData = (data: string | Date) => {
    const date = new Date(data);
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
          Top 5 Maiores Gastos
        </CardTitle>
      </CardHeader>
      <CardContent>
        {topGastos.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
            Nenhum gasto encontrado neste período
          </p>
        ) : (
          <div className="space-y-2.5">
            {topGastos.map((t, index) => {
              const porcentagem = totalGastos > 0 ? (Number(t.valor) / totalGastos) * 100 : 0;
              
              return (
                <div 
                  key={t.id}
                  className="flex items-center gap-2.5 p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-bold flex-shrink-0">
                    {index + 1}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                        {t.descricao || 'Despesa sem descrição'}
                      </span>
                      <span className="text-sm font-bold text-red-600 dark:text-red-400 ml-2 whitespace-nowrap">
                        R$ {Number(t.valor).toFixed(2)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-1">
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
                    
                    <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                      {t.data && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatarData(t.data)}
                        </div>
                      )}
                      {t.categoria && (
                        <div className="flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          <span className="truncate">{t.categoria}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            
            {/* Total e Informações Adicionais */}
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total (Top 5):</span>
                <span className="text-base font-bold text-red-600 dark:text-red-400">
                  R$ {totalGastos.toFixed(2)}
                </span>
              </div>
              
              {/* Média dos maiores gastos */}
              {topGastos.length > 0 && (
                <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                  <span>Média dos maiores gastos:</span>
                  <span className="font-semibold">
                    R$ {(totalGastos / topGastos.length).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}