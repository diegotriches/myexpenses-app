"use client";

import type { ReactNode } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface OpcaoEtiqueta {
  valor: string;
  rotulo: string;
  qtd: number;
  /** Classes da etiqueta marcada (a mesma cor da etiqueta do card) */
  cor: string;
}

/** "painel": em pilha, no "Mais filtros" do celular e tablet; "linha": aberto, na barra do computador */
export type ModoFiltros = "painel" | "linha";

interface Props {
  busca: string;
  onBusca: (v: string) => void;
  placeholderBusca: string;
  /** Etiquetas clicáveis por tipo; nenhuma marcada mostra tudo */
  etiquetas: OpcaoEtiqueta[];
  marcadas: string[];
  onAlternarEtiqueta: (valor: string) => void;
  /**
   * Filtros além da busca e do tipo. Abaixo de 1024 px vão no painel "Mais filtros"
   * (modo "painel"); a partir daí ficam abertos na primeira linha (modo "linha").
   */
  maisFiltros?: (modo: ModoFiltros) => ReactNode;
  /** No computador, opções que ficam na linha das etiquetas (ex.: indexador), depois de um traço */
  extrasEtiquetas?: ReactNode;
  /** Quantos filtros do painel estão ligados (número no botão "Mais filtros") */
  qtdMaisFiltros?: number;
  ordem: string;
  opcoesOrdem: { valor: string; rotulo: string }[];
  onOrdem: (v: string) => void;
  /** Algum filtro ligado: mostra o resumo e "Limpar filtros" */
  filtrando: boolean;
  resumo: ReactNode;
  onLimpar: () => void;
}

const classeOpcao = (marcada: boolean, corMarcada = "bg-blue-700 text-white") =>
  cn(
    "rounded-full px-2.5 py-1 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
    marcada
      ? corMarcada
      : "border border-gray-200 text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800",
  );

/**
 * Barra de filtros das listas de investimentos (renda fixa e renda variável):
 * busca, etiquetas de tipo com contagem, filtros extras e ordenação. No celular e
 * no tablet os extras ficam no painel "Mais filtros"; no computador, abertos.
 * O estado fica no componente que a usa (vale só enquanto a página está aberta).
 */
export default function BarraFiltros({
  busca, onBusca, placeholderBusca, etiquetas, marcadas, onAlternarEtiqueta,
  maisFiltros, extrasEtiquetas, qtdMaisFiltros = 0, ordem, opcoesOrdem, onOrdem, filtrando, resumo, onLimpar,
}: Props) {
  const mostraEtiquetas = etiquetas.length > 1;

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px] sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" aria-hidden="true" />
          <Input
            value={busca}
            onChange={(e) => onBusca(e.target.value)}
            placeholder={placeholderBusca}
            aria-label={placeholderBusca}
            className="pl-8 pr-8"
          />
          {busca && (
            <button
              type="button"
              onClick={() => onBusca("")}
              aria-label="Limpar busca"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {maisFiltros && (
          <>
            {/* Celular e tablet: painel */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-1.5 lg:hidden">
                  <SlidersHorizontal className="w-4 h-4" />
                  Mais filtros
                  {qtdMaisFiltros > 0 && (
                    <span className="ml-0.5 rounded-full bg-blue-700 px-1.5 text-[11px] font-semibold leading-5 text-white">
                      {qtdMaisFiltros}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-72 space-y-4 dark:bg-gray-800 dark:border-gray-700">
                {maisFiltros("painel")}
              </PopoverContent>
            </Popover>
            {/* Computador: abertos na linha */}
            <div className="hidden lg:flex flex-wrap items-center gap-2">{maisFiltros("linha")}</div>
          </>
        )}

        <Select value={ordem} onValueChange={onOrdem}>
          <SelectTrigger className="w-auto min-w-[170px]" aria-label="Ordenar por">
            <span className="text-gray-500 dark:text-gray-400 mr-1">Ordenar:</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {opcoesOrdem.map((o) => <SelectItem key={o.valor} value={o.valor}>{o.rotulo}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {(mostraEtiquetas || extrasEtiquetas) && (
        <div className={cn("flex-wrap items-center gap-x-3 gap-y-2", mostraEtiquetas ? "flex" : "hidden lg:flex")}>
          {/* Etiquetas só ajudam com mais de um tipo na lista */}
          {mostraEtiquetas && (
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por tipo">
              {etiquetas.map((e) => {
                const marcada = marcadas.includes(e.valor);
                return (
                  <button
                    key={e.valor}
                    type="button"
                    aria-pressed={marcada}
                    onClick={() => onAlternarEtiqueta(e.valor)}
                    className={classeOpcao(marcada, cn(e.cor, "ring-1 ring-current/40"))}
                  >
                    {e.rotulo} <span className="opacity-70">({e.qtd})</span>
                  </button>
                );
              })}
            </div>
          )}
          {extrasEtiquetas && (
            <div className="hidden lg:flex items-center gap-3">
              {mostraEtiquetas && <span className="h-5 w-px bg-gray-200 dark:bg-gray-700" aria-hidden="true" />}
              {extrasEtiquetas}
            </div>
          )}
        </div>
      )}

      {filtrando && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600 dark:text-gray-400">
          <span>{resumo}</span>
          <button type="button" onClick={onLimpar} className="font-medium text-blue-700 hover:underline dark:text-blue-400">
            Limpar filtros
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Grupo de opções clicáveis. No painel, com o título em cima; em linha (computador),
 * com o título à esquerda.
 */
export function OpcoesFiltro({ titulo, opcoes, marcadas, onAlternar, emLinha = false }: {
  titulo: string;
  opcoes: { valor: string; rotulo: string }[];
  marcadas: string[];
  onAlternar: (valor: string) => void;
  emLinha?: boolean;
}) {
  return (
    <div className={emLinha ? "flex flex-wrap items-center gap-1.5" : "space-y-1.5"} role="group" aria-label={titulo}>
      <p className={cn("text-xs font-medium", emLinha ? "text-gray-500 dark:text-gray-400 mr-0.5" : "text-gray-700 dark:text-gray-300")}>
        {titulo}{emLinha && ":"}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {opcoes.map((o) => {
          const marcada = marcadas.includes(o.valor);
          return (
            <button
              key={o.valor}
              type="button"
              aria-pressed={marcada}
              onClick={() => onAlternar(o.valor)}
              className={classeOpcao(marcada)}
            >
              {o.rotulo}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Select de filtro: com rótulo em cima no painel; com o rótulo dentro do campo em linha */
export function SelectFiltro({ titulo, valor, opcoes, onMudar, modo }: {
  titulo: string;
  valor: string;
  opcoes: { valor: string; rotulo: string }[];
  onMudar: (v: string) => void;
  modo: ModoFiltros;
}) {
  if (modo === "linha") {
    return (
      <Select value={valor} onValueChange={onMudar}>
        <SelectTrigger className="w-auto" aria-label={titulo}>
          <span className="text-gray-500 dark:text-gray-400 mr-1">{titulo}:</span>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {opcoes.map((o) => <SelectItem key={o.valor} value={o.valor}>{o.rotulo}</SelectItem>)}
        </SelectContent>
      </Select>
    );
  }
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{titulo}</p>
      <Select value={valor} onValueChange={onMudar}>
        <SelectTrigger className="w-full" size="sm" aria-label={titulo}><SelectValue /></SelectTrigger>
        <SelectContent>
          {opcoes.map((o) => <SelectItem key={o.valor} value={o.valor}>{o.rotulo}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
