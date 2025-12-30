"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, X, Filter } from "lucide-react";

export interface FiltrosState {
  tipo: "todas" | "entrada" | "saida";
  categoria: string;
  formaPagamento: string;
  busca: string;
}

interface Props {
  filtros: FiltrosState;
  onFiltrosChange: (filtros: FiltrosState) => void;
  categorias: string[];
  formasPagamento: string[];
}

export default function FiltrosMovimentacoes({
  filtros,
  onFiltrosChange,
  categorias,
  formasPagamento,
}: Props) {
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  const updateFiltro = (key: keyof FiltrosState, value: string) => {
    onFiltrosChange({ ...filtros, [key]: value });
  };

  const limparFiltros = () => {
    onFiltrosChange({
      tipo: "todas",
      categoria: "all", // ✅ Mudado de "" para "all"
      formaPagamento: "all", // ✅ Mudado de "" para "all"
      busca: "",
    });
  };

  const temFiltrosAtivos = 
    filtros.tipo !== "todas" ||
    (filtros.categoria !== "" && filtros.categoria !== "all") || // ✅ Verifica também "all"
    (filtros.formaPagamento !== "" && filtros.formaPagamento !== "all") || // ✅ Verifica também "all"
    filtros.busca !== "";

  const contarFiltrosAtivos = () => {
    let count = 0;
    if (filtros.tipo !== "todas") count++;
    if (filtros.categoria && filtros.categoria !== "all") count++; // ✅ Verifica também "all"
    if (filtros.formaPagamento && filtros.formaPagamento !== "all") count++; // ✅ Verifica também "all"
    if (filtros.busca) count++;
    return count;
  };

  return (
    <div className="space-y-3">
      {/* Barra de busca e botão de filtros */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por descrição..."
            value={filtros.busca}
            onChange={(e) => updateFiltro("busca", e.target.value)}
            className="pl-9"
          />
        </div>
        
        <Button
          variant={mostrarFiltros ? "default" : "outline"}
          onClick={() => setMostrarFiltros(!mostrarFiltros)}
          className="relative"
        >
          <Filter className="h-4 w-4 mr-2" />
          Filtros
          {temFiltrosAtivos && (
            <Badge 
              variant="destructive" 
              className="ml-2 px-1.5 py-0 h-5 min-w-[20px] flex items-center justify-center"
            >
              {contarFiltrosAtivos()}
            </Badge>
          )}
        </Button>
      </div>

      {/* Painel de filtros expansível */}
      {mostrarFiltros && (
        <div className="border rounded-lg p-4 space-y-3 bg-muted/50">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium">Filtros Avançados</h3>
            {temFiltrosAtivos && (
              <Button
                variant="ghost"
                size="sm"
                onClick={limparFiltros}
                className="h-8 px-2 text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                Limpar tudo
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Filtro de Tipo */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Tipo
              </label>
              <Select
                value={filtros.tipo}
                onValueChange={(v) => updateFiltro("tipo", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  <SelectItem value="entrada">Receitas</SelectItem>
                  <SelectItem value="saida">Despesas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filtro de Categoria */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Categoria
              </label>
              <Select
                value={filtros.categoria || "all"} // ✅ Fallback para "all"
                onValueChange={(v) => updateFiltro("categoria", v === "all" ? "" : v)} // ✅ Converte "all" para ""
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem> {/* ✅ Mudado de "" para "all" */}
                  {categorias.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro de Forma de Pagamento */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Forma de Pagamento
              </label>
              <Select
                value={filtros.formaPagamento || "all"} // ✅ Fallback para "all"
                onValueChange={(v) => updateFiltro("formaPagamento", v === "all" ? "" : v)} // ✅ Converte "all" para ""
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem> {/* ✅ Mudado de "" para "all" */}
                  {formasPagamento.map((forma) => (
                    <SelectItem key={forma} value={forma}>
                      {forma === "dinheiro" ? "Dinheiro" : 
                       forma === "pix" ? "PIX" : 
                       forma === "cartao" ? "Cartão" : forma}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tags de filtros ativos */}
          {temFiltrosAtivos && (
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              {filtros.tipo !== "todas" && (
                <Badge variant="secondary" className="gap-1">
                  Tipo: {filtros.tipo === "entrada" ? "Receitas" : "Despesas"}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => updateFiltro("tipo", "todas")}
                  />
                </Badge>
              )}
              {filtros.categoria && filtros.categoria !== "all" && ( // ✅ Verifica também "all"
                <Badge variant="secondary" className="gap-1">
                  Categoria: {filtros.categoria}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => updateFiltro("categoria", "")}
                  />
                </Badge>
              )}
              {filtros.formaPagamento && filtros.formaPagamento !== "all" && ( // ✅ Verifica também "all"
                <Badge variant="secondary" className="gap-1">
                  Pagamento: {filtros.formaPagamento}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => updateFiltro("formaPagamento", "")}
                  />
                </Badge>
              )}
              {filtros.busca && (
                <Badge variant="secondary" className="gap-1">
                  Busca: "{filtros.busca}"
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => updateFiltro("busca", "")}
                  />
                </Badge>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}