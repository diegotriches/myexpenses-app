"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, X, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// ✅ Tipos mais específicos
export type TipoFiltro = "TODOS" | "entrada" | "saida";
export type OrigemFiltro = "TODAS" | "TRANSACAO_MANUAL" | "TRANSFERENCIA" | "AJUSTE" | "ESTORNO" | "PAGAMENTO_FATURA";

export interface FiltrosExtratoState {
  inicio: string;
  fim: string;
  tipo: TipoFiltro;
  origem: OrigemFiltro;
}

interface Props {
  filtros: FiltrosExtratoState;
  onFiltrosChange: (filtros: FiltrosExtratoState) => void;
  onAplicar?: () => void;
}

export default function FiltrosExtrato({ filtros, onFiltrosChange, onAplicar }: Props) {
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  const updateFiltro = <K extends keyof FiltrosExtratoState>(
    key: K,
    value: FiltrosExtratoState[K]
  ) => {
    onFiltrosChange({ ...filtros, [key]: value });
  };

  const limparFiltros = () => {
    onFiltrosChange({
      inicio: "",
      fim: "",
      tipo: "TODOS",
      origem: "TODAS",
    });
  };

  const temFiltrosAtivos =
    filtros.inicio !== "" ||
    filtros.fim !== "" ||
    filtros.tipo !== "TODOS" ||
    filtros.origem !== "TODAS";

  const contarFiltrosAtivos = () => {
    let count = 0;
    if (filtros.inicio) count++;
    if (filtros.fim) count++;
    if (filtros.tipo !== "TODOS") count++;
    if (filtros.origem !== "TODAS") count++;
    return count;
  };

  // Helper para formatar nomes de origem
  const formatarOrigem = (origem: string): string => {
    const nomes: Record<string, string> = {
      TRANSACAO_MANUAL: "Transações",
      TRANSFERENCIA: "Transferências",
      AJUSTE: "Ajustes",
      ESTORNO: "Estornos",
      PAGAMENTO_FATURA: "Pagamento Fatura",
    };
    return nomes[origem] || origem.replace("_", " ");
  };

  // ✅ NOVO: Formatar data com validação
  const formatarData = (dataStr: string): string => {
    try {
      const data = new Date(dataStr + 'T00:00:00'); // Evita timezone issues
      return data.toLocaleDateString("pt-BR");
    } catch {
      return dataStr;
    }
  };

  return (
    <Card className="dark:bg-gray-800 dark:border-gray-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
            className="flex items-center gap-2 p-0 h-auto hover:bg-transparent dark:hover:bg-transparent"
          >
            <Filter className="h-5 w-5 text-gray-700 dark:text-gray-300" />
            <CardTitle className="text-base text-gray-900 dark:text-white">Filtros</CardTitle>
            {temFiltrosAtivos && (
              <Badge variant="default" className="ml-2">
                {contarFiltrosAtivos()}
              </Badge>
            )}
            {mostrarFiltros ? (
              <ChevronUp className="h-4 w-4 ml-1 text-gray-700 dark:text-gray-300" />
            ) : (
              <ChevronDown className="h-4 w-4 ml-1 text-gray-700 dark:text-gray-300" />
            )}
          </Button>

          {temFiltrosAtivos && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={limparFiltros}
              className="dark:hover:bg-gray-700"
            >
              <X className="h-4 w-4 mr-1" />
              Limpar
            </Button>
          )}
        </div>
      </CardHeader>

      {mostrarFiltros && (
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Data Início */}
            <div>
              <label className="text-sm font-medium mb-2 block text-gray-700 dark:text-gray-300">
                Data Início
              </label>
              <Input
                type="date"
                value={filtros.inicio}
                onChange={(e) => updateFiltro("inicio", e.target.value)}
                className="dark:bg-gray-900 dark:border-gray-600 dark:text-white"
              />
            </div>

            {/* Data Fim */}
            <div>
              <label className="text-sm font-medium mb-2 block text-gray-700 dark:text-gray-300">
                Data Fim
              </label>
              <Input
                type="date"
                value={filtros.fim}
                onChange={(e) => updateFiltro("fim", e.target.value)}
                className="dark:bg-gray-900 dark:border-gray-600 dark:text-white"
              />
            </div>

            {/* Tipo */}
            <div>
              <label className="text-sm font-medium mb-2 block text-gray-700 dark:text-gray-300">
                Tipo
              </label>
              <Select 
                value={filtros.tipo} 
                onValueChange={(v) => updateFiltro("tipo", v as TipoFiltro)}
              >
                <SelectTrigger className="dark:bg-gray-900 dark:border-gray-600 dark:text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos</SelectItem>
                  <SelectItem value="entrada">Apenas Entradas</SelectItem>
                  <SelectItem value="saida">Apenas Saídas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Origem */}
            <div>
              <label className="text-sm font-medium mb-2 block text-gray-700 dark:text-gray-300">
                Origem
              </label>
              <Select 
                value={filtros.origem} 
                onValueChange={(v) => updateFiltro("origem", v as OrigemFiltro)}
              >
                <SelectTrigger className="dark:bg-gray-900 dark:border-gray-600 dark:text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODAS">Todas</SelectItem>
                  <SelectItem value="TRANSACAO_MANUAL">Transações</SelectItem>
                  <SelectItem value="TRANSFERENCIA">Transferências</SelectItem>
                  <SelectItem value="AJUSTE">Ajustes</SelectItem>
                  <SelectItem value="ESTORNO">Estornos</SelectItem>
                  <SelectItem value="PAGAMENTO_FATURA">Pagamento Fatura</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tags de filtros ativos */}
          {temFiltrosAtivos && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              {filtros.inicio && (
                <Badge 
                  variant="secondary" 
                  className="gap-1 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                >
                  Início: {formatarData(filtros.inicio)}
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-red-600 dark:hover:text-red-400"
                    onClick={() => updateFiltro("inicio", "")}
                  />
                </Badge>
              )}
              {filtros.fim && (
                <Badge 
                  variant="secondary" 
                  className="gap-1 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                >
                  Fim: {formatarData(filtros.fim)}
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-red-600 dark:hover:text-red-400"
                    onClick={() => updateFiltro("fim", "")}
                  />
                </Badge>
              )}
              {filtros.tipo !== "TODOS" && (
                <Badge 
                  variant="secondary" 
                  className="gap-1 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                >
                  Tipo: {filtros.tipo === "entrada" ? "Entradas" : "Saídas"}
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-red-600 dark:hover:text-red-400"
                    onClick={() => updateFiltro("tipo", "TODOS")}
                  />
                </Badge>
              )}
              {filtros.origem !== "TODAS" && (
                <Badge 
                  variant="secondary" 
                  className="gap-1 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                >
                  Origem: {formatarOrigem(filtros.origem)}
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-red-600 dark:hover:text-red-400"
                    onClick={() => updateFiltro("origem", "TODAS")}
                  />
                </Badge>
              )}
            </div>
          )}

          {/* Botão Aplicar ou Info de filtros automáticos */}
          {onAplicar ? (
            <Button className="w-full" onClick={onAplicar}>
              Aplicar Filtros
            </Button>
          ) : (
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center pt-2">
              ✨ Os filtros são aplicados automaticamente
            </p>
          )}
        </CardContent>
      )}
    </Card>
  );
}