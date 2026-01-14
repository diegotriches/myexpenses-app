"use client";

import { usePeriodo } from "../../contexts/PeriodoContext";
import { useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronLeft, ChevronRight, Calendar, Home } from "lucide-react";

// ============================================================================
// CONSTANTES
// ============================================================================

const meses = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const mesesAbreviados = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez"
];

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function PeriodoSelector() {
  const { 
    mesSelecionado, 
    setMesSelecionado, 
    anoSelecionado, 
    setAnoSelecionado 
  } = usePeriodo();

  // Data atual para comparação
  const hoje = new Date();
  const mesAtual = hoje.getMonth();
  const anoAtual = hoje.getFullYear();
  const isHoje = mesSelecionado === mesAtual && anoSelecionado === anoAtual;

  // ============================================================================
  // FUNÇÕES DE NAVEGAÇÃO (com useCallback para estabilidade)
  // ============================================================================

  const avancarMes = useCallback(() => {
    if (mesSelecionado === 11) {
      setMesSelecionado(0);
      setAnoSelecionado(anoSelecionado + 1);
    } else {
      setMesSelecionado(mesSelecionado + 1);
    }
  }, [mesSelecionado, anoSelecionado, setMesSelecionado, setAnoSelecionado]);

  const voltarMes = useCallback(() => {
    if (mesSelecionado === 0) {
      setMesSelecionado(11);
      setAnoSelecionado(anoSelecionado - 1);
    } else {
      setMesSelecionado(mesSelecionado - 1);
    }
  }, [mesSelecionado, anoSelecionado, setMesSelecionado, setAnoSelecionado]);

  const voltarParaHoje = useCallback(() => {
    setMesSelecionado(mesAtual);
    setAnoSelecionado(anoAtual);
  }, [mesAtual, anoAtual, setMesSelecionado, setAnoSelecionado]);

  // ============================================================================
  // ATALHOS DE TECLADO
  // ============================================================================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Apenas se não estiver em input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === "ArrowLeft" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        voltarMes();
      } else if (e.key === "ArrowRight" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        avancarMes();
      } else if (e.key === "h" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        voltarParaHoje();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [voltarMes, avancarMes, voltarParaHoje]);

  // ============================================================================
  // ANOS DISPONÍVEIS
  // ============================================================================

  // Anos disponíveis (5 anos atrás até 2 anos no futuro)
  const anosDisponiveis = Array.from(
    { length: 8 },
    (_, i) => anoAtual - 5 + i
  );

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="flex items-center gap-2">
      {/* ====================================================================== */}
      {/* VERSÃO DESKTOP - COMPLETA */}
      {/* ====================================================================== */}
      <div className="hidden md:flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 shadow-sm">
        {/* Botão Voltar */}
        <Button
          variant="ghost"
          size="icon"
          onClick={voltarMes}
          className="h-8 w-8 text-gray-600 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-300 dark:hover:bg-gray-700 cursor-pointer"
          title="Mês anterior (Ctrl + ←)"
          aria-label="Voltar um mês"
        >
          <ChevronLeft size={18} />
        </Button>

        {/* Seletor de Período via Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              className={`
                min-w-[160px] font-semibold justify-center
                ${isHoje 
                  ? 'text-blue-600 dark:text-blue-400' 
                  : 'text-gray-900 dark:text-white'
                }
                hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer
              `}
              aria-label={`Período selecionado: ${meses[mesSelecionado]} de ${anoSelecionado}`}
            >
              <Calendar size={16} className="mr-2" />
              {meses[mesSelecionado]} {anoSelecionado}
              {isHoje && (
                <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 px-2 py-0.5 rounded-full">
                  Atual
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4" align="center">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300">
                  Selecionar Período
                </h4>
                {!isHoje && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={voltarParaHoje}
                    className="h-7 text-xs cursor-pointer"
                    aria-label="Voltar para o mês atual"
                  >
                    <Home size={12} className="mr-1" />
                    Hoje
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Seletor de Mês */}
                <div>
                  <label 
                    htmlFor="mes-select"
                    className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block"
                  >
                    Mês
                  </label>
                  <Select
                    value={mesSelecionado.toString()}
                    onValueChange={(v) => setMesSelecionado(parseInt(v))}
                  >
                    <SelectTrigger id="mes-select" className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {meses.map((mes, index) => (
                        <SelectItem key={index} value={index.toString()}>
                          {mes}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Seletor de Ano */}
                <div>
                  <label 
                    htmlFor="ano-select"
                    className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block"
                  >
                    Ano
                  </label>
                  <Select
                    value={anoSelecionado.toString()}
                    onValueChange={(v) => setAnoSelecionado(parseInt(v))}
                  >
                    <SelectTrigger id="ano-select" className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {anosDisponiveis.map((ano) => (
                        <SelectItem key={ano} value={ano.toString()}>
                          {ano}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="text-xs text-gray-500 dark:text-gray-400 text-center pt-2 border-t dark:border-gray-700">
                💡 <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[10px]">Ctrl</kbd> + 
                <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[10px] mx-1">←</kbd> / 
                <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[10px] mx-1">→</kbd> 
                para navegar
                <br />
                <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[10px] mt-1 inline-block">Ctrl</kbd> + 
                <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[10px] mx-1">H</kbd> 
                para voltar ao mês atual
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Botão Avançar */}
        <Button
          variant="ghost"
          size="icon"
          onClick={avancarMes}
          className="h-8 w-8 text-gray-600 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-300 dark:hover:bg-gray-700 cursor-pointer"
          title="Próximo mês (Ctrl + →)"
          aria-label="Avançar um mês"
        >
          <ChevronRight size={18} />
        </Button>

        {/* Botão Hoje - Só aparece se não estiver no mês atual */}
        {!isHoje && (
          <Button
            variant="outline"
            size="sm"
            onClick={voltarParaHoje}
            className="ml-2 h-8 text-xs cursor-pointer"
            title="Voltar para o mês atual (Ctrl + H)"
            aria-label="Voltar para o mês atual"
          >
            <Home size={14} className="mr-1" />
            Hoje
          </Button>
        )}
      </div>

      {/* ====================================================================== */}
      {/* VERSÃO MOBILE - COMPACTA */}
      {/* ====================================================================== */}
      <div className="md:hidden flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 shadow-sm">
        <Button
          variant="ghost"
          size="icon"
          onClick={voltarMes}
          className="h-7 w-7"
          aria-label="Voltar um mês"
        >
          <ChevronLeft size={16} />
        </Button>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              className={`
                text-sm font-semibold px-2
                ${isHoje ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}
              `}
              aria-label={`Período: ${mesesAbreviados[mesSelecionado]}/${anoSelecionado}`}
            >
              {mesesAbreviados[mesSelecionado]}/{anoSelecionado}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-4" align="center">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300">
                  Período
                </h4>
                {!isHoje && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={voltarParaHoje}
                    className="h-7 text-xs"
                    aria-label="Voltar para hoje"
                  >
                    Hoje
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label 
                    htmlFor="mes-select-mobile"
                    className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block"
                  >
                    Mês
                  </label>
                  <Select
                    value={mesSelecionado.toString()}
                    onValueChange={(v) => setMesSelecionado(parseInt(v))}
                  >
                    <SelectTrigger id="mes-select-mobile" className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {meses.map((mes, index) => (
                        <SelectItem key={index} value={index.toString()}>
                          {mes}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label 
                    htmlFor="ano-select-mobile"
                    className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block"
                  >
                    Ano
                  </label>
                  <Select
                    value={anoSelecionado.toString()}
                    onValueChange={(v) => setAnoSelecionado(parseInt(v))}
                  >
                    <SelectTrigger id="ano-select-mobile" className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {anosDisponiveis.map((ano) => (
                        <SelectItem key={ano} value={ano.toString()}>
                          {ano}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Button
          variant="ghost"
          size="icon"
          onClick={avancarMes}
          className="h-7 w-7"
          aria-label="Avançar um mês"
        >
          <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  );
}