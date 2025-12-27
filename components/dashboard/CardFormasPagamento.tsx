import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { FormaPagamento } from '@/types/dashboard';
import { DollarSign, Calendar, Repeat } from 'lucide-react';

type Props = { dados: Record<FormaPagamento, number> };

export function CardFormasPagamento({ dados }: Props) {
  // Filtra apenas formas válidas
  const formasValidas = Object.entries(dados).filter(([forma]) => 
    ['aVista', 'parcelado', 'recorrente'].includes(forma)
  );
  
  const total = formasValidas.reduce((acc, [, val]) => acc + val, 0);
  
  const formaConfig: Record<FormaPagamento, {
    label: string;
    icon: any;
    color: string;
    bg: string;
    border: string;
    iconBg: string;
  }> = {
    aVista: {
      label: 'À Vista',
      icon: DollarSign,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      iconBg: 'bg-blue-100'
    },
    parcelado: {
      label: 'Parcelado',
      icon: Calendar,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      iconBg: 'bg-orange-100'
    },
    recorrente: {
      label: 'Recorrente',
      icon: Repeat,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      iconBg: 'bg-purple-100'
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Formas de Pagamento</CardTitle>
      </CardHeader>
      <CardContent>
        {formasValidas.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">Nenhuma transação encontrada</p>
        ) : (
          <div className="space-y-2.5">
            {formasValidas.map(([forma, valor]) => {
              const config = formaConfig[forma as FormaPagamento];
              const Icon = config.icon;
              const porcentagem = total > 0 ? (valor / total) * 100 : 0;
              
              return (
                <div 
                  key={forma}
                  className={`flex items-center justify-between p-2.5 rounded-lg border ${config.bg} ${config.border}`}
                >
                  <div className="flex items-center gap-2.5 flex-1">
                    <div className={`p-1.5 rounded-full ${config.iconBg}`}>
                      <Icon className={`w-4 h-4 ${config.color}`} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">{config.label}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${config.color.replace('text', 'bg')} transition-all duration-300`}
                            style={{ width: `${porcentagem}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 font-medium whitespace-nowrap">
                          {porcentagem.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className={`text-base font-bold ${config.color} ml-2`}>
                    {valor}
                  </span>
                </div>
              );
            })}
            
            {/* Total */}
            <div className="pt-2 border-t border-gray-200 flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600">Total de transações:</span>
              <span className="text-base font-bold text-gray-800">{total}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}