"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputMoeda } from "@/components/ui/input-moeda";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, X, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export type TipoFiltro   = "TODOS"  | "entrada" | "saida";
// ✅ NOVO: APLICACAO e RESGATE_APLICACAO adicionados
export type OrigemFiltro =
  | "TODAS"
  | "TRANSACAO_MANUAL"
  | "TRANSFERENCIA"
  | "AJUSTE"
  | "ESTORNO"
  | "PAGAMENTO_FATURA"
  | "APLICACAO"
  | "RESGATE_APLICACAO";

export interface FiltrosExtratoState {
  inicio:   string;
  fim:      string;
  tipo:     TipoFiltro;
  origem:   OrigemFiltro;
  valorMin: string;
  valorMax: string;
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
  ) => onFiltrosChange({ ...filtros, [key]: value });

  const limparFiltros = () =>
    onFiltrosChange({ inicio: "", fim: "", tipo: "TODOS", origem: "TODAS", valorMin: "", valorMax: "" });

  const temFiltrosAtivos =
    filtros.inicio !== "" || filtros.fim !== "" ||
    filtros.tipo !== "TODOS" || filtros.origem !== "TODAS" ||
    filtros.valorMin !== "" || filtros.valorMax !== "";

  const contarFiltrosAtivos = () => {
    let count = 0;
    if (filtros.inicio) count++;
    if (filtros.fim) count++;
    if (filtros.tipo !== "TODOS") count++;
    if (filtros.origem !== "TODAS") count++;
    if (filtros.valorMin !== "" || filtros.valorMax !== "") count++;
    return count;
  };

  const formatarOrigem = (origem: string): string => {
    const nomes: Record<string, string> = {
      TRANSACAO_MANUAL:  "Transações",
      TRANSFERENCIA:     "Transferências",
      AJUSTE:            "Ajustes",
      ESTORNO:           "Estornos",
      PAGAMENTO_FATURA:  "Pag. Fatura",
      APLICACAO:         "Aplicações",  // ✅ NOVO
      RESGATE_APLICACAO: "Resgates",    // ✅ NOVO
    };
    return nomes[origem] || origem.replace("_", " ");
  };

  const formatarData = (dataStr: string): string => {
    try {
      return new Date(dataStr + "T00:00:00").toLocaleDateString("pt-BR");
    } catch {
      return dataStr;
    }
  };

  const labelValorFaixa = () => {
    if (filtros.valorMin && filtros.valorMax) return `R$ ${filtros.valorMin} – R$ ${filtros.valorMax}`;
    if (filtros.valorMin) return `a partir de R$ ${filtros.valorMin}`;
    return `até R$ ${filtros.valorMax}`;
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
              <Badge variant="default" className="ml-2">{contarFiltrosAtivos()}</Badge>
            )}
            {mostrarFiltros
              ? <ChevronUp   className="h-4 w-4 ml-1 text-gray-700 dark:text-gray-300" />
              : <ChevronDown className="h-4 w-4 ml-1 text-gray-700 dark:text-gray-300" />
            }
          </Button>

          {temFiltrosAtivos && (
            <Button variant="ghost" size="sm" onClick={limparFiltros} className="dark:hover:bg-gray-700">
              <X className="h-4 w-4 mr-1" /> Limpar
            </Button>
          )}
        </div>
      </CardHeader>

      {mostrarFiltros && (
        <CardContent className="space-y-4">
          {/* Linha 1: datas + tipo + origem */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
            <div>
              <label className="text-sm font-medium mb-2 block text-gray-700 dark:text-gray-300">
                Tipo
              </label>
              <Select value={filtros.tipo} onValueChange={(v) => updateFiltro("tipo", v as TipoFiltro)}>
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
            <div>
              <label className="text-sm font-medium mb-2 block text-gray-700 dark:text-gray-300">
                Origem
              </label>
              <Select value={filtros.origem} onValueChange={(v) => updateFiltro("origem", v as OrigemFiltro)}>
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
                  {/* ✅ NOVO */}
                  <SelectItem value="APLICACAO">Aplicações</SelectItem>
                  <SelectItem value="RESGATE_APLICACAO">Resgates</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Linha 2: faixa de valor */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block text-gray-700 dark:text-gray-300">
                Valor mín. (R$)
              </label>
              <InputMoeda
                placeholder="0,00"
                value={filtros.valorMin}
                onChange={(v) => updateFiltro("valorMin", v)}
                className="dark:bg-gray-900 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block text-gray-700 dark:text-gray-300">
                Valor máx. (R$)
              </label>
              <InputMoeda
                placeholder="0,00"
                value={filtros.valorMax}
                onChange={(v) => updateFiltro("valorMax", v)}
                className="dark:bg-gray-900 dark:border-gray-600 dark:text-white"
              />
            </div>
          </div>

          {/* Tags de filtros ativos */}
          {temFiltrosAtivos && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              {filtros.inicio && (
                <Badge variant="secondary" className="gap-1 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">
                  Início: {formatarData(filtros.inicio)}
                  <X className="h-3 w-3 cursor-pointer hover:text-red-600 dark:hover:text-red-400"
                    onClick={() => updateFiltro("inicio", "")} />
                </Badge>
              )}
              {filtros.fim && (
                <Badge variant="secondary" className="gap-1 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">
                  Fim: {formatarData(filtros.fim)}
                  <X className="h-3 w-3 cursor-pointer hover:text-red-600 dark:hover:text-red-400"
                    onClick={() => updateFiltro("fim", "")} />
                </Badge>
              )}
              {filtros.tipo !== "TODOS" && (
                <Badge variant="secondary" className="gap-1 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">
                  Tipo: {filtros.tipo === "entrada" ? "Entradas" : "Saídas"}
                  <X className="h-3 w-3 cursor-pointer hover:text-red-600 dark:hover:text-red-400"
                    onClick={() => updateFiltro("tipo", "TODOS")} />
                </Badge>
              )}
              {filtros.origem !== "TODAS" && (
                <Badge variant="secondary" className="gap-1 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">
                  Origem: {formatarOrigem(filtros.origem)}
                  <X className="h-3 w-3 cursor-pointer hover:text-red-600 dark:hover:text-red-400"
                    onClick={() => updateFiltro("origem", "TODAS")} />
                </Badge>
              )}
              {(filtros.valorMin !== "" || filtros.valorMax !== "") && (
                <Badge variant="secondary" className="gap-1 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">
                  Valor: {labelValorFaixa()}
                  <X className="h-3 w-3 cursor-pointer hover:text-red-600 dark:hover:text-red-400"
                    onClick={() => onFiltrosChange({ ...filtros, valorMin: "", valorMax: "" })} />
                </Badge>
              )}
            </div>
          )}

          {onAplicar ? (
            <Button className="w-full" onClick={onAplicar}>Aplicar Filtros</Button>
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