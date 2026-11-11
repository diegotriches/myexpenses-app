"use client";

import type { ElementType, ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  titulo: ReactNode;
  descricao?: ReactNode;
  icone?: ElementType<{ className?: string }>;
  // Conteúdo próprio no lugar do ícone padrão (ex.: ícone colorido da categoria)
  iconeCustom?: ReactNode;
  // Ao lado do título (ex.: selo "Fatura Aberta")
  selo?: ReactNode;
  // Botões à direita; no celular descem para baixo do título
  acoes?: ReactNode;
  onVoltar?: () => void;
  className?: string;
}

/**
 * Cabeçalho único das páginas logadas: ícone num quadrado suave, título,
 * descrição e ações. Sem linha divisória: o espaço já separa do conteúdo.
 */
export function PageHeader({ titulo, descricao, icone: Icone, iconeCustom, selo, acoes, onVoltar, className }: Props) {
  return (
    <header className={cn("flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div className="flex min-w-0 items-center gap-3">
        {onVoltar && (
          <Button variant="ghost" size="icon" onClick={onVoltar} className="h-9 w-9 shrink-0 -ml-2" title="Voltar">
            <ArrowLeft className="h-[18px] w-[18px]" />
          </Button>
        )}
        {iconeCustom ?? (Icone && (
          <span className="flex h-10 w-10 md:h-11 md:w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100 dark:bg-blue-950/50 dark:text-blue-400 dark:ring-blue-900/60">
            <Icone className="h-5 w-5" />
          </span>
        ))}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">{titulo}</h1>
            {selo}
          </div>
          {descricao && <p className="text-sm text-gray-500 dark:text-gray-400">{descricao}</p>}
        </div>
      </div>
      {acoes && <div className="flex shrink-0 flex-wrap items-center gap-2">{acoes}</div>}
    </header>
  );
}
