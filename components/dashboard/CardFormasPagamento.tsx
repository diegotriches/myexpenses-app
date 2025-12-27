import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { DollarSign, Layers, Repeat } from 'lucide-react';

interface FormasPagamento {
  aVista: number;
  parcelado: number;
  recorrente: number;
}

type Props = { dados: FormasPagamento };

export function CardFormasPagamento({ dados }: Props) {
  const total = dados.aVista + dados.parcelado + dados.recorrente;
  
  const formas = [
    {
      key: 'aVista',
      label: 'À Vista',
      valor: dados.aVista,
      icon: DollarSign,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      iconBg: 'bg-blue-100',
      barColor: 'bg-blue-500'
    },
    {
      key: 'parcelado',
      label: 'Parcelado',
      valor: dados.parcelado,
      icon: Layers,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      iconBg: 'bg-orange-100',
      barColor: 'bg-orange-500'
    },
    {
      key: 'recorrente',
      label: 'Recorrente',
      valor: dados.recorrente,
      icon: Repeat,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      iconBg: 'bg-purple-100',
      barColor: 'bg-purple-500'
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tipos de Pagamento</CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            Nenhuma transação encontrada
          </p>
        ) : (
          <div className="space-y-2.5">
            {formas.map((forma) => {
              const Icon = forma.icon;
              const porcentagem = total > 0 ? (forma.valor / total) * 100 : 0;
              
              return (
                <div 
                  key={forma.key}
                  className={`flex items-center justify-between p-2.5 rounded-lg border ${forma.bg} ${forma.border}`}
                >
                  <div className="flex items-center gap-2.5 flex-1">
                    <div className={`p-1.5 rounded-full ${forma.iconBg}`}>
                      <Icon className={`w-4 h-4 ${forma.color}`} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">
                        {forma.label}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${forma.barColor} transition-all duration-300`}
                            style={{ width: `${porcentagem}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 font-medium whitespace-nowrap">
                          {porcentagem.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className={`text-base font-bold ${forma.color} ml-2`}>
                    {forma.valor}
                  </span>
                </div>
              );
            })}
            
            {/* Total */}
            <div className="pt-2 border-t border-gray-200 flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600">
                Total de transações:
              </span>
              <span className="text-base font-bold text-gray-800">{total}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}