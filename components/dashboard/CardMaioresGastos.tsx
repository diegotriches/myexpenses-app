import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Transacao } from '@/types/transacao';
import { maioresGastos } from '@/utils/dashboard';
import { AlertTriangle, Calendar } from 'lucide-react';

type Props = { transacoes: Transacao[], mesAno: string };

export function CardMaioresGastos({ transacoes, mesAno }: Props) {
  const topGastos = maioresGastos(transacoes, mesAno, 5);
  const totalGastos = topGastos.reduce((acc, t) => acc + Number(t.valor), 0);

  const formatarData = (data: string | Date) => {
    const date = new Date(data);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          Top 5 Maiores Gastos do Mês
        </CardTitle>
      </CardHeader>
      <CardContent>
        {topGastos.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">Nenhum gasto encontrado</p>
        ) : (
          <div className="space-y-2.5">
            {topGastos.map((t, index) => {
              const porcentagem = totalGastos > 0 ? (Number(t.valor) / totalGastos) * 100 : 0;
              
              return (
                <div 
                  key={t.id}
                  className="flex items-center gap-2.5 p-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-red-100 text-red-700 text-xs font-bold flex-shrink-0">
                    {index + 1}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-800 truncate">
                        {t.descricao}
                      </span>
                      <span className="text-sm font-bold text-red-600 ml-2 whitespace-nowrap">
                        R$ {Number(t.valor).toFixed(2)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-red-500 transition-all duration-300"
                          style={{ width: `${porcentagem}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 font-medium whitespace-nowrap">
                        {porcentagem.toFixed(1)}%
                      </span>
                    </div>
                    
                    {t.data && (
                      <div className="flex items-center gap-1 mt-1">
                        <Calendar className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-500">
                          {formatarData(t.data)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            
            {/* Total */}
            <div className="pt-2 border-t border-gray-200 flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600">Total (Top 5):</span>
              <span className="text-base font-bold text-red-600">
                R$ {totalGastos.toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}