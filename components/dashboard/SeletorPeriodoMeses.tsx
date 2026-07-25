"use client";

// src/components/dashboard/SeletorPeriodoMeses.tsx
//
// Seletor compartilhado de período (3/6/12 meses) usado no topo de cada aba
// do dashboard (Visão Geral / Análises). Cada aba mantém seu próprio estado
// de período — este componente é "burro", só recebe valor e callback.

interface SeletorPeriodoMesesProps {
  value: 3 | 6 | 12;
  onChange: (periodo: 3 | 6 | 12) => void;
  className?: string;
}

const OPCOES: { valor: 3 | 6 | 12; label: string }[] = [
  { valor: 3, label: "3M" },
  { valor: 6, label: "6M" },
  { valor: 12, label: "12M" },
];

export function SeletorPeriodoMeses({ value, onChange, className = "" }: SeletorPeriodoMesesProps) {
  return (
    <div
      className={`inline-flex items-center rounded-md bg-muted p-1 text-muted-foreground dark:bg-gray-800 ${className}`}
      role="group"
      aria-label="Selecionar período em meses"
    >
      {OPCOES.map((opcao) => (
        <button
          key={opcao.valor}
          type="button"
          onClick={() => onChange(opcao.valor)}
          aria-pressed={value === opcao.valor}
          className={[
            "px-3 py-1.5 text-sm font-medium rounded-sm transition-all",
            "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            value === opcao.valor
              ? "bg-background text-foreground shadow-sm dark:bg-gray-700 dark:text-white"
              : "hover:bg-background/50 dark:hover:bg-gray-700/50",
          ].join(" ")}
        >
          {opcao.label}
        </button>
      ))}
    </div>
  );
}