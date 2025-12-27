import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Transacao } from '@/types/transacao';
import { ArrowUpCircle, ArrowDownCircle, Calendar } from 'lucide-react';

type Props = { transacoes: Transacao[] };

export function CardTransacoesRecentes({ transacoes }: Props) {
  const formatarData = (data: string | Date) => {
    const date = new Date(data);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Últimas Transações</CardTitle>
      </CardHeader>
      <CardContent>
        {transacoes.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">Nenhuma transação encontrada</p>
        ) : (
          <ul className="space-y-2">
            {transacoes.map(t => (
              <li 
                key={t.id} 
                className="flex items-center justify-between p-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {t.tipo === 'entrada' ? (
                    <ArrowUpCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  ) : (
                    <ArrowDownCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  )}
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-sm font-medium text-gray-800 truncate">
                      {t.descricao}
                    </span>
                    {t.data && (
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatarData(t.data)}
                      </span>
                    )}
                  </div>
                </div>
                <span 
                  className={`text-sm font-bold whitespace-nowrap ml-2 ${
                    t.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {t.tipo === 'entrada' ? '+' : '-'} R$ {(Number(t.valor)).toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}