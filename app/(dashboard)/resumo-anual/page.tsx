"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart, Bar, ComposedChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  TrendingUp, TrendingDown, DollarSign, Calendar, PiggyBank,
  Award, AlertTriangle, Download, ChevronLeft, ChevronRight,
  Banknote, Smartphone, CreditCard, ArrowLeftRight, Wallet,
} from "lucide-react";
import { MdOutlineAutoGraph } from "react-icons/md";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useResumoAnual } from "@/hooks/useResumoAnual";
import { useHideValues } from "@/contexts/HideValuesContext";
import { formatarMoeda } from "@/utils/formatadores";
import type { PropsTooltip } from "@/types/grafico";
import { useMoeda } from "@/hooks/useMoeda";
import type { CategoriaResumo } from "@/hooks/useResumoAnual";
import { rotuloPeriodo } from "@/utils/resumoAnualUtils";
import { taxaDePoupanca } from "@/utils/gastosUtils";
import { usePeriodo } from "@/contexts/PeriodoContext";
import { useResumoInvestimentos } from "@/hooks/useResumoInvestimentos";
import { SecaoDeclaracao, SecaoInvestimentosAno } from "@/components/resumo-anual/SecoesInvestimentos";
import { KpiCard as Indicador, type TomKpi, type TomValorKpi } from "@/components/common/KpiCard";
import { PageHeader } from "@/components/common/PageHeader";

// ── Constantes ─────────────────────────────────────────────────────────────

const MESES_LABEL = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

const CORES_CATEGORIAS = [
  "#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#ec4899","#84cc16","#94a3b8",
];
const MAX_CATEGORIAS = 8;

type SerieComparativa = "despesas" | "receitas" | "saldo";
const SERIES_COMPARATIVO: { valor: SerieComparativa; rotulo: string }[] = [
  { valor: "despesas", rotulo: "Despesas" },
  { valor: "receitas", rotulo: "Receitas" },
  { valor: "saldo", rotulo: "Saldo" },
];

const CORES_METODOS = [
  "#6366f1","#0ea5e9","#10b981","#f59e0b",
];

const METODO_CONFIG: Record<string, { label: string; icon: React.ElementType }> = {
  dinheiro:      { label: "Dinheiro",      icon: Banknote       },
  pix:           { label: "PIX",           icon: Smartphone     },
  cartao:        { label: "Cartão",        icon: CreditCard     },
  transferencia: { label: "Transferência", icon: ArrowLeftRight },
};

// ── Helpers ────────────────────────────────────────────────────────────────

const fmtK = (v: number) => {
  if (Math.abs(v) >= 1000) return `R$${(v / 1000).toFixed(1)}k`;
  return `R$${v.toFixed(0)}`;
};

const variacao = (atual: number, anterior: number): number => {
  if (!anterior) return 0;
  return Math.round(((atual - anterior) / Math.abs(anterior)) * 100);
};

// ── Indicadores do topo (sobre o KpiCard comum) ───────────────────────────

// Linha de comparação com o período anterior, colorida por ser melhora ou piora
function renderComparacao(diff: number, texto: string, melhorouQuandoSobe: boolean) {
  if (diff === 0) return null;
  const subindo = diff > 0;
  const cor = subindo === melhorouQuandoSobe ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400";
  return (
    <span className={`inline-flex items-center gap-1 ${cor}`}>
      {subindo ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {texto}
    </span>
  );
}

function KpiCard({
  titulo, valor, anterior, rotuloComparacao, icone, corPositiva = true, tom, tomValor,
}: {
  titulo: string; valor: number; anterior: number; rotuloComparacao: string;
  icone: React.ElementType<{ className?: string }>; corPositiva?: boolean;
  tom: TomKpi; tomValor?: TomValorKpi;
}) {
  const { mask } = useHideValues();
  const diff = variacao(valor, anterior);
  return (
    <Indicador
      titulo={titulo}
      valor={mask(formatarMoeda(valor))}
      icone={icone}
      tom={tom}
      tomValor={tomValor}
      detalhe={renderComparacao(diff, `${Math.abs(diff)}% vs ${rotuloComparacao}`, corPositiva)}
    />
  );
}

// ── KPI: taxa de poupança (quanto da receita sobrou) ───────────────────────

function KpiTaxa({ taxa, anterior, rotuloComparacao }: { taxa: number | null; anterior: number | null; rotuloComparacao: string }) {
  const diff = taxa !== null && anterior !== null ? taxa - anterior : null;
  return (
    <Indicador
      titulo="Taxa de poupança"
      valor={taxa === null ? "—" : `${taxa}%`}
      icone={PiggyBank}
      tom="roxo"
      tomValor={taxa !== null && taxa < 0 ? "negativo" : "neutro"}
      detalhe={
        diff !== null && diff !== 0
          ? renderComparacao(diff, `${Math.abs(diff)} p.p. vs ${rotuloComparacao}`, true)
          : "da receita do período"
      }
    />
  );
}

// Tooltip do gráfico mensal: receitas, despesas, saldo e taxa de poupança do mês
function TooltipEvolucao({ active, payload, label }: PropsTooltip) {
  const fmt = useMoeda();
  if (!active || !payload?.length) return null;
  const p: { receitas?: number; despesas?: number; saldo?: number; taxa?: number | null } = payload[0]?.payload ?? {};
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 text-sm space-y-0.5">
      <p className="font-semibold text-gray-900 dark:text-white mb-1">{label}</p>
      <p className="text-green-600 dark:text-green-400">Receitas: {fmt(p.receitas ?? 0)}</p>
      <p className="text-red-600 dark:text-red-400">Despesas: {fmt(p.despesas ?? 0)}</p>
      <p className="text-blue-600 dark:text-blue-400">Saldo: {fmt(p.saldo ?? 0)}</p>
      {p.taxa !== null && p.taxa !== undefined && (
        <p className="text-gray-500 dark:text-gray-400">Poupança: {p.taxa}% da receita</p>
      )}
    </div>
  );
}

// 8 maiores categorias e o resto somado em "Demais"
function agruparCategorias(categorias: CategoriaResumo[]): CategoriaResumo[] {
  if (categorias.length <= MAX_CATEGORIAS + 1) return categorias;
  const resto = categorias.slice(MAX_CATEGORIAS);
  const total = resto.reduce((s, c) => s + c.total, 0);
  const totalAnterior = resto.reduce((s, c) => s + c.totalAnterior, 0);
  return [
    ...categorias.slice(0, MAX_CATEGORIAS),
    {
      categoria: `Demais (${resto.length})`,
      total,
      percentual: resto.reduce((s, c) => s + c.percentual, 0),
      totalAnterior,
      variacao: totalAnterior > 0 ? Math.round(((total - totalAnterior) / totalAnterior) * 100) : null,
    },
  ];
}

// ── Tooltip customizado ────────────────────────────────────────────────────

function TooltipMoeda({ active, payload, label }: PropsTooltip) {
  const { mask } = useHideValues();
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-900 dark:text-white mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {mask(formatarMoeda(Number(p.value ?? 0)))}
        </p>
      ))}
    </div>
  );
}

// ── Lista com rosca — reutilizada para categorias e métodos ───────────────

function RoscaComLista<T extends { total: number; percentual: number }>({
  itens,
  cores,
  labelKey,
  valorKey = "total",
  renderLabel,
  renderDetalhe,
}: {
  itens:        T[];
  cores:        string[];
  labelKey:     keyof T & string;
  valorKey?:    keyof T & string;
  renderLabel:  (item: T, i: number) => React.ReactNode;
  renderDetalhe?: (item: T) => React.ReactNode;
}) {
  const { mask } = useHideValues();
  return (
    <div className="flex flex-col md:flex-row items-center gap-6">
      {/* Gráfico de rosca */}
      <div className="w-full md:w-2/5">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={itens}
              dataKey={valorKey}
              nameKey={labelKey}
              cx="50%" cy="50%"
              innerRadius={60} outerRadius={90}
              paddingAngle={3}
            >
              {itens.map((_, i) => (
                <Cell key={i} fill={cores[i % cores.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => mask(formatarMoeda(Number(v ?? 0)))} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Barras de progresso */}
      <div className="w-full md:w-3/5 space-y-4">
        {itens.map((item, i) => (
          <div key={String(item[labelKey])}>
            <div className="flex items-center justify-between text-sm mb-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="inline-block w-3 h-3 rounded-full flex-shrink-0"
                  style={{ background: cores[i % cores.length] }}
                />
                {renderLabel(item, i)}
              </div>
              <div className="text-right ml-2 flex-shrink-0">
                <span className="font-semibold text-gray-900 dark:text-white block">
                  {mask(formatarMoeda(item.total))}
                </span>
                {renderDetalhe && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {renderDetalhe(item)}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all"
                  style={{
                    width:      `${item.percentual}%`,
                    background: cores[i % cores.length],
                  }}
                />
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400 w-8 text-right">
                {item.percentual}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Página principal ───────────────────────────────────────────────────────

export default function ResumoAnualPage() {
  const { mask } = useHideValues();
  const anoAtual = new Date().getFullYear();
  const [ano, setAno] = useState(anoAtual);
  const [exportando, setExportando] = useState(false);

  const { data, isLoading, error } = useResumoAnual(ano);
  const investimentos = useResumoInvestimentos(ano, data?.contas);
  const [serieComparativa, setSerieComparativa] = useState<SerieComparativa>("despesas");

  // Clicar num mês do gráfico abre os lançamentos daquele mês
  const router = useRouter();
  const { setMesSelecionado, setAnoSelecionado } = usePeriodo();
  const abrirMes = (indice: number) => {
    setAnoSelecionado(ano);
    setMesSelecionado(indice);
    router.push("/transacoes");
  };

  const exportarPDF = useCallback(async () => {
    if (!data) return;
    setExportando(true);
    try {
      const { pdf }            = await import("@react-pdf/renderer");
      const { ResumoAnualPDF } = await import("@/components/resumo-anual/ResumoAnualPDF");
      const blob = await pdf(<ResumoAnualPDF data={data} investimentos={investimentos.dados} />).toBlob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = `resumo-${ano}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Erro ao exportar PDF:", e);
    } finally {
      setExportando(false);
    }
  }, [data, ano, investimentos.dados]);

  if (isLoading) {
    return (
      <div className="page-container p-4 md:p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-28 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            ))}
          </div>
          <div className="h-72 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container p-4 md:p-6">
        <Card className="border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20">
          <CardContent className="p-8 text-center">
            <p className="text-red-600 dark:text-red-400 font-medium mb-2">Erro ao carregar resumo</p>
            <p className="text-sm text-red-500 mb-4">{error.message}</p>
            <Button variant="outline" onClick={() => window.location.reload()}>Tentar novamente</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const dadosComparativo = MESES_LABEL.map((label, i) => ({
    mes:                label,
    [ano]:              Math.round(data.meses[i][serieComparativa]),
    [data.anoAnterior]: Math.round(data.mesesAnteriores[i][serieComparativa]),
  }));

  const dadosEvolucao = MESES_LABEL.map((label, i) => ({
    mes:      label,
    receitas: Math.round(data.meses[i].receitas),
    despesas: Math.round(data.meses[i].despesas),
    saldo:    Math.round(data.meses[i].saldo),
    taxa:     taxaDePoupanca(data.meses[i].receitas, data.meses[i].despesas),
  }));

  // No ano corrente o período vai até o mês atual, e a comparação usa o mesmo intervalo
  const ateMes = data.periodoComparado.ateMes;
  const rotuloComparacao = rotuloPeriodo(data.anoAnterior, ateMes);
  const taxaAno = taxaDePoupanca(data.totais.receitas, data.totais.despesas);
  const taxaAnterior = taxaDePoupanca(data.totaisAnteriores.receitas, data.totaisAnteriores.despesas);
  const categorias = agruparCategorias(data.categorias);

  const nomeMes = (m: number) => [
    "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
    "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
  ][m - 1] ?? "";

  const metodosPagamento = data.metodosPagamento;

  return (
    <div className="page-container p-4 md:p-6 space-y-6">

      <PageHeader
        icone={MdOutlineAutoGraph}
        titulo="Resumo do Ano"
        descricao={
          ateMes < 12
            ? `Janeiro a ${nomeMes(ateMes).toLowerCase()} de ${ano}, comparado com o mesmo período de ${data.anoAnterior}`
            : `Visão consolidada das suas finanças em ${ano}`
        }
        acoes={
          <Button variant="outline" size="sm" onClick={exportarPDF}
            disabled={exportando || !data} className="hidden md:flex dark:border-gray-700">
            <Download className="h-4 w-4 mr-2" />
            {exportando ? "Gerando PDF..." : "Exportar PDF"}
          </Button>
        }
      />

      {/* ── Seletor de ano ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => setAno(a => a - 1)} className="dark:border-gray-700">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-lg font-semibold text-gray-900 dark:text-white w-16 text-center">{ano}</span>
        <Button variant="outline" size="icon" onClick={() => setAno(a => a + 1)}
          disabled={ano >= anoAtual} className="dark:border-gray-700">
          <ChevronRight className="h-4 w-4" />
        </Button>
        {ano !== anoAtual && (
          <Button variant="ghost" size="sm" onClick={() => setAno(anoAtual)}
            className="text-blue-600 dark:text-blue-400 text-xs">
            Voltar ao atual
          </Button>
        )}
      </div>

      {/* ── KPIs ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <KpiCard titulo="Total de Receitas" valor={data.totais.receitas} rotuloComparacao={rotuloComparacao}
          anterior={data.totaisAnteriores.receitas} icone={TrendingUp} corPositiva={true} tom="verde" />
        <KpiCard titulo="Total de Despesas" valor={data.totais.despesas} rotuloComparacao={rotuloComparacao}
          anterior={data.totaisAnteriores.despesas} icone={TrendingDown} corPositiva={false} tom="vermelho" />
        <KpiCard titulo="Saldo do Ano" valor={data.totais.saldo} rotuloComparacao={rotuloComparacao}
          anterior={data.totaisAnteriores.saldo} icone={Wallet} corPositiva={true} tom="azul"
          tomValor={data.totais.saldo >= 0 ? "positivo" : "negativo"} />
        <KpiTaxa taxa={taxaAno} anterior={taxaAnterior} rotuloComparacao={rotuloComparacao} />
      </div>

      {/* ── Destaques ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">

        {data.melhorMes && (
          <Card className="dark:bg-gray-900 dark:border-gray-800 border-green-200 dark:border-green-900">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-2 mb-2">
                <Award className="h-4 w-4 text-green-600 dark:text-green-400" />
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Melhor Mês</p>
              </div>
              <p className="font-bold text-gray-900 dark:text-white">{nomeMes(data.melhorMes.mes)}</p>
              <p className="text-sm text-green-600 dark:text-green-400 font-medium">{mask(formatarMoeda(data.melhorMes.saldo))}</p>
            </CardContent>
          </Card>
        )}

        {data.piorMes && (
          <Card className="dark:bg-gray-900 dark:border-gray-800 border-red-200 dark:border-red-900">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-red-500 dark:text-red-400" />
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Mês Mais Difícil</p>
              </div>
              <p className="font-bold text-gray-900 dark:text-white">{nomeMes(data.piorMes.mes)}</p>
              <p className={`text-sm font-medium ${data.piorMes.saldo >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                {mask(formatarMoeda(data.piorMes.saldo))}
              </p>
            </CardContent>
          </Card>
        )}

        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Média Mensal</p>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Receitas</p>
            <p className="font-bold text-green-600 dark:text-green-400 text-sm">{mask(formatarMoeda(data.mediaMensal.receitas))}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-1">Despesas</p>
            <p className="font-bold text-red-600 dark:text-red-400 text-sm">{mask(formatarMoeda(data.mediaMensal.despesas))}</p>
          </CardContent>
        </Card>

        {data.maiorDespesa && (
          <Card className="dark:bg-gray-900 dark:border-gray-800">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-orange-500 dark:text-orange-400" />
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Maior Despesa</p>
              </div>
              <p className="font-bold text-gray-900 dark:text-white text-sm truncate" title={data.maiorDespesa.descricao ?? ""}>
                {data.maiorDespesa.descricao || "Sem descrição"}
              </p>
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                {mask(formatarMoeda(Number(data.maiorDespesa.valor)))}
              </p>
              {data.maiorDespesa.categoria && (
                <Badge variant="secondary" className="mt-1 text-xs dark:bg-gray-700">
                  {data.maiorDespesa.categoria}
                </Badge>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Receitas e despesas por mês, com o saldo em linha ─────────────── */}
      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardHeader>
          <CardTitle className="text-base md:text-lg text-gray-900 dark:text-white">
            Receitas, despesas e saldo — {ano}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={dadosEvolucao} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={fmtK} tick={{ fontSize: 11 }} width={55} />
              <Tooltip content={<TooltipEvolucao />} />
              <Legend />
              <Bar dataKey="receitas" name="Receitas" fill="#10b981" radius={[3, 3, 0, 0]}
                cursor="pointer" onClick={(_, indice) => abrirMes(indice)} />
              <Bar dataKey="despesas" name="Despesas" fill="#ef4444" radius={[3, 3, 0, 0]}
                cursor="pointer" onClick={(_, indice) => abrirMes(indice)} />
              <Line type="monotone" dataKey="saldo" name="Saldo"
                stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            </ComposedChart>
          </ResponsiveContainer>
          <p className="text-[11px] text-center text-gray-400 dark:text-gray-500 mt-1">
            Clique numa barra para ver os lançamentos do mês. Compras no cartão de crédito contam aqui no mês da fatura.
          </p>
        </CardContent>
      </Card>

      {/* ── Gráfico 3: Comparativo de despesas ─────────────────────────── */}
      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base md:text-lg text-gray-900 dark:text-white">
              Comparativo — {data.anoAnterior} vs {ano}
            </CardTitle>
            <div className="inline-flex rounded-md bg-gray-100 dark:bg-gray-700 p-0.5" role="tablist" aria-label="Série do comparativo">
              {SERIES_COMPARATIVO.map((s) => (
                <button
                  key={s.valor}
                  type="button"
                  role="tab"
                  aria-selected={serieComparativa === s.valor}
                  onClick={() => setSerieComparativa(s.valor)}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                    serieComparativa === s.valor
                      ? "bg-white text-gray-900 shadow-sm dark:bg-gray-900 dark:text-white"
                      : "text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                  }`}
                >
                  {s.rotulo}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={dadosComparativo} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={fmtK} tick={{ fontSize: 11 }} width={55} />
              <Tooltip content={<TooltipMoeda />} />
              <Legend />
              <Bar dataKey={String(data.anoAnterior)} name={String(data.anoAnterior)} fill="#94a3b8" radius={[3, 3, 0, 0]} />
              <Bar dataKey={String(ano)}              name={String(ano)}              fill="#3b82f6" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* ── Card unificado: Categorias | Métodos de Pagamento ──────────── */}
      {(data.categorias.length > 0 || metodosPagamento?.length > 0) && (
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardHeader>
            <CardTitle className="text-base md:text-lg text-gray-900 dark:text-white">
              Distribuição Anual — {ano}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="categorias">
              <TabsList className="mb-6 dark:bg-gray-700">
                <TabsTrigger value="categorias" className="dark:data-[state=active]:bg-gray-900">
                  Categorias
                </TabsTrigger>
                <TabsTrigger value="metodos" className="dark:data-[state=active]:bg-gray-900">
                  Métodos de Pagamento
                </TabsTrigger>
              </TabsList>

              {/* Aba Categorias */}
              <TabsContent value="categorias">
                {categorias.length > 0 ? (
                  <RoscaComLista
                    itens={categorias}
                    cores={CORES_CATEGORIAS}
                    labelKey="categoria"
                    renderLabel={(item) => (
                      <span className="text-gray-700 dark:text-gray-300 truncate max-w-[140px]">
                        {item.categoria}
                      </span>
                    )}
                    renderDetalhe={(item) =>
                      item.variacao === null
                        ? `sem gasto em ${rotuloComparacao}`
                        : `${item.variacao > 0 ? "▲" : item.variacao < 0 ? "▼" : "="} ${Math.abs(item.variacao)}% vs ${rotuloComparacao}`
                    }
                  />
                ) : (
                  <p className="text-center text-gray-500 dark:text-gray-400 py-8 text-sm">
                    Nenhuma categoria registrada em {ano}
                  </p>
                )}
              </TabsContent>

              {/* Aba Métodos de Pagamento */}
              <TabsContent value="metodos">
                {metodosPagamento?.length > 0 ? (
                  <RoscaComLista
                    itens={metodosPagamento}
                    cores={CORES_METODOS}
                    labelKey="metodo"
                    renderLabel={(item) => {
                      const config = METODO_CONFIG[item.metodo];
                      const Icon   = config?.icon;
                      return (
                        <div className="flex items-center gap-1.5">
                          {Icon && <Icon className="w-4 h-4 flex-shrink-0 text-gray-500 dark:text-gray-400" />}
                          <span className="text-gray-700 dark:text-gray-300">
                            {config?.label ?? item.metodo}
                          </span>
                        </div>
                      );
                    }}
                    renderDetalhe={(item) =>
                      `${item.quantidade} transaç${item.quantidade === 1 ? "ão" : "ões"}`
                    }
                  />
                ) : (
                  <p className="text-center text-gray-500 dark:text-gray-400 py-8 text-sm">
                    Nenhuma despesa registrada em {ano}
                  </p>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* ── Investimentos no ano e dados para a declaração ──────────────── */}
      <SecaoInvestimentosAno dados={investimentos.dados} ano={ano} carregando={investimentos.carregando} incompleto={investimentos.incompleto} />
      <SecaoDeclaracao dados={investimentos.dados} ano={ano} carregando={investimentos.carregando} />

      {/* ── Botão exportar mobile ──────────────────────────────────────── */}
      <Button className="md:hidden w-full bg-blue-700 text-white hover:bg-blue-900"
        onClick={exportarPDF} disabled={exportando || !data}>
        <Download className="h-4 w-4 mr-2" />
        {exportando ? "Gerando PDF..." : "Exportar PDF"}
      </Button>

    </div>
  );
}