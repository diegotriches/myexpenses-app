import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Transacao } from '@/types/transacao';
import { filtrarPorTipo } from '@/utils/dashboard';
import { Calendar, CreditCard } from 'lucide-react';

type Props = { transacoes: Transacao[] };

export function CardParcelados({ transacoes }: Props) {
  const parcelados = filtrarPorTipo(transacoes, 'parcelado');
  const totalParcelado = parcelados.reduce((acc, t) => acc + Number(t.valor), 0);

  const formatarData = (data: string | Date) => {
    const date = new Date(data);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-orange-600" />
          Transações Parceladas
        </CardTitle>
      </CardHeader>
      <CardContent>
        {parcelados.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">Nenhuma transação parcelada encontrada</p>
        ) : (
          <div className="space-y-2.5">
            {parcelados.map((t) => {
              const porcentagem = totalParcelado > 0 ? (Number(t.valor) / totalParcelado) * 100 : 0;
              
              return (
                <div 
                  key={t.id}
                  className="flex items-center gap-2.5 p-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <div className="p-1.5 rounded-full bg-orange-100 flex-shrink-0">
                    <CreditCard className="w-4 h-4 text-orange-600" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-800 truncate">
                        {t.descricao}
                      </span>
                      <span className="text-sm font-bold text-orange-600 ml-2 whitespace-nowrap">
                        R$ {Number(t.valor).toFixed(2)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-orange-500 transition-all duration-300"
                          style={{ width: `${porcentagem}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 font-medium whitespace-nowrap">
                        {porcentagem.toFixed(1)}%
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      {t.data && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatarData(t.data)}
                        </div>
                      )}
                      {t.parcelas && (
                        <span className="font-medium">
                          {t.parcelas}x
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            
            {/* Total e Resumo */}
            <div className="pt-2 border-t border-gray-200 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">Total parcelado:</span>
                <span className="text-base font-bold text-orange-600">
                  R$ {totalParcelado.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Quantidade de transações:</span>
                <span className="text-sm font-semibold text-gray-700">
                  {parcelados.length}
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}