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
import { useEstabelecimentos } from "@/hooks/useEstabelecimentos";

export interface FiltrosState {
  tipo: "todas" | "entrada" | "saida";
  categoria: string;
  formaPagamento: string;
  estabelecimentoId: string;
  busca: string;
  valorMin: string;
  valorMax: string;
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
  const { data: estabelecimentos = [] } = useEstabelecimentos();

  const updateFiltro = (key: keyof FiltrosState, value: string) => {
    onFiltrosChange({ ...filtros, [key]: value });
  };

  const limparFiltros = () => {
    onFiltrosChange({
      tipo:              "todas",
      categoria:         "",
      formaPagamento:    "",
      estabelecimentoId: "",
      busca:             "",
      valorMin:          "",
      valorMax:          "",
    });
  };

  const temFiltrosAtivos =
    filtros.tipo !== "todas" ||
    (filtros.categoria         !== "" && filtros.categoria         !== "all") ||
    (filtros.formaPagamento    !== "" && filtros.formaPagamento    !== "all") ||
    (filtros.estabelecimentoId !== "" && filtros.estabelecimentoId !== "all") ||
    filtros.busca    !== "" ||
    filtros.valorMin !== "" ||
    filtros.valorMax !== "";

  const contarFiltrosAtivos = () => {
    let count = 0;
    if (filtros.tipo !== "todas") count++;
    if (filtros.categoria         && filtros.categoria         !== "all") count++;
    if (filtros.formaPagamento    && filtros.formaPagamento    !== "all") count++;
    if (filtros.estabelecimentoId && filtros.estabelecimentoId !== "all") count++;
    if (filtros.busca) count++;
    if (filtros.valorMin || filtros.valorMax) count++;
    return count;
  };

  const formatarMoeda = (valor: string) => {
    if (!valor) return "";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(parseFloat(valor));
  };

  const nomeEstabelecimentoSelecionado =
    estabelecimentos.find((e) => e.id === filtros.estabelecimentoId)?.nome ?? "";

  return (
    <div className="space-y-3">
      {/* Barra de busca + botão filtros */}
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
            <Badge variant="destructive" className="ml-2 px-1.5 py-0 h-5 min-w-[20px] flex items-center justify-center">
              {contarFiltrosAtivos()}
            </Badge>
          )}
        </Button>
      </div>

      {/* Painel expansível */}
      {mostrarFiltros && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3 bg-muted/50 dark:bg-gray-800/50">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">Filtros Avançados</h3>
            {temFiltrosAtivos && (
              <Button variant="ghost" size="sm" onClick={limparFiltros} className="h-8 px-2 text-xs">
                <X className="h-3 w-3 mr-1" />
                Limpar tudo
              </Button>
            )}
          </div>

          {/* Grid de filtros — 2 colunas mobile / 3 desktop (linha 1) + 3 desktop (linha 2) */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {/* Tipo */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Tipo</label>
              <Select value={filtros.tipo} onValueChange={(v) => updateFiltro("tipo", v)}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                  <SelectItem value="todas">Todas</SelectItem>
                  <SelectItem value="entrada">Receitas</SelectItem>
                  <SelectItem value="saida">Despesas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Categoria */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Categoria</label>
              <Select
                value={filtros.categoria || "all"}
                onValueChange={(v) => updateFiltro("categoria", v === "all" ? "" : v)}
              >
                <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                  <SelectItem value="all">Todas</SelectItem>
                  {categorias.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Forma de Pagamento */}
            <div className="col-span-2 md:col-span-1">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Forma de Pagamento</label>
              <Select
                value={filtros.formaPagamento || "all"}
                onValueChange={(v) => updateFiltro("formaPagamento", v === "all" ? "" : v)}
              >
                <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                  <SelectItem value="all">Todas</SelectItem>
                  {formasPagamento.map((forma) => (
                    <SelectItem key={forma} value={forma}>
                      {forma === "dinheiro" ? "Dinheiro" : forma === "pix" ? "PIX" : forma === "cartao" ? "Cartão" : forma}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Estabelecimento */}
            {estabelecimentos.length > 0 && (
              <div className="col-span-2 md:col-span-1">
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Estabelecimento</label>
                <Select
                  value={filtros.estabelecimentoId || "all"}
                  onValueChange={(v) => updateFiltro("estabelecimentoId", v === "all" ? "" : v)}
                >
                  <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                    <SelectItem value="all">Todos</SelectItem>
                    {estabelecimentos.map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Valor mínimo */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Valor mín. (R$)</label>
              <Input type="number" min="0" step="0.01" placeholder="0,00" value={filtros.valorMin} onChange={(e) => updateFiltro("valorMin", e.target.value)} />
            </div>

            {/* Valor máximo */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Valor máx. (R$)</label>
              <Input type="number" min="0" step="0.01" placeholder="0,00" value={filtros.valorMax} onChange={(e) => updateFiltro("valorMax", e.target.value)} />
            </div>
          </div>

          {/* Tags de filtros ativos */}
          {temFiltrosAtivos && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              {filtros.tipo !== "todas" && (
                <Badge variant="secondary" className="gap-1">
                  Tipo: {filtros.tipo === "entrada" ? "Receitas" : "Despesas"}
                  <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => updateFiltro("tipo", "todas")} />
                </Badge>
              )}
              {filtros.categoria && filtros.categoria !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  Categoria: {filtros.categoria}
                  <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => updateFiltro("categoria", "")} />
                </Badge>
              )}
              {filtros.formaPagamento && filtros.formaPagamento !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  Pagamento: {filtros.formaPagamento}
                  <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => updateFiltro("formaPagamento", "")} />
                </Badge>
              )}
              {filtros.estabelecimentoId && filtros.estabelecimentoId !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  Local: {nomeEstabelecimentoSelecionado}
                  <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => updateFiltro("estabelecimentoId", "")} />
                </Badge>
              )}
              {filtros.busca && (
                <Badge variant="secondary" className="gap-1">
                  Busca: "{filtros.busca}"
                  <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => updateFiltro("busca", "")} />
                </Badge>
              )}
              {(filtros.valorMin || filtros.valorMax) && (
                <Badge variant="secondary" className="gap-1">
                  Valor:{" "}
                  {filtros.valorMin && filtros.valorMax
                    ? `${formatarMoeda(filtros.valorMin)} até ${formatarMoeda(filtros.valorMax)}`
                    : filtros.valorMin
                    ? `a partir de ${formatarMoeda(filtros.valorMin)}`
                    : `até ${formatarMoeda(filtros.valorMax)}`}
                  <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => onFiltrosChange({ ...filtros, valorMin: "", valorMax: "" })} />
                </Badge>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}