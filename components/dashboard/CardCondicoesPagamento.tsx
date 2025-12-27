import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { CondicaoPagamento } from '@/types/dashboard';
import { Banknote, Smartphone, CreditCard } from 'lucide-react';

type Props = { dados: Record<CondicaoPagamento, number> };

export function CardCondicoesPagamento({ dados }: Props) {
  // Filtra apenas condições válidas
  const condicoesValidas = Object.entries(dados).filter(([condicao]) => 
    ['dinheiro', 'pix', 'cartao'].includes(condicao)
  );
  
  const total = condicoesValidas.reduce((acc, [, val]) => acc + val, 0);
  
  const condicaoConfig: Record<CondicaoPagamento, {
    label: string;
    icon: any;
    color: string;
    bg: string;
    border: string;
    iconBg: string;
  }> = {
    dinheiro: {
      label: 'Dinheiro',
      icon: Banknote,
      color: 'text-green-600',
      bg: 'bg-green-50',
      border: 'border-green-200',
      iconBg: 'bg-green-100'
    },
    pix: {
      label: 'PIX',
      icon: Smartphone,
      color: 'text-teal-600',
      bg: 'bg-teal-50',
      border: 'border-teal-200',
      iconBg: 'bg-teal-100'
    },
    cartao: {
      label: 'Cartão',
      icon: CreditCard,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      iconBg: 'bg-purple-100'
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Condições de Pagamento</CardTitle>
      </CardHeader>
      <CardContent>
        {condicoesValidas.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">Nenhuma transação encontrada</p>
        ) : (
          <div className="space-y-2.5">
            {condicoesValidas.map(([condicao, valor]) => {
            const config = condicaoConfig[condicao as CondicaoPagamento];
            
            // Se não encontrar config, pula esta condição
            if (!config) return null;
            
            const Icon = config.icon;
            const porcentagem = total > 0 ? (valor / total) * 100 : 0;
            
            return (
              <div 
                key={condicao}
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