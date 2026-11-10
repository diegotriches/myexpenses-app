"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Repeat,
  ArrowUpCircle,
  ArrowDownCircle,
  Calendar,
  Loader2,
} from "lucide-react";
import { useRecorrentes } from "@/hooks/useDashboard";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useMemo } from "react";
import { useMoeda } from "@/hooks/useMoeda";

interface CardRecorrentesProps {
  ano: number;
}

export function CardRecorrentes({ ano }: CardRecorrentesProps) {
  const { data: transacoes, isLoading, error } = useRecorrentes(ano);

  const fmt = useMoeda();

  const recorrenciasAgrupadas = useMemo(() => {
    if (!transacoes || transacoes.length === 0) return [];
    const mapa = new Map();
    transacoes.forEach((t) => {
      const key = t.recorrenciaId || t.id;
      if (!mapa.has(key)) {
        const valorMensal = Number(t.valor);
        const totalRecorrencia = t.repeticoes
          ? valorMensal * t.repeticoes
          : valorMensal;
        const quantidadeParcelas = t.repeticoes || 1;
        mapa.set(key, { ...t, totalRecorrencia, quantidadeParcelas });
      }
    });
    return Array.from(mapa.values());
  }, [transacoes]);

  const receitas = useMemo(
    () => recorrenciasAgrupadas.filter((t) => t.tipo === "entrada"),
    [recorrenciasAgrupadas],
  );
  const despesas = useMemo(
    () => recorrenciasAgrupadas.filter((t) => t.tipo === "saida"),
    [recorrenciasAgrupadas],
  );
  const totalReceitas = useMemo(
    () => receitas.reduce((acc, t) => acc + Number(t.valor), 0),
    [receitas],
  );
  const totalDespesas = useMemo(
    () => despesas.reduce((acc, t) => acc + Number(t.valor), 0),
    [despesas],
  );
  const totalRecorrente = totalReceitas + totalDespesas;

  const formatarData = (data: string | Date) => {
    const date = new Date(data);
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", timeZone: "UTC" });
  };

  if (isLoading) {
    return (
      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
            <Repeat className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            Transações Recorrentes
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
            <Repeat className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            Transações Recorrentes
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

  return (
    <Card className="dark:bg-gray-900 dark:border-gray-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
          <Repeat className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          Transações Recorrentes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {recorrenciasAgrupadas.length === 0 ? (
          <div className="text-center py-8">
            <Repeat className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Nenhuma transação recorrente encontrada
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Transações recorrentes aparecem automaticamente todos os meses
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {recorrenciasAgrupadas.slice(0, 5).map((t) => {
              const porcentagem =
                totalRecorrente > 0
                  ? (Number(t.valor) / totalRecorrente) * 100
                  : 0;
              const isReceita = t.tipo === "entrada";

              return (
                <div
                  key={t.recorrenciaId || t.id}
                  className="flex items-center gap-2.5 p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div
                    className={`p-1.5 rounded-full flex-shrink-0 ${
                      isReceita
                        ? "bg-green-100 dark:bg-green-900/30"
                        : "bg-red-100 dark:bg-red-900/30"
                    }`}
                  >
                    {isReceita ? (
                      <ArrowUpCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                    ) : (
                      <ArrowDownCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                        {t.descricao ||
                          (isReceita
                            ? "Receita recorrente"
                            : "Despesa recorrente")}
                      </span>
                      <span
                        className={`text-sm font-bold ml-2 whitespace-nowrap ${
                          isReceita
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {isReceita ? "+" : "-"} {fmt(Number(t.valor))}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${isReceita ? "bg-green-500" : "bg-red-500"}`}
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
                          {formatarData(t.data)}
                        </div>
                      )}
                      {t.quantidadeParcelas > 1 && (
                        <div className="flex items-center gap-1 font-medium text-purple-600 dark:text-purple-400">
                          <Repeat className="w-3 h-3" />
                          {t.quantidadeParcelas} meses
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="pt-2 border-t border-gray-200 dark:border-gray-700 space-y-1.5">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  Receitas mensais:
                </span>
                <span className="font-semibold text-green-600 dark:text-green-400">
                  {fmt(totalReceitas)}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  Despesas mensais:
                </span>
                <span className="font-semibold text-red-600 dark:text-red-400">
                  {fmt(totalDespesas)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-gray-100 dark:border-gray-800">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Impacto mensal:
                </span>
                <span
                  className={`text-base font-bold ${
                    totalReceitas - totalDespesas >= 0
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {totalReceitas - totalDespesas >= 0 ? "+" : ""}{" "}
                  {fmt(totalReceitas - totalDespesas)}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                <span>Total de recorrências:</span>
                <span className="font-semibold">
                  {recorrenciasAgrupadas.length}
                </span>
              </div>
              {transacoes && (
                <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                  <span>Lançamentos no período:</span>
                  <span className="font-semibold">{transacoes.length}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}