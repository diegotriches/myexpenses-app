"use client";

import { useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Banknote, TrendingUp, TrendingDown, Coins } from "lucide-react";
import { useHideValues } from "@/contexts/HideValuesContext";
import { useRendaVariavel } from "@/hooks/useRendaVariavel";
import { resumirCarteira } from "@/utils/rendaVariavelUtils";

const formatarMoeda = (valor: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);

const plural = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`;

// Padrão compacto dos cards de resumo (mesmo da aba Renda fixa)
const CARD = "!py-0 !gap-0 border-l-4 dark:bg-gray-900 dark:border-gray-800 hover:shadow-lg transition-shadow overflow-hidden";
const HEADER = "flex flex-row items-center justify-between -space-y-1 !px-3 !pt-3 !pb-1 md:!px-4 md:!pt-5 md:!pb-1.5";
const TITLE = "text-[11px] md:text-sm font-medium text-gray-900 dark:text-white leading-none md:leading-normal";
const CONTENT = "!px-3 !pt-0 !pb-3 md:!px-4 md:!pt-0 md:!pb-5";
const VALOR = "text-base md:text-2xl font-bold leading-none md:leading-normal !mb-1";
const SUB = "text-[9px] md:text-xs text-gray-500 dark:text-gray-400 leading-none md:leading-normal mt-0.5 md:mt-1.5 truncate";

export default function ResumoRendaVariavel() {
  const { mask } = useHideValues();
  const { data, isLoading, isError } = useRendaVariavel();

  const r = useMemo(
    () => resumirCarteira(data?.operacoes ?? [], data?.cotacoes ?? []),
    [data],
  );

  const cor = (v: number) =>
    v >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400";

  const vazio = r.ativos.length === 0;
  const sinal = r.resultadoNaoRealizadoPct >= 0 ? "+" : "";
  const NaoRealizadoIcon = r.resultadoNaoRealizado >= 0 ? TrendingUp : TrendingDown;

  const renderCarregando = () => (
    <>
      <Skeleton className="h-4 w-20 md:h-6 md:w-32 mb-1.5" />
      <Skeleton className="h-2 w-12 md:h-3 md:w-20" />
    </>
  );
  const renderErro = () => <p className="text-xs text-red-500">Erro ao carregar</p>;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
      {/* Valor de mercado */}
      <Card className={`${CARD} border-l-emerald-500 dark:border-l-emerald-600`}>
        <CardHeader className={HEADER}>
          <CardTitle className={TITLE}>Valor de mercado</CardTitle>
          <LineChart className="h-3 w-3 md:h-4 md:w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
        </CardHeader>
        <CardContent className={CONTENT}>
          {isLoading ? renderCarregando() : isError ? renderErro() : (
            <>
              <div className={`${VALOR} text-emerald-600 dark:text-emerald-400`}>
                {mask(formatarMoeda(r.valorMercado))}
              </div>
              <p className={SUB}>
                {vazio
                  ? "Nenhum ativo em carteira"
                  : r.semCotacao > 0
                    ? `${plural(r.semCotacao, "ativo sem cotação", "ativos sem cotação")}`
                    : plural(r.ativos.length, "ativo", "ativos")}
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Total investido (custo) */}
      <Card className={`${CARD} border-l-blue-500 dark:border-l-blue-600`}>
        <CardHeader className={HEADER}>
          <CardTitle className={TITLE}>Total investido</CardTitle>
          <Banknote className="h-3 w-3 md:h-4 md:w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
        </CardHeader>
        <CardContent className={CONTENT}>
          {isLoading ? renderCarregando() : isError ? renderErro() : (
            <>
              <div className={`${VALOR} text-gray-900 dark:text-white`}>
                {mask(formatarMoeda(r.custoTotal))}
              </div>
              <p className={SUB}>custo das posições abertas</p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Resultado não realizado */}
      <Card className={`${CARD} ${r.resultadoNaoRealizado >= 0 ? "border-l-green-500 dark:border-l-green-600" : "border-l-red-500 dark:border-l-red-600"}`}>
        <CardHeader className={HEADER}>
          <CardTitle className={TITLE}>Resultado (não realizado)</CardTitle>
          <NaoRealizadoIcon className={`h-3 w-3 md:h-4 md:w-4 flex-shrink-0 ${cor(r.resultadoNaoRealizado)}`} />
        </CardHeader>
        <CardContent className={CONTENT}>
          {isLoading ? renderCarregando() : isError ? renderErro() : (
            <>
              <div className={`${VALOR} ${cor(r.resultadoNaoRealizado)}`}>
                {mask(formatarMoeda(r.resultadoNaoRealizado))}
              </div>
              <p className={SUB}>
                {r.custoTotal > 0 ? `${sinal}${r.resultadoNaoRealizadoPct.toFixed(2)}% sobre o investido` : "—"}
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Resultado realizado */}
      <Card className={`${CARD} border-l-orange-500 dark:border-l-orange-600`}>
        <CardHeader className={HEADER}>
          <CardTitle className={TITLE}>Resultado (realizado)</CardTitle>
          <Coins className="h-3 w-3 md:h-4 md:w-4 text-orange-600 dark:text-orange-400 flex-shrink-0" />
        </CardHeader>
        <CardContent className={CONTENT}>
          {isLoading ? renderCarregando() : isError ? renderErro() : (
            <>
              <div className={`${VALOR} ${cor(r.resultadoRealizado)}`}>
                {mask(formatarMoeda(r.resultadoRealizado))}
              </div>
              <p className={SUB}>nas vendas, antes do IR</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}