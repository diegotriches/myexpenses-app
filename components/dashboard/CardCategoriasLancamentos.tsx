import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Transacao } from '@/types/transacao';
import { agruparPorCategoria } from '@/utils/dashboard';
import { BarChart3 } from 'lucide-react';
import { useMemo } from 'react';

type Props = { transacoes: Transacao[] };

export function CardCategoriasLancamentos({ transacoes }: Props) {
  const categorias = useMemo(() => agruparPorCategoria(transacoes), [transacoes]);
  
  const totalLancamentos = useMemo(
    () => categorias.reduce((acc, c) => acc + c.quantidade, 0),
    [categorias]
  );
  
  const totalValor = useMemo(
    () => categorias.reduce((acc, c) => acc + c.total, 0),
    [categorias]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          Categorias com Mais Lançamentos
        </CardTitle>
      </CardHeader>
      <CardContent>
        {categorias.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">Nenhum lançamento encontrado</p>
        ) : (
          <div className="space-y-2.5">
            {categorias.slice(0, 5).map((c, index) => {
              const porcentagemQuantidade = totalLancamentos > 0 
                ? (c.quantidade / totalLancamentos) * 100 
                : 0;
              
              return (
                <div 
                  key={c.categoria}
                  className="flex items-center gap-2.5 p-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex-shrink-0">
                    {index + 1}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-800 truncate">
                        {c.categoria}
                      </span>
                      <div className="flex items-center gap-2 ml-2">
                        <span className="text-sm font-bold text-blue-600 whitespace-nowrap">
                          {c.quantidade} {c.quantidade === 1 ? 'lançamento' : 'lançamentos'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 transition-all duration-300"
                          style={{ width: `${porcentagemQuantidade}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 font-medium whitespace-nowrap">
                        {porcentagemQuantidade.toFixed(1)}%
                      </span>
                    </div>
                    
                    <p className="text-xs text-gray-500 mt-1">
                      Total: R$ {c.total.toFixed(2)}
                    </p>
                  </div>
                </div>
              );
            })}
            
            {/* Resumo */}
            <div className="pt-2 border-t border-gray-200 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">Total de lançamentos:</span>
                <span className="text-base font-bold text-blue-600">
                  {totalLancamentos}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Valor total:</span>
                <span className="text-sm font-semibold text-gray-700">
                  R$ {totalValor.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}