"use client";

import { useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { categoriasDespesa, categoriasReceita } from "@/utils/dashboardUtils";
import { useTransacoesAno } from "@/hooks/useTransacoes";
import { useMoeda } from "@/hooks/useMoeda";

const CONFIG = {
  despesa: {
    agrupar: categoriasDespesa,
    cores: ["#ef4444", "#f97316", "#eab308", "#a855f7", "#ec4899"],
    Icone: TrendingDown,
    corIcone: "text-red-600 dark:text-red-400",
    titulo: "Categorias com Maior Despesa",
    nomePlural: "despesas",
    vazio: "Nenhuma despesa encontrada",
  },
  receita: {
    agrupar: categoriasReceita,
    cores: ["#22c55e", "#16a34a", "#4ade80", "#14b8a6", "#06b6d4"],
    Icone: TrendingUp,
    corIcone: "text-green-600 dark:text-green-400",
    titulo: "Categorias com Maior Receita",
    nomePlural: "receitas",
    vazio: "Nenhuma receita encontrada",
  },
} as const;

// type (e não interface) para o Recharts aceitar como dado do gráfico
type ItemGrafico = {
  name: string;
  value: number;
  porcentagem: number;
  cor: string;
};

interface PropsTooltip {
  active?: boolean;
  payload?: ReadonlyArray<{ name?: string | number; payload?: ItemGrafico }>;
}

interface Props {
  ano: number;
  tipo: keyof typeof CONFIG;
}

/** Ranking das 5 categorias com mais valor no ano, em despesas ou em receitas. */
export function CardCategorias({ ano, tipo }: Props) {
  const config = CONFIG[tipo];
  const { Icone } = config;
  const { data: transacoes = [], isLoading } = useTransacoesAno(ano);
  const fmt = useMoeda();

  const categorias = useMemo(() => config.agrupar(transacoes), [config, transacoes]);

  const total = useMemo(
    () => categorias.reduce((acc, c) => acc + c.total, 0),
    [categorias]
  );

  const chartData = useMemo<ItemGrafico[]>(() =>
    categorias.slice(0, 5).map((c, i) => ({
      name:        c.categoria,
      value:       c.total,
      porcentagem: total > 0 ? (c.total / total) * 100 : 0,
      cor:         config.cores[i % config.cores.length],
    })),
    [categorias, total, config]
  );

  const renderTooltip = ({ active, payload }: PropsTooltip) => {
    const item = payload?.[0];
    if (!active || !item?.payload) return null;
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 shadow-lg text-xs">
        <p className="font-semibold text-gray-800 dark:text-gray-200">{item.name}</p>
        <p className="text-gray-600 dark:text-gray-400">
          {fmt(item.payload.value)} ({item.payload.porcentagem.toFixed(1)}%)
        </p>
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardHeader><Skeleton className="h-4 w-[200px]" /></CardHeader>
        <CardContent className="space-y-2.5">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="dark:bg-gray-900 dark:border-gray-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
          <Icone className={`w-5 h-5 ${config.corIcone}`} />
          {config.titulo}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {categorias.length === 0 ? (
          <div className="text-center py-8">
            <Icone className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">{config.vazio}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              As {config.nomePlural} aparecerão aqui quando você registrá-las
            </p>
          </div>
        ) : (
          <div className="space-y-4">

            <div className="flex justify-center">
              <div className="w-[140px] h-[140px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={chartData} cx="50%" cy="50%" outerRadius={65} dataKey="value" strokeWidth={0}>
                      {chartData.map((entry, index) => (
                        <Cell key={index} fill={entry.cor} />
                      ))}
                    </Pie>
                    <Tooltip content={renderTooltip} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="space-y-2.5">
              {categorias.slice(0, 5).map((c, index) => {
                const porcentagem = total > 0 ? (c.total / total) * 100 : 0;
                const cor = config.cores[index % config.cores.length];

                return (
                  <div
                    key={c.categoria}
                    className="flex items-center gap-2.5 p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
                  >
                    <div
                      className="flex items-center justify-center w-7 h-7 rounded-full text-white text-xs font-bold flex-shrink-0 group-hover:scale-110 transition-transform"
                      style={{ backgroundColor: cor }}
                    >
                      {index + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                          {c.categoria}
                        </span>
                        <span className={`text-sm font-bold ${config.corIcone} ml-2 whitespace-nowrap`}>
                          {fmt(c.total)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full transition-all duration-300"
                            style={{ width: `${porcentagem}%`, backgroundColor: cor }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">
                          {porcentagem.toFixed(1)}%
                        </span>
                      </div>

                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {c.quantidade} lançamento{c.quantidade !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                );
              })}

              {categorias.length > 5 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center pt-1">
                  + {categorias.length - 5} categoria{categorias.length - 5 !== 1 ? "s" : ""} com {config.nomePlural}
                </p>
              )}

              <div className="pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total em {config.nomePlural}:</span>
                <span className={`text-base font-bold ${config.corIcone}`}>
                  {fmt(total)}
                </span>
              </div>
            </div>

          </div>
        )}
      </CardContent>
    </Card>
  );
}
