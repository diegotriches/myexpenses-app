"use client";

//
// Seletor de ano compartilhado pelas abas do dashboard (Visão Geral / Análises).
// Componente "burro": só recebe o valor e o callback. O ano vigente é o limite
// superior; o limite inferior é configurável.

import { ChevronLeft, ChevronRight } from "lucide-react";

interface SeletorAnoProps {
  value: number;
  onChange: (ano: number) => void;
  anoMinimo?: number;
  className?: string;
}

const MESES_ABREV = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export function SeletorAno({ value, onChange, anoMinimo = 2020, className = "" }: SeletorAnoProps) {
  const hoje = new Date();
  const anoVigente = hoje.getFullYear();

  const podeVoltar = value > anoMinimo;
  const podeAvancar = value < anoVigente;

  // "Jan–Nov" no ano vigente, "Jan–Dez" nos anos passados
  const ultimoMes = value === anoVigente ? hoje.getMonth() : 11;
  const rotuloPeriodo = ultimoMes === 0 ? "Jan" : `Jan–${MESES_ABREV[ultimoMes]}`;

  const botao =
    "inline-flex h-8 w-8 items-center justify-center rounded-sm transition-all " +
    "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 " +
    "disabled:opacity-40 disabled:cursor-not-allowed hover:bg-background/50 dark:hover:bg-gray-700/50";

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <span className="hidden sm:inline text-xs text-gray-500 dark:text-gray-400">{rotuloPeriodo}</span>
      <div
        className="inline-flex items-center rounded-md bg-muted p-1 text-muted-foreground dark:bg-gray-800"
        role="group"
        aria-label="Selecionar ano"
      >
        <button
          type="button"
          onClick={() => onChange(value - 1)}
          disabled={!podeVoltar}
          aria-label="Ano anterior"
          className={botao}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <span className="min-w-[56px] px-2 text-center text-sm font-medium bg-background text-foreground shadow-sm rounded-sm py-1 dark:bg-gray-700 dark:text-white">
          {value}
        </span>

        <button
          type="button"
          onClick={() => onChange(value + 1)}
          disabled={!podeAvancar}
          aria-label="Próximo ano"
          className={botao}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}