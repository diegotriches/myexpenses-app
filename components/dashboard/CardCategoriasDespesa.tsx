import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Transacao } from '@/types/transacao';
import { categoriasMais } from '@/utils/dashboard';
import { TrendingDown } from 'lucide-react';

type Props = { transacoes: Transacao[] };

export function CardCategoriasDespesa({ transacoes }: Props) {
  const categorias = categoriasMais(transacoes, 'despesa');
  const totalDespesas = categorias.reduce((acc, c) => acc + Number(c.total), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingDown className="w-5 h-5 text-red-600" />
          Categorias com Maior Despesa
        </CardTitle>
      </CardHeader>
      <CardContent>
        {categorias.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">Nenhuma despesa encontrada</p>
        ) : (
          <div className="space-y-2.5">
            {categorias.map((c, index) => {
              const porcentagem = totalDespesas > 0 ? (Number(c.total) / totalDespesas) * 100 : 0;
              
              return (
                <div 
                  key={c.categoria}
                  className="flex items-center gap-2.5 p-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-red-100 text-red-700 text-xs font-bold flex-shrink-0">
                    {index + 1}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-800 truncate">
                        {c.categoria}
                      </span>
                      <span className="text-sm font-bold text-red-600 ml-2 whitespace-nowrap">
                        R$ {Number(c.total).toFixed(2)}
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
                  </div>
                </div>
              );
            })}
            
            {/* Total */}
            <div className="pt-2 border-t border-gray-200 flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600">Total em despesas:</span>
              <span className="text-base font-bold text-red-600">
                R$ {totalDespesas.toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}