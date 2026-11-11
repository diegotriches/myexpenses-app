"use client";

import type { ElementType, ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Cor do quadradinho do ícone: identifica o indicador, sem significado de bom ou ruim
export type TomKpi = "azul" | "verde" | "vermelho" | "ambar" | "roxo" | "laranja" | "cinza";

// Cor do valor: neutro por padrão; verde e vermelho só quando indicam ganho ou perda
export type TomValorKpi = "neutro" | "positivo" | "negativo" | "alerta";

const CHIP: Record<TomKpi, string> = {
  azul:     "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400",
  verde:    "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400",
  vermelho: "bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-400",
  ambar:    "bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400",
  roxo:     "bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400",
  laranja:  "bg-orange-50 text-orange-600 dark:bg-orange-950/60 dark:text-orange-400",
  cinza:    "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

const VALOR: Record<TomValorKpi, string> = {
  neutro:   "text-gray-900 dark:text-white",
  positivo: "text-emerald-600 dark:text-emerald-400",
  negativo: "text-red-600 dark:text-red-400",
  alerta:   "text-amber-600 dark:text-amber-400",
};

interface Props {
  titulo: string;
  valor: ReactNode;
  icone: ElementType<{ className?: string }>;
  tom?: TomKpi;
  tomValor?: TomValorKpi;
  // Linha de apoio abaixo do valor (texto ou elemento com ícone de tendência)
  detalhe?: ReactNode;
  carregando?: boolean;
  erro?: boolean;
  className?: string;
}

/**
 * Card de indicador do topo das páginas (Dashboard, Contas, Cartões, Aplicações,
 * Resumo Anual, extratos). Fundo neutro, ícone num quadrado colorido e valor em
 * cor neutra, salvo quando o próprio número indica ganho ou perda.
 */
export function KpiCard({
  titulo, valor, icone: Icone, tom = "azul", tomValor = "neutro", detalhe, carregando, erro, className,
}: Props) {
  return (
    <Card className={cn("py-0 gap-0 dark:bg-gray-900 dark:border-gray-800", className)}>
      <div className="p-3 md:p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400 leading-tight">{titulo}</p>
          <span className={cn("flex h-7 w-7 md:h-8 md:w-8 shrink-0 items-center justify-center rounded-lg", CHIP[tom])}>
            <Icone className="h-3.5 w-3.5 md:h-4 md:w-4" />
          </span>
        </div>
        {carregando ? (
          <div className="mt-1 space-y-1.5">
            <Skeleton className="h-5 w-24 md:h-7 md:w-32" />
            <Skeleton className="h-3 w-16 md:w-24" />
          </div>
        ) : erro ? (
          <p className="mt-1 text-xs text-red-500">Erro ao carregar</p>
        ) : (
          <>
            <div className={cn("mt-0.5 md:mt-1 text-base sm:text-lg md:text-2xl font-semibold tracking-tight tabular-nums break-words", VALOR[tomValor])}>
              {valor}
            </div>
            {detalhe && (
              <div className="mt-0.5 md:mt-1 text-[11px] md:text-xs text-gray-500 dark:text-gray-400 truncate">{detalhe}</div>
            )}
          </>
        )}
      </div>
    </Card>
  );
}
