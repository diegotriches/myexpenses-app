// src/components/dashboard/CardCondicoesPagamento.tsx
"use client";

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Banknote, Smartphone, CreditCard, Loader2 } from 'lucide-react';
import { useCondicoesPagamento } from '@/hooks/useDashboard';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function CardCondicoesPagamento() {
  const { data: dados, isLoading, error } = useCondicoesPagamento();

  // Loading state
  if (isLoading) {
    return (
      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">
            Condições de Pagamento
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">
            Condições de Pagamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>
              Erro ao carregar dados: {error.message}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (!dados) {
    return (
      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">
            Condições de Pagamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
            Nenhum dado disponível
          </p>
        </CardContent>
      </Card>
    );
  }

  const total = dados.dinheiro + dados.pix + dados.cartao;
  
  const condicoes = [
    {
      key: 'dinheiro',
      label: 'Dinheiro',
      valor: dados.dinheiro,
      icon: Banknote,
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-50 dark:bg-green-950/30',
      border: 'border-green-200 dark:border-green-800',
      iconBg: 'bg-green-100 dark:bg-green-900/50',
      barColor: 'bg-green-500'
    },
    {
      key: 'pix',
      label: 'PIX',
      valor: dados.pix,
      icon: Smartphone,
      color: 'text-teal-600 dark:text-teal-400',
      bg: 'bg-teal-50 dark:bg-teal-950/30',
      border: 'border-teal-200 dark:border-teal-800',
      iconBg: 'bg-teal-100 dark:bg-teal-900/50',
      barColor: 'bg-teal-500'
    },
    {
      key: 'cartao',
      label: 'Cartão',
      valor: dados.cartao,
      icon: CreditCard,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-950/30',
      border: 'border-purple-200 dark:border-purple-800',
      iconBg: 'bg-purple-100 dark:bg-purple-900/50',
      barColor: 'bg-purple-500'
    }
  ];

  return (
    <Card className="dark:bg-gray-900 dark:border-gray-800">
      <CardHeader>
        <CardTitle className="text-gray-900 dark:text-white">
          Condições de Pagamento
        </CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <div className="text-center py-8">
            <Banknote className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Nenhuma transação encontrada
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Suas transações por forma de pagamento aparecerão aqui
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {condicoes.map((condicao) => {
              const Icon = condicao.icon;
              const porcentagem = total > 0 ? (condicao.valor / total) * 100 : 0;
              
              return (
                <div 
                  key={condicao.key}
                  className={`flex items-center justify-between p-2.5 rounded-lg border ${condicao.bg} ${condicao.border} hover:opacity-90 transition-opacity`}
                >
                  <div className="flex items-center gap-2.5 flex-1">
                    <div className={`p-1.5 rounded-full ${condicao.iconBg}`}>
                      <Icon className={`w-4 h-4 ${condicao.color}`} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                        {condicao.label}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${condicao.barColor} transition-all duration-300`}
                            style={{ width: `${porcentagem}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">
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
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total de transações:
              </span>
              <span className="text-base font-bold text-gray-800 dark:text-gray-200">{total}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}