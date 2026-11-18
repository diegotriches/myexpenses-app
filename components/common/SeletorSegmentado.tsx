"use client";

import type { ReactNode } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useIndicadorDeslizante } from "@/hooks/useIndicadorDeslizante";

export interface OpcaoSegmentada<T extends string> {
  valor: T;
  rotulo: ReactNode;
  /** Rótulo para telas estreitas (abaixo de 640 px), quando o completo não cabe */
  rotuloCurto?: ReactNode;
  /** Conteúdo depois do rótulo: contador, sinal de pendência */
  extra?: ReactNode;
}

interface Props<T extends string> {
  opcoes: readonly OpcaoSegmentada<T>[];
  valor: T;
  onChange: (valor: T) => void;
  ariaLabel: string;
  /** Muda quando algo além do valor altera a largura das opções (ex.: contadores chegando) */
  chave?: string;
  /** Classe do Tabs (raiz): use para mostrar/esconder por largura de tela */
  className?: string;
  /** Classe da lista (o fundo cinza) */
  classNameLista?: string;
}

/**
 * Seletor segmentado (pílulas num fundo cinza) cujo fundo da opção ativa desliza até a
 * opção clicada. Só a seleção: o conteúdo de cada opção fica com quem usa.
 * Usado no seletor Todas/Receitas/Despesas de Movimentações e nas seções da renda variável.
 */
export function SeletorSegmentado<T extends string>({ opcoes, valor, onChange, ariaLabel, chave = "", className, classNameLista }: Props<T>) {
  const ref = useIndicadorDeslizante({
    chave: `${valor}|${chave}`,
    seletorItens: '[role="tab"]',
    seletorAtivo: '[role="tab"][data-state="active"]',
  });

  return (
    <Tabs value={valor} onValueChange={(v) => onChange(v as T)} className={className}>
      <TabsList aria-label={ariaLabel} className={cn("group/seg relative h-9 dark:bg-gray-800", classNameLista)}>
        <span
          ref={ref}
          aria-hidden="true"
          style={{ opacity: 0 }}
          className="pointer-events-none absolute left-0 top-0 z-0 rounded-md border border-transparent bg-background shadow-sm dark:border-input dark:bg-gray-950 data-[animar=true]:transition-[transform,width,height] data-[animar=true]:duration-300 data-[animar=true]:ease-[cubic-bezier(0.22,1,0.36,1)]"
        />
        {opcoes.map((o) => (
          <TabsTrigger
            key={o.valor}
            value={o.valor}
            className={cn(
              "relative z-10 px-3 dark:data-[state=active]:bg-gray-950",
              // com o fundo deslizante posicionado, a opção ativa tira o próprio fundo
              "group-data-[indicador-pronto=true]/seg:data-[state=active]:bg-transparent group-data-[indicador-pronto=true]/seg:data-[state=active]:shadow-none",
              "dark:group-data-[indicador-pronto=true]/seg:data-[state=active]:bg-transparent dark:group-data-[indicador-pronto=true]/seg:data-[state=active]:border-transparent",
            )}
          >
            {o.rotuloCurto ? (
              <>
                <span className="sm:hidden">{o.rotuloCurto}</span>
                <span className="hidden sm:inline">{o.rotulo}</span>
              </>
            ) : o.rotulo}
            {o.extra}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
