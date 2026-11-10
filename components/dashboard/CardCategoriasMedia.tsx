"use client";

import { useMemo } from "react";
import { Gauge } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTransacoesTodas } from "@/hooks/useTransacoes";
import { useMoeda } from "@/hooks/useMoeda";
import { hojeBrt } from "@/utils/aplicacaoSimulacao";
import { compararCategoriasComMedia } from "@/utils/gastosUtils";

const MESES = 6;
const MAXIMO_VISIVEL = 6;

function corDaBarra(percentual: number | null): string {
  if (percentual === null) return "bg-gray-400 dark:bg-gray-500";
  if (percentual > 100) return "bg-red-500";
  if (percentual >= 80) return "bg-amber-500";
  return "bg-green-500";
}

// Gasto do mês atual por categoria em relação à média dos meses anteriores
export function CardCategoriasMedia() {
  const { data: transacoes = [], isLoading, isError } = useTransacoesTodas();
  const fmt = useMoeda();
  const hoje = hojeBrt();

  const r = useMemo(() => compararCategoriasComMedia(transacoes, hoje, MESES), [transacoes, hoje]);
  const visiveis = r.itens.slice(0, MAXIMO_VISIVEL);
  const acima = r.itens.filter((i) => i.percentual !== null && i.percentual > 100).length;

  return (
    <Card className="dark:bg-gray-900 dark:border-gray-800">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2 text-gray-900 dark:text-white">
          <span className="flex items-center gap-2">
            <Gauge className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Gastos do mês x média
          </span>
          {r.mesesConsiderados > 0 && (
            <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
              média de {r.mesesConsiderados} {r.mesesConsiderados === 1 ? "mês" : "meses"}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          [...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)
        ) : isError ? (
          <p className="text-sm text-red-500">Não foi possível carregar os lançamentos.</p>
        ) : r.itens.length === 0 ? (
          <p className="text-sm text-center text-gray-500 dark:text-gray-400 py-8">Nenhum gasto neste mês até agora.</p>
        ) : (
          <>
            {acima > 0 && (
              <p className="text-xs font-medium text-red-600 dark:text-red-400">
                {acima} categoria{acima === 1 ? " já passou" : "s já passaram"} da média do mês.
              </p>
            )}
            <ul className="space-y-3">
              {visiveis.map((item) => (
                <li key={item.categoria} className="space-y-1">
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-medium text-gray-900 dark:text-white truncate">{item.categoria}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {fmt(item.atual)}
                      {item.percentual !== null ? ` de ${fmt(item.media)}` : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                      <div
                        className={`h-2 rounded-full ${corDaBarra(item.percentual)}`}
                        style={{ width: `${item.percentual === null ? 100 : Math.min(item.percentual, 100)}%` }}
                      />
                    </div>
                    <span
                      className={`w-12 text-right text-xs font-semibold ${
                        item.percentual === null
                          ? "text-gray-500 dark:text-gray-400"
                          : item.percentual > 100
                            ? "text-red-600 dark:text-red-400"
                            : "text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {item.percentual === null ? "novo" : `${item.percentual}%`}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
            {r.itens.length > visiveis.length && (
              <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                e mais {r.itens.length - visiveis.length} categoria{r.itens.length - visiveis.length === 1 ? "" : "s"}
              </p>
            )}
            <p className="text-[11px] text-gray-400 dark:text-gray-500">
              {r.mesesConsiderados === 0
                ? "Ainda não há meses anteriores para comparar."
                : "Acumulado do mês até hoje comparado com a média mensal. \"Novo\" = sem gasto nesses meses."}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
