import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Transacao } from '@/types/transacao';
import { ArrowUpCircle, ArrowDownCircle, Calendar } from 'lucide-react';

type Props = { transacoes: Transacao[] };

export function CardTransacoesRecentes({ transacoes }: Props) {
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
        <CardTitle>Últimas Transações</CardTitle>
      </CardHeader>
      <CardContent>
        {transacoes.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            Nenhuma transação encontrada
          </p>
        ) : (
          <ul className="space-y-2">
            {transacoes.map(t => {
              const isReceita = t.tipo === 'entrada';
              
              return (
                <li 
                  key={t.id} 
                  className="flex items-center justify-between p-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className={`p-1.5 rounded-full flex-shrink-0 ${
                      isReceita ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {isReceita ? (
                        <ArrowUpCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <ArrowDownCircle className="w-4 h-4 text-red-600" />
                      )}
                    </div>
                    
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-sm font-medium text-gray-800 truncate">
                        {t.descricao || (isReceita ? 'Receita' : 'Despesa')}
                      </span>
                      
                      <div className="flex items-center gap-2 text-xs text-gray-500">
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
                      </div>
                    </div>
                  </div>
                  
                  <span 
                    className={`text-sm font-bold whitespace-nowrap ml-2 ${
                      isReceita ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {isReceita ? '+' : '-'} R$ {Number(t.valor).toFixed(2)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}