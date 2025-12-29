"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, X, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface FiltrosExtratoState {
  inicio: string;
  fim: string;
  tipo: string;
  origem: string;
}

interface Props {
  filtros: FiltrosExtratoState;
  onFiltrosChange: (filtros: FiltrosExtratoState) => void;
  onAplicar: () => void;
}

export default function FiltrosExtrato({ filtros, onFiltrosChange, onAplicar }: Props) {
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  const updateFiltro = (key: keyof FiltrosExtratoState, value: string) => {
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
            className="flex items-center gap-2 p-0 h-auto hover:bg-transparent"
          >
            <Filter className="h-5 w-5" />
            <CardTitle className="text-base">Filtros</CardTitle>
            {temFiltrosAtivos && (
              <Badge variant="default" className="ml-2">
                {contarFiltrosAtivos()}
              </Badge>
            )}
            {mostrarFiltros ? (
              <ChevronUp className="h-4 w-4 ml-1" />
            ) : (
              <ChevronDown className="h-4 w-4 ml-1" />
            )}
          </Button>

          {temFiltrosAtivos && (
            <Button variant="ghost" size="sm" onClick={limparFiltros}>
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
              <label className="text-sm font-medium mb-2 block">Data Início</label>
              <Input
                type="date"
                value={filtros.inicio}
                onChange={(e) => updateFiltro("inicio", e.target.value)}
              />
            </div>

            {/* Data Fim */}
            <div>
              <label className="text-sm font-medium mb-2 block">Data Fim</label>
              <Input
                type="date"
                value={filtros.fim}
                onChange={(e) => updateFiltro("fim", e.target.value)}
              />
            </div>

            {/* Tipo */}
            <div>
              <label className="text-sm font-medium mb-2 block">Tipo</label>
              <Select value={filtros.tipo} onValueChange={(v) => updateFiltro("tipo", v)}>
                <SelectTrigger>
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
              <label className="text-sm font-medium mb-2 block">Origem</label>
              <Select value={filtros.origem} onValueChange={(v) => updateFiltro("origem", v)}>
                <SelectTrigger>
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
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              {filtros.inicio && (
                <Badge variant="secondary" className="gap-1">
                  Início: {new Date(filtros.inicio).toLocaleDateString("pt-BR")}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => updateFiltro("inicio", "")}
                  />
                </Badge>
              )}
              {filtros.fim && (
                <Badge variant="secondary" className="gap-1">
                  Fim: {new Date(filtros.fim).toLocaleDateString("pt-BR")}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => updateFiltro("fim", "")}
                  />
                </Badge>
              )}
              {filtros.tipo !== "TODOS" && (
                <Badge variant="secondary" className="gap-1">
                  Tipo: {filtros.tipo === "entrada" ? "Entradas" : "Saídas"}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => updateFiltro("tipo", "TODOS")}
                  />
                </Badge>
              )}
              {filtros.origem !== "TODAS" && (
                <Badge variant="secondary" className="gap-1">
                  Origem: {filtros.origem.replace("_", " ")}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => updateFiltro("origem", "TODAS")}
                  />
                </Badge>
              )}
            </div>
          )}

          {/* Botão Aplicar */}
          <Button className="w-full" onClick={onAplicar}>
            Aplicar Filtros
          </Button>
        </CardContent>
      )}
    </Card>
  );
}