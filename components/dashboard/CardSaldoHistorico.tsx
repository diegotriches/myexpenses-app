"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Wallet, Loader2, AlertCircle, TrendingUp, TrendingDown } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useSaldoHistorico } from "@/hooks/useDashboard";
import { useHideValues } from "@/contexts/HideValuesContext";

const PERIODOS = [
  { label: "3m", value: "3" },
  { label: "6m", value: "6" },
  { label: "12m", value: "12" },
] as const;

function formatarMes(mes: string) {
  try {
    const [ano, mesNum] = mes.split("-");
    const meses = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
    return `${meses[parseInt(mesNum) - 1]}/${ano.slice(2)}`;
  } catch {
    return mes;
  }
}

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
}

function formatarMoedaCurta(valor: number) {
  if (Math.abs(valor) >= 1000) return `R$ ${(valor / 1000).toFixed(1)}k`;
  return formatarMoeda(valor);
}

function CustomTooltip({ active, payload, label, hidden }: any) {
  if (!active || !payload?.length) return null;
  const valor = payload[0]?.value ?? 0;
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg text-xs">
      <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</p>
      <p className={`font-bold text-sm ${valor >= 0 ? "text-blue-600 dark:text-blue-400" : "text-red-600 dark:text-red-400"}`}>
        {hidden ? "••••••" : formatarMoeda(valor)}
      </p>
    </div>
  );
}

export function CardSaldoHistorico() {
  const [periodo, setPeriodo] = useState<"3" | "6" | "12">("6");
  const { data: historico, isLoading: loadingHistorico, error } = useSaldoHistorico(periodo);
  const { hidden, mask } = useHideValues();

  const fmt  = (v: number) => mask(formatarMoeda(v));
  const fmtC = (v: number) => mask(formatarMoedaCurta(v));

  const variacao = historico && historico.length >= 2
    ? historico[historico.length - 1].saldoTotal - historico[0].saldoTotal
    : null;

  const dadosGrafico = historico?.map((item) => ({
    mes: formatarMes(item.mes),
    Saldo: item.saldoTotal,
  })) ?? [];

  const corGrafico = variacao !== null && variacao >= 0
    ? { stroke: "#2563eb", fill: "#2563eb" }
    : { stroke: "#dc2626", fill: "#dc2626" };

  const cardTitle = (
    <div className="flex items-center justify-between w-full">
      <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-900 dark:text-white">
        <Wallet className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <span className="hidden sm:inline">Evolução do Patrimônio</span>
        <span className="sm:hidden">Patrimônio</span>
      </CardTitle>
      <div className="flex items-center gap-1">
        {PERIODOS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => setPeriodo(p.value)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              periodo === p.value
                ? "bg-blue-600 text-white dark:bg-blue-500"
                : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );

  if (loadingHistorico) {
    return (
      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardHeader>{cardTitle}</CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardHeader>{cardTitle}</CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Erro ao carregar histórico de saldo</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="dark:bg-gray-900 dark:border-gray-800">
      <CardHeader>{cardTitle}</CardHeader>
      <CardContent className="space-y-4">

        {historico && historico.length > 0 && (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Saldo total atual</p>
              <p className={`text-xl font-bold ${
                historico[historico.length - 1].saldoTotal >= 0
                  ? "text-gray-900 dark:text-white"
                  : "text-red-600 dark:text-red-400"
              }`}>
                {fmt(historico[historico.length - 1].saldoTotal)}
              </p>
            </div>
            {variacao !== null && (
              <div className={`flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-md ${
                variacao >= 0
                  ? "text-green-700 bg-green-50 dark:text-green-400 dark:bg-green-950/30"
                  : "text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-950/30"
              }`}>
                {variacao >= 0
                  ? <TrendingUp className="h-3.5 w-3.5" />
                  : <TrendingDown className="h-3.5 w-3.5" />
                }
                <span className="hidden sm:inline">{mask(formatarMoeda(Math.abs(variacao)))}</span>
                <span className="sm:hidden">{mask(formatarMoedaCurta(Math.abs(variacao)))}</span>
              </div>
            )}
          </div>
        )}

        {dadosGrafico.length > 0 ? (
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={dadosGrafico} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradientSaldo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={corGrafico.fill} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={corGrafico.fill} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
              <XAxis
                dataKey="mes"
                tick={{ fontSize: 10 }}
                className="fill-gray-500 dark:fill-gray-400"
              />
              <YAxis
                tick={{ fontSize: 10 }}
                className="fill-gray-500 dark:fill-gray-400"
                tickFormatter={(v) => hidden ? "••••" : formatarMoedaCurta(v)}
                width={55}
              />
              <Tooltip content={<CustomTooltip hidden={hidden} />} />
              <Area
                type="monotone"
                dataKey="Saldo"
                stroke={corGrafico.stroke}
                strokeWidth={2}
                fill="url(#gradientSaldo)"
                dot={{ fill: corGrafico.stroke, strokeWidth: 0, r: 3 }}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-6">
            <Wallet className="w-10 h-10 text-gray-300 dark:text-gray-700 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum dado disponível</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Adicione transações para ver a evolução do seu patrimônio
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}