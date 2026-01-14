// src/components/dashboard/CardFaturas.tsx
"use client";

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { CreditCard, AlertCircle, Loader2 } from 'lucide-react';
import { useFaturasResumo } from '@/hooks/useDashboard';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function CardFaturas() {
  const { data: faturas, isLoading, error } = useFaturasResumo();

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  // Loading state
  if (isLoading) {
    return (
      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
            <CreditCard className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            Faturas de Cartões
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
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
            <CreditCard className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            Faturas de Cartões
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
  if (!faturas) {
    return (
      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
            <CreditCard className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            Faturas de Cartões
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

  const { totalFaturas, totalPago, totalAberto } = faturas;
  const semFaturas = totalFaturas === 0;

  return (
    <Card className="dark:bg-gray-900 dark:border-gray-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
          <CreditCard className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          Faturas de Cartões
        </CardTitle>
      </CardHeader>
      <CardContent>
        {semFaturas ? (
          <div className="text-center py-8">
            <CreditCard className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Nenhuma despesa com cartão neste período
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Faturas de cartão aparecerão aqui
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Resumo de Faturas */}
            <div className="space-y-2">
              {/* Total de Faturas */}
              <div className="flex items-center justify-between p-2.5 rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/30 hover:bg-purple-100 dark:hover:bg-purple-950/50 transition-colors">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-full bg-purple-100 dark:bg-purple-900/30">
                    <CreditCard className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    Total de Faturas
                  </span>
                </div>
                <span className="text-base font-bold text-purple-600 dark:text-purple-400">
                  {formatarMoeda(totalFaturas)}
                </span>
              </div>

              {/* Total Pago */}
              <div className="flex items-center justify-between p-2.5 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 hover:bg-green-100 dark:hover:bg-green-950/50 transition-colors">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-full bg-green-100 dark:bg-green-900/30">
                    <CreditCard className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    Pago
                  </span>
                </div>
                <span className="text-base font-bold text-green-600 dark:text-green-400">
                  {formatarMoeda(totalPago)}
                </span>
              </div>

              {/* Total em Aberto */}
              <div className="flex items-center justify-between p-2.5 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-full bg-red-100 dark:bg-red-900/30">
                    <CreditCard className="w-4 h-4 text-red-600 dark:text-red-400" />
                  </div>
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    Em Aberto
                  </span>
                </div>
                <span className="text-base font-bold text-red-600 dark:text-red-400">
                  {formatarMoeda(totalAberto)}
                </span>
              </div>
            </div>

            {/* Aviso */}
            <div className="flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 dark:text-amber-300">
                Despesas com cartão não impactam o saldo das contas até o pagamento da fatura.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}