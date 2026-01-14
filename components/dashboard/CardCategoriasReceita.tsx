"use client";

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Transacao } from '@/types/transacao';
import { categoriasReceita } from '@/utils/dashboardUtils';
import { TrendingUp } from 'lucide-react';
import { useMemo } from 'react';

type Props = { 
  transacoes: Transacao[] 
};

export function CardCategoriasReceita({ transacoes }: Props) {
  const categorias = useMemo(() => {
    return categoriasReceita(transacoes);
  }, [transacoes]);

  const totalReceitas = useMemo(() => {
    return categorias.reduce((acc, c) => acc + c.total, 0);
  }, [categorias]);

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  return (
    <Card className="dark:bg-gray-900 dark:border-gray-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
          <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
          Categorias com Maior Receita
        </CardTitle>
      </CardHeader>
      <CardContent>
        {categorias.length === 0 ? (
          <div className="text-center py-8">
            <TrendingUp className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Nenhuma receita encontrada
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              As receitas aparecerão aqui quando você registrá-las
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {categorias.slice(0, 5).map((c, index) => {
              const porcentagem = totalReceitas > 0 ? (c.total / totalReceitas) * 100 : 0;
              
              return (
                <div 
                  key={c.categoria}
                  className="flex items-center gap-2.5 p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
                >
                  {/* Ranking Badge */}
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold flex-shrink-0 group-hover:scale-110 transition-transform">
                    {index + 1}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    {/* Categoria e Valor */}
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                        {c.categoria}
                      </span>
                      <span className="text-sm font-bold text-green-600 dark:text-green-400 ml-2 whitespace-nowrap">
                        {formatarMoeda(c.total)}
                      </span>
                    </div>
                    
                    {/* Barra de Progresso */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-300"
                          style={{ width: `${porcentagem}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">
                        {porcentagem.toFixed(1)}%
                      </span>
                    </div>
                    
                    {/* Quantidade */}
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {c.quantidade} lançamento{c.quantidade !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              );
            })}
            
            {/* Indicador de mais categorias */}
            {categorias.length > 5 && (
              <div className="text-center pt-1">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  + {categorias.length - 5} categoria{categorias.length - 5 !== 1 ? 's' : ''} com receitas
                </p>
              </div>
            )}
            
            {/* Total */}
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total em receitas:
              </span>
              <span className="text-base font-bold text-green-600 dark:text-green-400">
                {formatarMoeda(totalReceitas)}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}