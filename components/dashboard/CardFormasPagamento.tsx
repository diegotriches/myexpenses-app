// src/components/dashboard/CardFormasPagamento.tsx
"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DollarSign, Layers, Repeat, Loader2, LayoutList } from "lucide-react";
import { useFormasPagamento } from "@/hooks/useDashboard";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const CORES = {
  aVista: "#3b82f6",
  parcelado: "#f97316",
  recorrente: "#a855f7",
};

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-gray-800 dark:text-gray-200">
        {payload[0].name}
      </p>
      <p className="text-gray-600 dark:text-gray-400">
        {payload[0].value} transações (
        {payload[0].payload.porcentagem.toFixed(0)}%)
      </p>
    </div>
  );
};

interface CardFormasPagamentoProps {
  periodoMeses: 3 | 6 | 12;
}

export function CardFormasPagamento({
  periodoMeses,
}: CardFormasPagamentoProps) {
  const { data: dados, isLoading, error } = useFormasPagamento(periodoMeses);

  if (isLoading) {
    return (
      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
            <LayoutList className="w-5 h-5 text-blue-500" />
            Tipos de Pagamento
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
            <LayoutList className="w-5 h-5 text-blue-500" />
            Tipos de Pagamento
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

  if (!dados) {
    return (
      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
            <LayoutList className="w-5 h-5 text-blue-500" />
            Tipos de Pagamento
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

  const total = dados.aVista + dados.parcelado + dados.recorrente;

  const formas = [
    {
      key: "aVista",
      label: "À Vista",
      valor: dados.aVista,
      icon: DollarSign,
      cor: CORES.aVista,
    },
    {
      key: "parcelado",
      label: "Parcelado",
      valor: dados.parcelado,
      icon: Layers,
      cor: CORES.parcelado,
    },
    {
      key: "recorrente",
      label: "Recorrente",
      valor: dados.recorrente,
      icon: Repeat,
      cor: CORES.recorrente,
    },
  ];

  const chartData = formas
    .filter((f) => f.valor > 0)
    .map((f) => ({
      name: f.label,
      value: f.valor,
      porcentagem: total > 0 ? (f.valor / total) * 100 : 0,
      cor: f.cor,
    }));

  return (
    <Card className="dark:bg-gray-900 dark:border-gray-800">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
          <LayoutList className="w-5 h-5 text-blue-500" />
          Tipos de Pagamento
        </CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <div className="text-center py-8">
            <DollarSign className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Nenhuma transação encontrada
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Suas transações por tipo aparecerão aqui
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
                    paddingAngle={0}
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
              {formas.map((forma) => {
                const Icon = forma.icon;
                const porcentagem = total > 0 ? (forma.valor / total) * 100 : 0;
                return (
                  <div key={forma.key} className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: forma.cor }}
                    />
                    <Icon className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                    <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                      {forma.label}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 w-9 text-right flex-shrink-0">
                      {porcentagem.toFixed(0)}%
                    </span>
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 w-5 text-right flex-shrink-0">
                      {forma.valor}
                    </span>
                  </div>
                );
              })}
              <div className="pt-2 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Total
                </span>
                <span className="text-sm font-bold text-gray-800 dark:text-gray-200">
                  {total}
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
