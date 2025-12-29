"use client";

import { usePeriodo } from "../../contexts/PeriodoContext";
import { useEffect } from "react";
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

const meses = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const mesesAbreviados = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez"
];

export default function PeriodoSelector() {
  const { mesSelecionado, setMesSelecionado, anoSelecionado, setAnoSelecionado } = usePeriodo();

  // Data atual para comparação
  const hoje = new Date();
  const mesAtual = hoje.getMonth();
  const anoAtual = hoje.getFullYear();
  const isHoje = mesSelecionado === mesAtual && anoSelecionado === anoAtual;

  const avancarMes = () => {
    if (mesSelecionado === 11) {
      setMesSelecionado(0);
      setAnoSelecionado(anoSelecionado + 1);
    } else {
      setMesSelecionado(mesSelecionado + 1);
    }
  };

  const voltarMes = () => {
    if (mesSelecionado === 0) {
      setMesSelecionado(11);
      setAnoSelecionado(anoSelecionado - 1);
    } else {
      setMesSelecionado(mesSelecionado - 1);
    }
  };

  const voltarParaHoje = () => {
    setMesSelecionado(mesAtual);
    setAnoSelecionado(anoAtual);
  };

  // Atalhos de teclado
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
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mesSelecionado, anoSelecionado]);

  // Anos disponíveis (5 anos atrás até 2 anos no futuro)
  const anosDisponiveis = Array.from(
    { length: 8 },
    (_, i) => anoAtual - 5 + i
  );

  return (
    <div className="flex items-center gap-2">
      {/* Versão Desktop - Completa */}
      <div className="hidden md:flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 shadow-sm">
        {/* Botão Voltar */}
        <Button
          variant="ghost"
          size="icon"
          onClick={voltarMes}
          className="h-8 w-8 text-gray-600 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-300 dark:hover:bg-gray-700"
          title="Mês anterior (Ctrl + ←)"
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
                hover:bg-gray-100 dark:hover:bg-gray-700
              `}
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
                    className="h-7 text-xs"
                  >
                    <Home size={12} className="mr-1" />
                    Hoje
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Seletor de Mês */}
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                    Mês
                  </label>
                  <Select
                    value={mesSelecionado.toString()}
                    onValueChange={(v) => setMesSelecionado(parseInt(v))}
                  >
                    <SelectTrigger className="h-9">
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
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                    Ano
                  </label>
                  <Select
                    value={anoSelecionado.toString()}
                    onValueChange={(v) => setAnoSelecionado(parseInt(v))}
                  >
                    <SelectTrigger className="h-9">
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

              <div className="text-xs text-gray-500 dark:text-gray-400 text-center pt-2 border-t">
                💡 Use Ctrl + ← / → para navegar
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Botão Avançar */}
        <Button
          variant="ghost"
          size="icon"
          onClick={avancarMes}
          className="h-8 w-8 text-gray-600 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-300 dark:hover:bg-gray-700"
          title="Próximo mês (Ctrl + →)"
        >
          <ChevronRight size={18} />
        </Button>

        {/* Botão Hoje - Só aparece se não estiver no mês atual */}
        {!isHoje && (
          <Button
            variant="outline"
            size="sm"
            onClick={voltarParaHoje}
            className="ml-2 h-8 text-xs"
            title="Voltar para o mês atual"
          >
            <Home size={14} className="mr-1" />
            Hoje
          </Button>
        )}
      </div>

      {/* Versão Mobile - Compacta */}
      <div className="md:hidden flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 shadow-sm">
        <Button
          variant="ghost"
          size="icon"
          onClick={voltarMes}
          className="h-7 w-7"
        >
          <ChevronLeft size={16} />
        </Button>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              className={`
                text-sm font-semibold px-2
                ${isHoje ? 'text-blue-600' : 'text-gray-900 dark:text-white'}
              `}
            >
              {mesesAbreviados[mesSelecionado]}/{anoSelecionado}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-4" align="center">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm">Período</h4>
                {!isHoje && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={voltarParaHoje}
                    className="h-7 text-xs"
                  >
                    Hoje
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block">Mês</label>
                  <Select
                    value={mesSelecionado.toString()}
                    onValueChange={(v) => setMesSelecionado(parseInt(v))}
                  >
                    <SelectTrigger className="h-9">
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
                  <label className="text-xs font-medium mb-1 block">Ano</label>
                  <Select
                    value={anoSelecionado.toString()}
                    onValueChange={(v) => setAnoSelecionado(parseInt(v))}
                  >
                    <SelectTrigger className="h-9">
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
        >
          <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  );
}