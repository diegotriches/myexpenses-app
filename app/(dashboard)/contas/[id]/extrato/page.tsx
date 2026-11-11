"use client";

import { useState, useMemo, Fragment } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  TrendingUp, TrendingDown,
  ChevronUp, ChevronDown, ChevronsUpDown, Info,
} from "lucide-react";
import { Badge }   from "@/components/ui/badge";
import { BsBank }  from "react-icons/bs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import FiltrosExtrato, { FiltrosExtratoState } from "@/components/extrato/FiltrosExtrato";
import { useExtratoConta } from "@/hooks/useContas";
import type { MovimentacaoExtrato } from "@/types/conta";
import { formatarDataParaExibicao } from "@/utils/dateUtils";
import { useMoeda } from "@/hooks/useMoeda";
import { PageHeader } from "@/components/common/PageHeader";

// ─── Constantes ───────────────────────────────────────────────────────────────
const ITENS_POR_PAGINA = 20;

type ColunaOrdenacao  = "data" | "valor" | "saldo";
type DirecaoOrdenacao = "asc" | "desc" | null;

interface EstadoOrdenacao {
  coluna:  ColunaOrdenacao | null;
  direcao: DirecaoOrdenacao;
}

// Mapeia cada origem para como o usuário deve corrigir aquele lançamento
const ORIGEM_INFO: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; dica: string }> = {
  TRANSACAO_MANUAL: {
    label:   "Transação",
    variant: "default",
    dica:    "Para corrigir, edite ou exclua a transação em Movimentações.",
  },
  TRANSFERENCIA: {
    label:   "Transferência",
    variant: "secondary",
    dica:    "Para corrigir, exclua a transferência na página de Transferências.",
  },
  PAGAMENTO_FATURA: {
    label:   "Pag. Fatura",
    variant: "default",
    dica:    "Para corrigir, cancele o pagamento na página da Fatura do cartão.",
  },
  ESTORNO: {
    label:   "Estorno",
    variant: "destructive",
    dica:    "Registro gerado automaticamente por um cancelamento. Não pode ser removido isoladamente.",
  },
  AJUSTE: {
    label:   "Ajuste",
    variant: "outline",
    dica:    "Ajuste manual de saldo. Entre em contato com o suporte se necessário.",
  },
  // ✅ NOVO
  APLICACAO: {
    label:   "Aplicação",
    variant: "secondary",
    dica:    "Para desfazer, resgate a aplicação na página de Aplicações.",
  },
  RESGATE_APLICACAO: {
    label:   "Resgate",
    variant: "secondary",
    dica:    "Gerado automaticamente ao resgatar uma aplicação (manual ou no vencimento). Não pode ser revertido.",
  },
};

function IconeOrdenacao({ coluna, estado }: { coluna: ColunaOrdenacao; estado: EstadoOrdenacao }) {
  if (estado.coluna !== coluna)
    return <ChevronsUpDown className="h-3.5 w-3.5 ml-1 opacity-40" />;
  if (estado.direcao === "asc")
    return <ChevronUp className="h-3.5 w-3.5 ml-1 text-blue-600 dark:text-blue-400" />;
  return <ChevronDown className="h-3.5 w-3.5 ml-1 text-blue-600 dark:text-blue-400" />;
}

export default function ExtratoContaPage() {
  const params   = useParams();
  const router   = useRouter();
  const contaId  = params?.id as string;

  const [pagina,    setPagina]    = useState(1);
  const [ordenacao, setOrdenacao] = useState<EstadoOrdenacao>({ coluna: null, direcao: null });
  const [filtros,   setFiltros]   = useState<FiltrosExtratoState>({
    inicio: "", fim: "", tipo: "TODOS", origem: "TODAS", valorMin: "", valorMax: "",
  });

  const handleFiltrosChange = (novosFiltros: FiltrosExtratoState) => {
    setFiltros(novosFiltros);
    setPagina(1);
  };

  const filtrosQuery = useMemo(() => {
    const p: Record<string, string> = {};
    if (filtros.inicio)             p.inicio = filtros.inicio;
    if (filtros.fim)                p.fim    = filtros.fim;
    if (filtros.tipo !== "TODOS")   p.tipo   = filtros.tipo;
    if (filtros.origem !== "TODAS") p.origem = filtros.origem;
    return p;
  }, [filtros]);

  const { data: extratoData, isLoading: loading, error } = useExtratoConta(contaId, filtrosQuery);

  const extratoBase = useMemo(() => extratoData?.movimentacoes ?? [], [extratoData]);
  const resumo      = extratoData?.resumo;
  const contaNome   = extratoData?.conta?.nome ?? "";

  const extratoFiltrado = useMemo(() => extratoBase.filter((item) => {
    if (filtros.valorMin !== "") {
      const min = parseFloat(filtros.valorMin);
      if (!isNaN(min) && item.valor < min) return false;
    }
    if (filtros.valorMax !== "") {
      const max = parseFloat(filtros.valorMax);
      if (!isNaN(max) && item.valor > max) return false;
    }
    return true;
  }), [extratoBase, filtros.valorMin, filtros.valorMax]);

  const extratoOrdenado = useMemo(() => {
    if (!ordenacao.coluna || !ordenacao.direcao) return extratoFiltrado;
    return [...extratoFiltrado].sort((a, b) => {
      let diff = 0;
      if (ordenacao.coluna === "data")  diff = new Date(a.data).getTime() - new Date(b.data).getTime();
      if (ordenacao.coluna === "valor") diff = a.valor - b.valor;
      if (ordenacao.coluna === "saldo") diff = a.saldoApos - b.saldoApos;
      return ordenacao.direcao === "asc" ? diff : -diff;
    });
  }, [extratoFiltrado, ordenacao]);

  const totalPaginas  = Math.max(1, Math.ceil(extratoOrdenado.length / ITENS_POR_PAGINA));
  const extratoPagina = extratoOrdenado.slice((pagina - 1) * ITENS_POR_PAGINA, pagina * ITENS_POR_PAGINA);

  const alternarOrdenacao = (coluna: ColunaOrdenacao) => {
    setPagina(1);
    setOrdenacao((prev) => {
      if (prev.coluna !== coluna)  return { coluna, direcao: "desc" };
      if (prev.direcao === "desc") return { coluna, direcao: "asc" };
      return { coluna: null, direcao: null };
    });
  };

  const fmt = useMoeda();

  // Badge de origem com tooltip informando como corrigir
  const renderOrigemBadge = ({ origem }: { origem: string }) => {
    const info = ORIGEM_INFO[origem] ?? { label: origem, variant: "outline" as const, dica: "" };
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex items-center gap-1 cursor-help">
              <Badge variant={info.variant}>{info.label}</Badge>
              {info.dica && <Info size={11} className="text-gray-400 flex-shrink-0" />}
            </span>
          </TooltipTrigger>
          {info.dica && (
            <TooltipContent side="top" className="max-w-[220px] text-xs text-center">
              {info.dica}
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    );
  };

  const renderThOrdenavel = ({
    coluna, label, className,
  }: { coluna: ColunaOrdenacao; label: string; className?: string }) => (
    <th
      onClick={() => alternarOrdenacao(coluna)}
      className={`p-3 font-medium text-gray-900 dark:text-white cursor-pointer select-none
        hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${className ?? ""}`}
    >
      <span className="inline-flex items-center">
        {label}
        <IconeOrdenacao coluna={coluna} estado={ordenacao} />
      </span>
    </th>
  );

  // Card mobile
  const renderMovimentacaoCard = ({ item }: { item: MovimentacaoExtrato }) => (
    <Card className={`hover:shadow-md transition-shadow dark:border-gray-700 ${
      item.tipo === "entrada"
        ? "bg-green-50/40 dark:bg-green-950/10 border-green-200 dark:border-green-900"
        : "bg-red-50/40 dark:bg-red-950/10 border-red-200 dark:border-red-900"
    }`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {renderOrigemBadge({ origem: item.origem })}
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {formatarDataParaExibicao(item.data)}
              </span>
            </div>
            <p className="font-medium text-gray-900 dark:text-white">{item.descricao}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">Valor</p>
            <p className={`font-semibold ${
              item.tipo === "entrada" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
            }`}>
              {item.tipo === "entrada" ? "+" : "-"} {fmt(item.valor)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">Saldo após</p>
            <p className={`font-semibold ${
              item.saldoApos >= 0 ? "text-gray-900 dark:text-white" : "text-red-600 dark:text-red-400"
            }`}>
              {fmt(item.saldoApos)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="page-container p-4 md:p-6 space-y-6">

      <PageHeader
        onVoltar={() => router.back()}
        icone={BsBank}
        titulo="Extrato da Conta"
        descricao={contaNome || "Carregando..."}
      />

      {/* Resumo do Período */}
      {resumo && (
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-lg md:text-xl text-gray-900 dark:text-white">
              Resumo do Período
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { label: "Saldo Inicial", value: resumo.saldoInicial, color: "text-gray-900 dark:text-white" },
                { label: "Entradas", value: resumo.totalEntradas, color: "text-green-600 dark:text-green-400", icon: TrendingUp },
                { label: "Saídas",   value: resumo.totalSaidas,   color: "text-red-600 dark:text-red-400",   icon: TrendingDown },
                {
                  label: "Variação",
                  value: resumo.saldoFinal - resumo.saldoInicial,
                  color: (resumo.saldoFinal - resumo.saldoInicial) >= 0
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400",
                  prefix: (resumo.saldoFinal - resumo.saldoInicial) >= 0 ? "+" : "",
                },
                { label: "Saldo Final", value: resumo.saldoFinal, color: "text-gray-900 dark:text-white" },
              ].map(({ label, value, color, icon: Icon, prefix }) => (
                <div key={label}>
                  <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mb-1">{label}</p>
                  <p className={`text-base md:text-lg font-bold ${color} flex items-center gap-1`}>
                    {Icon && <Icon className="h-4 w-4" />}
                    {prefix}{fmt(value)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtros */}
      <FiltrosExtrato filtros={filtros} onFiltrosChange={handleFiltrosChange} />

      {/* Contador */}
      {!loading && !error && (
        <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
          {extratoFiltrado.length} movimentação{extratoFiltrado.length !== 1 ? "ões" : ""} encontrada{extratoFiltrado.length !== 1 ? "s" : ""}
        </p>
      )}

      {/* Erro */}
      {error && (
        <Card className="border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20">
          <CardContent className="p-6 text-center">
            <p className="text-red-600 dark:text-red-400 font-medium mb-2">Erro ao carregar extrato</p>
            <p className="text-sm text-red-500 dark:text-red-400 mb-4">{error.message}</p>
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}
              className="border-red-300 dark:border-red-700 dark:bg-red-950 dark:hover:bg-red-900">
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {loading && !error && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="animate-pulse dark:bg-gray-800 dark:border-gray-700">
              <CardContent className="p-4">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Vazio */}
      {!loading && !error && extratoFiltrado.length === 0 && (
        <Card className="border-dashed dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="p-12 text-center">
            <p className="text-gray-600 dark:text-gray-400 font-medium mb-1">
              Nenhuma movimentação encontrada
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Tente ajustar os filtros ou período selecionado
            </p>
          </CardContent>
        </Card>
      )}

      {/* Mobile: Cards */}
      {!loading && !error && extratoPagina.length > 0 && (
        <div className="md:hidden space-y-3">
          {extratoPagina.map((item) => <Fragment key={item.id}>{renderMovimentacaoCard({ item })}</Fragment>)}
        </div>
      )}

      {/* Desktop: Tabela */}
      {!loading && !error && extratoPagina.length > 0 && (
        <Card className="hidden md:block dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm table-fixed">
                <colgroup>
                  <col className="w-[100px]" />
                  <col />
                  <col className="w-[145px]" />
                  <col className="w-[130px]" />
                  <col className="w-[120px]" />
                  <col className="w-[120px]" />
                </colgroup>
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    {renderThOrdenavel({ coluna: "data", label: "Data", className: "text-left" })}
                    <th className="text-left p-3 font-medium text-gray-900 dark:text-white">Descrição</th>
                    <th className="text-center p-3 font-medium text-gray-900 dark:text-white">
                      <span className="inline-flex items-center gap-1">
                        Origem
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info size={12} className="text-gray-400 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[240px] text-xs">
                              Passe o cursor sobre o badge para ver como corrigir cada tipo de lançamento.
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </span>
                    </th>
                    {renderThOrdenavel({ coluna: "valor", label: "Entrada", className: "text-right" })}
                    {renderThOrdenavel({ coluna: "valor", label: "Saída", className: "text-right" })}
                    {renderThOrdenavel({ coluna: "saldo", label: "Saldo", className: "text-right" })}
                  </tr>
                </thead>
                <tbody>
                  {extratoPagina.map((item) => (
                    <tr
                      key={item.id}
                      className={`border-t border-gray-200 dark:border-gray-700 transition-colors ${
                        item.tipo === "entrada"
                          ? "bg-green-50/40 dark:bg-green-950/10 hover:bg-green-50 dark:hover:bg-green-950/20"
                          : "bg-red-50/40 dark:bg-red-950/10 hover:bg-red-50 dark:hover:bg-red-950/20"
                      }`}
                    >
                      <td className="p-3 whitespace-nowrap text-gray-900 dark:text-gray-200">
                        {formatarDataParaExibicao(item.data)}
                      </td>
                      <td className="p-3 text-gray-900 dark:text-gray-200 w-0 min-w-0" style={{ maxWidth: 0 }}>
                        <div className="truncate" title={item.descricao}>{item.descricao}</div>
                      </td>
                      <td className="p-3 text-center">
                        {renderOrigemBadge({ origem: item.origem })}
                      </td>
                      <td className="p-3 text-right font-medium text-green-600 dark:text-green-400 whitespace-nowrap">
                        {item.tipo === "entrada" && `+ ${fmt(item.valor)}`}
                      </td>
                      <td className="p-3 text-right font-medium text-red-600 dark:text-red-400 whitespace-nowrap">
                        {item.tipo === "saida" && `- ${fmt(item.valor)}`}
                      </td>
                      <td className={`p-3 text-right font-semibold whitespace-nowrap ${
                        item.saldoApos >= 0 ? "text-gray-900 dark:text-white" : "text-red-600 dark:text-red-400"
                      }`}>
                        {fmt(item.saldoApos)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Rodapé */}
            <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3 bg-gray-50 dark:bg-gray-900 flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                {extratoFiltrado.length} registro{extratoFiltrado.length !== 1 ? "s" : ""}
                {totalPaginas > 1 && ` • página ${pagina} de ${totalPaginas}`}
              </span>
              {totalPaginas > 1 && (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="dark:border-gray-700"
                    onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1}>
                    Anterior
                  </Button>
                  <Button variant="outline" size="sm" className="dark:border-gray-700"
                    onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas}>
                    Próxima
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Paginação mobile */}
      {!loading && !error && totalPaginas > 1 && (
        <div className="md:hidden flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">
            Página {pagina} de {totalPaginas}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm"
              onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1}>
              Anterior
            </Button>
            <Button variant="outline" size="sm"
              onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas}>
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}