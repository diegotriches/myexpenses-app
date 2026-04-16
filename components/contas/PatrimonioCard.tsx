"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Wallet, Loader2 } from "lucide-react";
import { useHideValues } from "@/contexts/HideValuesContext";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface ContaBreakdown {
  id: string;
  nome: string;
  banco: string | null;
  saldo: number;
}

interface PontoHistorico {
  mes: string;
  total: number;
  contas: ContaBreakdown[];
}

interface PatrimonioData {
  saldoTotal: number;
  historico: PontoHistorico[];
}

// ─── Cores para as linhas do gráfico ──────────────────────────────────────────

const CORES = [
  "#3b82f6", // blue-500
  "#8b5cf6", // violet-500
  "#10b981", // emerald-500
  "#f59e0b", // amber-500
  "#ef4444", // red-500
  "#06b6d4", // cyan-500
  "#ec4899", // pink-500
  "#84cc16", // lime-500
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatarMoeda = (valor: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);

const formatarMoedaCompacta = (valor: number) => {
  const abs = Math.abs(valor);
  const sinal = valor < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sinal}R$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sinal}R$${(abs / 1_000).toFixed(1)}k`;
  return formatarMoeda(valor);
};

const OPCOES_PERIODO = [
  { label: "3M", meses: 3 },
  { label: "6M", meses: 6 },
  { label: "12M", meses: 12 },
  { label: "24M", meses: 24 },
];

// ─── Tooltip customizado ──────────────────────────────────────────────────────

function TooltipCustomizado({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 text-sm min-w-[180px]">
      <p className="font-semibold text-gray-700 dark:text-gray-200 mb-2 capitalize">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center justify-between gap-4 mb-1">
          <div className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-600 dark:text-gray-400 truncate max-w-[100px]">
              {entry.name}
            </span>
          </div>
          <span
            className="font-medium tabular-nums"
            style={{ color: entry.color }}
          >
            {formatarMoedaCompacta(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function PatrimonioCard() {
  const [meses, setMeses] = useState(6);
  const { mask } = useHideValues();

  const { data, isLoading, isError } = useQuery<PatrimonioData>({
    queryKey: ["patrimonio", meses],
    queryFn: async () => {
      const res = await fetch(`/api/contas/patrimonio?meses=${meses}`);
      if (!res.ok) throw new Error("Erro ao carregar patrimônio");
      return res.json();
    },
    staleTime: 1000 * 60 * 5, // 5 min
  });

  // Variação: diferença entre o primeiro e o último ponto do histórico
  const variacao = (() => {
    if (!data?.historico || data.historico.length < 2) return null;
    const primeiro = data.historico[0].total;
    const ultimo = data.historico[data.historico.length - 1].total;
    if (primeiro === 0) return null;
    const diff = ultimo - primeiro;
    const pct = (diff / Math.abs(primeiro)) * 100;
    return { diff, pct };
  })();

  // Extrair IDs únicos de contas que aparecem no histórico
  const contasNoHistorico = (() => {
    if (!data?.historico) return [];
    const mapa = new Map<string, string>(); // id → nome
    for (const ponto of data.historico) {
      for (const c of ponto.contas) {
        if (!mapa.has(c.id)) mapa.set(c.id, c.nome);
      }
    }
    return Array.from(mapa.entries()).map(([id, nome]) => ({ id, nome }));
  })();

  // Transformar histórico para o formato do Recharts
  // Cada ponto = { mes, total, [contaId]: saldo, ... }
  const dadosGrafico = data?.historico.map((ponto) => {
    const obj: Record<string, any> = { mes: ponto.mes, Total: ponto.total };
    for (const c of ponto.contas) {
      obj[c.id] = c.saldo;
    }
    return obj;
  }) ?? [];

  const mostrarBreakdown = contasNoHistorico.length > 1;

  return (
    <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          {/* Saldo total */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center flex-shrink-0">
              <Wallet size={20} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-0.5">
                Patrimônio Total
              </p>
              {isLoading ? (
                <div className="h-8 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              ) : isError ? (
                <p className="text-red-500 text-sm">Erro ao carregar</p>
              ) : (
                <div className="flex items-center gap-3 flex-wrap">
                  <span
                    className={`text-2xl font-bold ${
                      (data?.saldoTotal ?? 0) >= 0
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {mask(formatarMoeda(data?.saldoTotal ?? 0))}
                  </span>
                  {variacao && (
                    <div
                      className={`flex items-center gap-1 text-sm font-medium px-2 py-0.5 rounded-full ${
                        variacao.diff >= 0
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      }`}
                    >
                      {variacao.diff >= 0 ? (
                        <TrendingUp size={14} />
                      ) : (
                        <TrendingDown size={14} />
                      )}
                      <span>
                        {variacao.diff >= 0 ? "+" : ""}
                        {variacao.pct.toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Seletor de período */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-900 rounded-lg p-1 self-start">
            {OPCOES_PERIODO.map((op) => (
              <Button
                key={op.meses}
                variant="ghost"
                size="sm"
                onClick={() => setMeses(op.meses)}
                className={`h-7 px-3 text-xs font-medium rounded-md transition-all ${
                  meses === op.meses
                    ? "bg-white dark:bg-gray-700 text-blue-700 dark:text-blue-400 shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                }`}
              >
                {op.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="h-52 flex items-center justify-center">
            <Loader2 size={28} className="animate-spin text-gray-400" />
          </div>
        ) : isError ? (
          <div className="h-52 flex items-center justify-center">
            <p className="text-sm text-red-500">Não foi possível carregar o gráfico.</p>
          </div>
        ) : dadosGrafico.length < 2 ? (
          <div className="h-52 flex items-center justify-center">
            <p className="text-sm text-gray-400">Dados insuficientes para exibir o gráfico.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={210}>
            <LineChart data={dadosGrafico} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="currentColor"
                className="text-gray-100 dark:text-gray-700"
              />
              <XAxis
                dataKey="mes"
                tick={{ fontSize: 11, fill: "currentColor" }}
                className="text-gray-500 dark:text-gray-400"
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tickFormatter={formatarMoedaCompacta}
                tick={{ fontSize: 11, fill: "currentColor" }}
                className="text-gray-500 dark:text-gray-400"
                tickLine={false}
                axisLine={false}
                width={64}
              />
              <Tooltip content={<TooltipCustomizado />} />
              {mostrarBreakdown && (
                <Legend
                  formatter={(value) => {
                    if (value === "Total") return "Total";
                    return contasNoHistorico.find((c) => c.id === value)?.nome ?? value;
                  }}
                  wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                />
              )}

              {/* Linha do total — sempre visível */}
              <Line
                type="monotone"
                dataKey="Total"
                stroke="#3b82f6"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5 }}
              />

              {/* Linhas por conta — apenas quando há mais de uma */}
              {mostrarBreakdown &&
                contasNoHistorico.map((conta, i) => (
                  <Line
                    key={conta.id}
                    type="monotone"
                    dataKey={conta.id}
                    name={conta.id}
                    stroke={CORES[(i + 1) % CORES.length]}
                    strokeWidth={1.5}
                    strokeDasharray="4 2"
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}