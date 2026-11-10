"use client";

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Banknote, Smartphone, CreditCard, Loader2, Wallet } from 'lucide-react';
import { useCondicoesPagamento } from '@/hooks/useDashboard';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import type { PropsTooltip } from "@/types/grafico";

const CORES = {
  dinheiro: '#22c55e',
  pix:      '#14b8a6',
  cartao:   '#a855f7',
};

const CustomTooltip = ({ active, payload }: PropsTooltip) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-gray-800 dark:text-gray-200">{payload[0].name}</p>
      <p className="text-gray-600 dark:text-gray-400">
        {payload[0].value} transações ({payload[0].payload.porcentagem.toFixed(0)}%)
      </p>
    </div>
  );
};

interface CardCondicoesPagamentoProps {
  ano: number;
}

export function CardCondicoesPagamento({ ano }: CardCondicoesPagamentoProps) {
  const { data: dados, isLoading, error } = useCondicoesPagamento(ano);

  if (isLoading) {
    return (
      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
            <Wallet className="w-5 h-5 text-purple-500" />
            Condições de Pagamento
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
            <Wallet className="w-5 h-5 text-purple-500" />
            Condições de Pagamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>Erro ao carregar dados: {error.message}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!dados) {
    return (
      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
            <Wallet className="w-5 h-5 text-purple-500" />
            Condições de Pagamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">Nenhum dado disponível</p>
        </CardContent>
      </Card>
    );
  }

  const total = dados.dinheiro + dados.pix + dados.cartao;

  const condicoes = [
    { key: 'dinheiro', label: 'Dinheiro', valor: dados.dinheiro, icon: Banknote,   cor: CORES.dinheiro },
    { key: 'pix',      label: 'PIX',      valor: dados.pix,      icon: Smartphone, cor: CORES.pix      },
    { key: 'cartao',   label: 'Cartão',   valor: dados.cartao,   icon: CreditCard, cor: CORES.cartao   },
  ];

  const chartData = condicoes
    .filter(c => c.valor > 0)
    .map(c => ({
      name:        c.label,
      value:       c.valor,
      porcentagem: total > 0 ? (c.valor / total) * 100 : 0,
      cor:         c.cor,
    }));

  return (
    <Card className="dark:bg-gray-900 dark:border-gray-800">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
          <Wallet className="w-5 h-5 text-purple-500" />
          Condições de Pagamento
        </CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <div className="text-center py-8">
            <Banknote className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Nenhuma transação encontrada</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Suas transações por forma de pagamento aparecerão aqui
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">

            {/* Donut — sempre centralizado */}
            <div className="relative w-[140px] h-[140px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={65}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={index} fill={entry.cor} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legenda — sempre largura total */}
            <div className="w-full space-y-2">
              {condicoes.map((condicao) => {
                const Icon = condicao.icon;
                const porcentagem = total > 0 ? (condicao.valor / total) * 100 : 0;
                return (
                  <div key={condicao.key} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: condicao.cor }} />
                    <Icon className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                    <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">{condicao.label}</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 w-9 text-right flex-shrink-0">{porcentagem.toFixed(0)}%</span>
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 w-5 text-right flex-shrink-0">{condicao.valor}</span>
                  </div>
                );
              })}
              <div className="pt-2 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                <span className="text-xs text-gray-500 dark:text-gray-400">Total</span>
                <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{total}</span>
              </div>
            </div>

          </div>
        )}
      </CardContent>
    </Card>
  );
}