import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Banknote, Smartphone, CreditCard } from 'lucide-react';

interface CondicoesPagamento {
  dinheiro: number;
  pix: number;
  cartao: number;
}

type Props = { dados: CondicoesPagamento };

export function CardCondicoesPagamento({ dados }: Props) {
  const total = dados.dinheiro + dados.pix + dados.cartao;
  
  const condicoes = [
    {
      key: 'dinheiro',
      label: 'Dinheiro',
      valor: dados.dinheiro,
      icon: Banknote,
      color: 'text-green-600',
      bg: 'bg-green-50',
      border: 'border-green-200',
      iconBg: 'bg-green-100',
      barColor: 'bg-green-500'
    },
    {
      key: 'pix',
      label: 'PIX',
      valor: dados.pix,
      icon: Smartphone,
      color: 'text-teal-600',
      bg: 'bg-teal-50',
      border: 'border-teal-200',
      iconBg: 'bg-teal-100',
      barColor: 'bg-teal-500'
    },
    {
      key: 'cartao',
      label: 'Cartão',
      valor: dados.cartao,
      icon: CreditCard,
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
        <CardTitle>Formas de Pagamento</CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            Nenhuma transação encontrada
          </p>
        ) : (
          <div className="space-y-2.5">
            {condicoes.map((condicao) => {
              const Icon = condicao.icon;
              const porcentagem = total > 0 ? (condicao.valor / total) * 100 : 0;
              
              return (
                <div 
                  key={condicao.key}
                  className={`flex items-center justify-between p-2.5 rounded-lg border ${condicao.bg} ${condicao.border}`}
                >
                  <div className="flex items-center gap-2.5 flex-1">
                    <div className={`p-1.5 rounded-full ${condicao.iconBg}`}>
                      <Icon className={`w-4 h-4 ${condicao.color}`} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">
                        {condicao.label}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${condicao.barColor} transition-all duration-300`}
                            style={{ width: `${porcentagem}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 font-medium whitespace-nowrap">
                          {porcentagem.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className={`text-base font-bold ${condicao.color} ml-2`}>
                    {condicao.valor}
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