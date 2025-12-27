import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Transacao } from '@/types/transacao';
import { filtrarPorTipo } from '@/utils/dashboard';
import { Repeat, ArrowUpCircle, ArrowDownCircle, Calendar } from 'lucide-react';

type Props = { transacoes: Transacao[] };

export function CardRecorrentes({ transacoes }: Props) {
  const recorrentes = filtrarPorTipo(transacoes, 'recorrente');
  const totalRecorrente = recorrentes.reduce((acc, t) => acc + Number(t.valor), 0);
  
  // Separa receitas e despesas recorrentes
  const receitas = recorrentes.filter(t => t.tipo === 'entrada');
  const despesas = recorrentes.filter(t => t.tipo === 'saida');
  const totalReceitas = receitas.reduce((acc, t) => acc + Number(t.valor), 0);
  const totalDespesas = despesas.reduce((acc, t) => acc + Number(t.valor), 0);

  const formatarData = (data: string | Date) => {
    const date = new Date(data);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Repeat className="w-5 h-5 text-purple-600" />
          Transações Recorrentes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {recorrentes.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">Nenhuma transação recorrente encontrada</p>
        ) : (
          <div className="space-y-2.5">
            {recorrentes.map((t) => {
              const porcentagem = totalRecorrente > 0 ? (Math.abs(Number(t.valor)) / totalRecorrente) * 100 : 0;
              const isReceita = t.tipo === 'entrada';
              
              return (
                <div 
                  key={t.id}
                  className="flex items-center gap-2.5 p-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <div className={`p-1.5 rounded-full flex-shrink-0 ${
                    isReceita ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    {isReceita ? (
                      <ArrowUpCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <ArrowDownCircle className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-800 truncate">
                        {t.descricao}
                      </span>
                      <span className={`text-sm font-bold ml-2 whitespace-nowrap ${
                        isReceita ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {isReceita ? '+' : '-'} R$ {Number(t.valor).toFixed(2)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-300 ${
                            isReceita ? 'bg-green-500' : 'bg-red-500'
                          }`}
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
            
            {/* Total e Resumo */}
            <div className="pt-2 border-t border-gray-200 space-y-1.5">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Receitas recorrentes:</span>
                <span className="font-semibold text-green-600">R$ {totalReceitas.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Despesas recorrentes:</span>
                <span className="font-semibold text-red-600">R$ {totalDespesas.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-gray-100">
                <span className="text-sm font-medium text-gray-600">Impacto mensal:</span>
                <span className={`text-base font-bold ${
                  (totalReceitas - totalDespesas) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  R$ {(totalReceitas - totalDespesas).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}