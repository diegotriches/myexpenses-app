import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Transacao } from '@/types/transacao';
import { categoriasReceita } from '@/utils/dashboard';
import { TrendingUp } from 'lucide-react';
import { useMemo } from 'react';

type Props = { transacoes: Transacao[] };

export function CardCategoriasReceita({ transacoes }: Props) {
  const categorias = useMemo(() => categoriasReceita(transacoes), [transacoes]);
  const totalReceitas = useMemo(
    () => categorias.reduce((acc, c) => acc + c.total, 0),
    [categorias]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-600" />
          Categorias com Maior Receita
        </CardTitle>
      </CardHeader>
      <CardContent>
        {categorias.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">Nenhuma receita encontrada</p>
        ) : (
          <div className="space-y-2.5">
            {categorias.slice(0, 5).map((c, index) => {
              const porcentagem = totalReceitas > 0 ? (c.total / totalReceitas) * 100 : 0;
              
              return (
                <div 
                  key={c.categoria}
                  className="flex items-center gap-2.5 p-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-green-100 text-green-700 text-xs font-bold flex-shrink-0">
                    {index + 1}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-800 truncate">
                        {c.categoria}
                      </span>
                      <span className="text-sm font-bold text-green-600 ml-2 whitespace-nowrap">
                        R$ {c.total.toFixed(2)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-green-500 transition-all duration-300"
                          style={{ width: `${porcentagem}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 font-medium whitespace-nowrap">
                        {porcentagem.toFixed(1)}%
                      </span>
                    </div>
                    
                    <p className="text-xs text-gray-500 mt-1">
                      {c.quantidade} lançamento(s)
                    </p>
                  </div>
                </div>
              );
            })}
            
            {/* Total */}
            <div className="pt-2 border-t border-gray-200 flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600">Total em receitas:</span>
              <span className="text-base font-bold text-green-600">
                R$ {totalReceitas.toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}