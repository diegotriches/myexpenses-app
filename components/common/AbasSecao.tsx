"use client";

import type { ElementType } from "react";
import { cn } from "@/lib/utils";
import { useIndicadorDeslizante } from "@/hooks/useIndicadorDeslizante";

export interface AbaSecao<T extends string> {
  id: T;
  rotulo: string;
  icone?: ElementType<{ className?: string }>;
  // Contador ao lado do rótulo (ex.: contas ativas)
  qtd?: number;
}

interface Props<T extends string> {
  abas: readonly AbaSecao<T>[];
  ativa: T;
  onChange: (id: T) => void;
  ariaLabel?: string;
  className?: string;
}

/**
 * Abas de navegação entre seções de uma página (sublinhado). Para filtros dentro
 * de um card, use o estilo segmentado (`Tabs` do shadcn).
 * Funciona sozinha ou dentro de um `<Tabs value>` controlado, no lugar do `TabsList`.
 *
 * O sublinhado é um indicador que desliza até a aba ativa. Até ele ser posicionado
 * (antes da hidratação), a aba ativa usa a própria borda, para o sublinhado não sumir.
 */
export function AbasSecao<T extends string>({ abas, ativa, onChange, ariaLabel, className }: Props<T>) {
  // Muda quando muda a aba ativa ou o que altera a largura das abas (rótulo, contador)
  const assinatura = `${ativa}|${abas.map((a) => `${a.id}:${a.rotulo}:${a.qtd ?? ""}`).join(",")}`;
  const indicadorRef = useIndicadorDeslizante({
    chave: assinatura,
    seletorItens: '[role="tab"]',
    seletorAtivo: '[role="tab"][aria-selected="true"]',
    eixos: "x",
  });

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn("group/abas relative flex gap-1 overflow-x-auto border-b border-gray-200 dark:border-gray-800 [scrollbar-width:none]", className)}
    >
      {abas.map(({ id, rotulo, icone: Icone, qtd }) => {
        const selecionada = ativa === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={selecionada}
            onClick={() => onChange(id)}
            className={cn(
              "-mb-px inline-flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 sm:px-4 py-2 text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 rounded-t-md",
              selecionada
                ? "border-blue-600 text-blue-700 dark:border-blue-400 dark:text-blue-300 group-data-[indicador-pronto=true]/abas:border-transparent"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-800 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-200",
            )}
          >
            {/* No celular só o texto, para três abas caberem sem rolar */}
            {Icone && <Icone className="hidden sm:block h-4 w-4" />}
            {rotulo}
            {qtd !== undefined && (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs tabular-nums transition-colors",
                  selecionada
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
                )}
              >
                {qtd}
              </span>
            )}
          </button>
        );
      })}
      <span
        ref={indicadorRef}
        aria-hidden="true"
        style={{ opacity: 0 }}
        className="pointer-events-none absolute bottom-0 left-0 h-0.5 rounded-full bg-blue-600 dark:bg-blue-400 data-[animar=true]:transition-[transform,width] data-[animar=true]:duration-200 data-[animar=true]:ease-out"
      />
    </div>
  );
}
