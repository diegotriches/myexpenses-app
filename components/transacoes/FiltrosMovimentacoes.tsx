"use client";

import { useState, type ReactNode } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { InputMoeda } from "@/components/ui/input-moeda";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, X, Filter } from "lucide-react";
import { useEstabelecimentos } from "@/hooks/useEstabelecimentos";
import { formatarMoeda } from "@/utils/formatadores";
import type { FiltroTipo } from "@/utils/filtroMovimentacao";

export interface FiltrosState {
  /** Seletor Todas / Receitas / Despesas (estornos entram em Despesas) */
  tipo: FiltroTipo;
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
  /** Botões extras no fim da linha da busca, depois de Filtros (ex.: Nova Movimentação) */
  acoes?: ReactNode;
  /** Quantas movimentações cada opção do seletor mostraria, já com os outros filtros aplicados */
  contagemTipo: Record<FiltroTipo, number>;
}

const OPCOES_TIPO: { valor: FiltroTipo; rotulo: string }[] = [
  { valor: "todas", rotulo: "Todas" },
  { valor: "entrada", rotulo: "Receitas" },
  { valor: "saida", rotulo: "Despesas" },
];

export default function FiltrosMovimentacoes({
  filtros,
  onFiltrosChange,
  categorias,
  formasPagamento,
  acoes,
  contagemTipo,
}: Props) {
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const { data: estabelecimentos = [] } = useEstabelecimentos();

  const updateFiltro = (key: keyof FiltrosState, value: string) => {
    onFiltrosChange({ ...filtros, [key]: value });
  };

  const limparFiltros = () => {
    onFiltrosChange({
      tipo:              filtros.tipo,
      categoria:         "",
      formaPagamento:    "",
      estabelecimentoId: "",
      busca:             "",
      valorMin:          "",
      valorMax:          "",
    });
  };

  // O tipo não conta aqui: o seletor fora do painel já mostra a escolha
  const temFiltrosAtivos =
    (filtros.categoria         !== "" && filtros.categoria         !== "all") ||
    (filtros.formaPagamento    !== "" && filtros.formaPagamento    !== "all") ||
    (filtros.estabelecimentoId !== "" && filtros.estabelecimentoId !== "all") ||
    filtros.busca    !== "" ||
    filtros.valorMin !== "" ||
    filtros.valorMax !== "";

  const contarFiltrosAtivos = () => {
    let count = 0;
    if (filtros.categoria         && filtros.categoria         !== "all") count++;
    if (filtros.formaPagamento    && filtros.formaPagamento    !== "all") count++;
    if (filtros.estabelecimentoId && filtros.estabelecimentoId !== "all") count++;
    if (filtros.busca) count++;
    if (filtros.valorMin || filtros.valorMax) count++;
    return count;
  };

  // Campo vazio fica vazio, em vez de "R$ 0,00"
  const formatarFiltro = (valor: string) => (valor ? formatarMoeda(valor) : "");

  const renderSeletorTipo = (className: string) => (
    <Tabs value={filtros.tipo} onValueChange={(v) => updateFiltro("tipo", v)} className={className}>
      <TabsList aria-label="Tipo de movimentação" className="h-9 w-full lg:w-auto dark:bg-gray-800">
        {OPCOES_TIPO.map((o) => (
          <TabsTrigger key={o.valor} value={o.valor} className="px-3 dark:data-[state=active]:bg-gray-950">
            {o.rotulo}
            <span className="text-xs tabular-nums text-muted-foreground">{contagemTipo[o.valor]}</span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );

  const nomeEstabelecimentoSelecionado =
    estabelecimentos.find((e) => e.id === filtros.estabelecimentoId)?.nome ?? "";

  return (
    <div className="space-y-3">
      {/* Busca, seletor de tipo (a partir de 1024 px), Filtros e ações */}
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

        {renderSeletorTipo("hidden lg:flex")}

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

        {acoes}
      </div>

      {/* Abaixo de 1024 px o seletor ganha linha própria, para a busca não ficar espremida */}
      {renderSeletorTipo("lg:hidden")}

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

          {/* Grid de filtros — celular: selects em linha inteira e valores lado a lado; a partir de 768 px, 3 colunas.
              O tipo fica no seletor fora do painel */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {/* Categoria */}
            <div className="col-span-2 md:col-span-1">
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
              <InputMoeda placeholder="0,00" value={filtros.valorMin} onChange={(v) => updateFiltro("valorMin", v)} />
            </div>

            {/* Valor máximo */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Valor máx. (R$)</label>
              <InputMoeda placeholder="0,00" value={filtros.valorMax} onChange={(v) => updateFiltro("valorMax", v)} />
            </div>
          </div>

          {/* Tags de filtros ativos */}
          {temFiltrosAtivos && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
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
                  Busca: &quot;{filtros.busca}&quot;
                  <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => updateFiltro("busca", "")} />
                </Badge>
              )}
              {(filtros.valorMin || filtros.valorMax) && (
                <Badge variant="secondary" className="gap-1">
                  Valor:{" "}
                  {filtros.valorMin && filtros.valorMax
                    ? `${formatarFiltro(filtros.valorMin)} até ${formatarFiltro(filtros.valorMax)}`
                    : filtros.valorMin
                    ? `a partir de ${formatarFiltro(filtros.valorMin)}`
                    : `até ${formatarFiltro(filtros.valorMax)}`}
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