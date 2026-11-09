"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AlertTriangle, Calendar, Tag } from "lucide-react";
import { useMaioresGastos } from "@/hooks/useDashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { useMoeda } from "@/hooks/useMoeda";

interface CardMaioresGastosProps {
  ano: number;
}

export function CardMaioresGastos({ ano }: CardMaioresGastosProps) {
  const { data, isLoading } = useMaioresGastos(ano, 5);

  const gastos = data?.gastos ?? [];
  const total = data?.total ?? 0;
  const media = data?.media ?? 0;

  const fmt = useMoeda();

  const formatarData = (data: string | Date) => {
    const date = typeof data === "string" ? new Date(data) : data;
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  if (isLoading) {
    return (
      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardHeader>
          <Skeleton className="h-4 w-[200px]" />
        </CardHeader>
        <CardContent className="space-y-2.5">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="dark:bg-gray-900 dark:border-gray-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
          <span className="hidden sm:inline">Top 5 Maiores Gastos</span>
          <span className="sm:hidden">Top 5 Gastos</span>
        </CardTitle>
      </CardHeader>

      <CardContent>
        {gastos.length === 0 ? (
          <div className="text-center py-8">
            <AlertTriangle className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Nenhum gasto encontrado neste período
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Suas maiores despesas aparecerão aqui
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {gastos.map((t, index) => {
              const porcentagem = total > 0 ? (t.valor / total) * 100 : 0;

              return (
                <div
                  key={t.id}
                  className="flex items-center gap-2.5 p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
                >
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-bold flex-shrink-0 group-hover:scale-110 transition-transform">
                    {index + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                        {t.descricao}
                      </span>
                      <span className="text-sm font-bold text-red-600 dark:text-red-400 ml-2 whitespace-nowrap">
                        {fmt(t.valor)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-500 transition-all duration-300"
                          style={{ width: `${porcentagem}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">
                        {porcentagem.toFixed(1)}%
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                      {t.data && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span className="hidden sm:inline">
                            {formatarData(t.data)}
                          </span>
                          <span className="sm:hidden text-[10px]">
                            {formatarData(t.data)}
                          </span>
                        </div>
                      )}
                      {t.categoria && (
                        <div className="flex items-center gap-1 min-w-0">
                          <Tag className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate hidden sm:inline">
                            {t.categoria}
                          </span>
                          <span className="truncate sm:hidden text-[10px]">
                            {t.categoria}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="pt-2 border-t border-gray-200 dark:border-gray-700 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  <span className="hidden sm:inline">Total (Top 5):</span>
                  <span className="sm:hidden">Total:</span>
                </span>
                <span className="text-base font-bold text-red-600 dark:text-red-400">
                  {fmt(total)}
                </span>
              </div>
              {gastos.length > 0 && (
                <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                  <span>
                    <span className="hidden sm:inline">
                      Média dos maiores gastos:
                    </span>
                    <span className="sm:hidden">Média:</span>
                  </span>
                  <span className="font-semibold">{fmt(media)}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}