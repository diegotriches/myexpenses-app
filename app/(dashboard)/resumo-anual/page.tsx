"use client";

import { useState, useCallback } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  TrendingUp, TrendingDown, DollarSign, Calendar,
  Award, AlertTriangle, Download, ChevronLeft, ChevronRight,
  Banknote, Smartphone, CreditCard, ArrowLeftRight,
} from "lucide-react";
import { MdOutlineAutoGraph } from "react-icons/md";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useResumoAnual } from "@/hooks/useResumoAnual";

// ── Constantes ─────────────────────────────────────────────────────────────

const MESES_LABEL = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

const CORES_CATEGORIAS = [
  "#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6",
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

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtK = (v: number) => {
  if (Math.abs(v) >= 1000) return `R$${(v / 1000).toFixed(1)}k`;
  return `R$${v.toFixed(0)}`;
};

const variacao = (atual: number, anterior: number): number => {
  if (!anterior) return 0;
  return Math.round(((atual - anterior) / Math.abs(anterior)) * 100);
};

// ── KPI Card ───────────────────────────────────────────────────────────────

function KpiCard({
  titulo, valor, anterior, icone: Icone, corPositiva = true,
}: {
  titulo: string; valor: number; anterior: number;
  icone: React.ElementType; corPositiva?: boolean;
}) {
  const diff    = variacao(valor, anterior);
  const subindo = diff > 0;
  const neutro  = diff === 0;
  const cor = neutro
    ? "text-gray-500"
    : (subindo === corPositiva
        ? "text-green-600 dark:text-green-400"
        : "text-red-600 dark:text-red-400");

  return (
    <Card className="dark:bg-gray-800 dark:border-gray-700">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">{titulo}</p>
          <Icone className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{fmt(valor)}</p>
        {!neutro && (
          <p className={`text-xs flex items-center gap-1 ${cor}`}>
            {subindo ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(diff)}% vs {anterior > 0 ? "ano anterior" : "—"}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ── Tooltip customizado ────────────────────────────────────────────────────

function TooltipMoeda({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-900 dark:text-white mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {fmt(p.value)}
        </p>
      ))}
    </div>
  );
}

// ── Lista com rosca — reutilizada para categorias e métodos ───────────────

function RoscaComLista({
  itens,
  cores,
  labelKey,
  valorKey = "total",
  renderLabel,
  renderDetalhe,
}: {
  itens:        any[];
  cores:        string[];
  labelKey:     string;
  valorKey?:    string;
  renderLabel:  (item: any, i: number) => React.ReactNode;
  renderDetalhe?: (item: any) => React.ReactNode;
}) {
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
            <Tooltip formatter={(v: any) => fmt(Number(v))} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Barras de progresso */}
      <div className="w-full md:w-3/5 space-y-4">
        {itens.map((item, i) => (
          <div key={item[labelKey]}>
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
                  {fmt(item.total)}
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
  const anoAtual = new Date().getFullYear();
  const [ano, setAno] = useState(anoAtual);
  const [exportando, setExportando] = useState(false);

  const { data, isLoading, error } = useResumoAnual(ano);

  const exportarPDF = useCallback(async () => {
    if (!data) return;
    setExportando(true);
    try {
      const { pdf }            = await import("@react-pdf/renderer");
      const { ResumoAnualPDF } = await import("@/components/resumo-anual/ResumoAnualPDF");
      const blob = await pdf(<ResumoAnualPDF data={data} />).toBlob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = `resumo-${ano}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Erro ao exportar PDF:", e);
    } finally {
      setExportando(false);
    }
  }, [data, ano]);

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
    [ano]:              Math.round(data.meses[i].despesas),
    [data.anoAnterior]: Math.round(data.mesesAnteriores[i].despesas),
  }));

  const dadosEvolucao = MESES_LABEL.map((label, i) => ({
    mes:      label,
    receitas: Math.round(data.meses[i].receitas),
    despesas: Math.round(data.meses[i].despesas),
    saldo:    Math.round(data.meses[i].saldo),
  }));

  const nomeMes = (m: number) => [
    "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
    "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
  ][m - 1] ?? "";

  const metodosPagamento = (data as any).metodosPagamento as {
    metodo: string; quantidade: number; total: number; percentual: number;
  }[];

  return (
    <div className="page-container p-4 md:p-6 space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <MdOutlineAutoGraph className="text-2xl md:text-3xl text-blue-700 dark:text-blue-500" />
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
              Resumo do Ano
            </h1>
          </div>
          <Button variant="outline" size="sm" onClick={exportarPDF}
            disabled={exportando || !data} className="hidden md:flex dark:border-gray-700">
            <Download className="h-4 w-4 mr-2" />
            {exportando ? "Gerando PDF..." : "Exportar PDF"}
          </Button>
        </div>
        <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
          Visão consolidada das suas finanças em {ano}
        </p>
        <hr className="border-t border-gray-300 dark:border-gray-700 my-4" />
      </div>

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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard titulo="Total de Receitas" valor={data.totais.receitas}
          anterior={data.totaisAnteriores.receitas} icone={TrendingUp} corPositiva={true} />
        <KpiCard titulo="Total de Despesas" valor={data.totais.despesas}
          anterior={data.totaisAnteriores.despesas} icone={TrendingDown} corPositiva={false} />
        <KpiCard titulo="Saldo do Ano" valor={data.totais.saldo}
          anterior={data.totaisAnteriores.saldo} icone={DollarSign} corPositiva={true} />
      </div>

      {/* ── Destaques ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

        {data.melhorMes && (
          <Card className="dark:bg-gray-800 dark:border-gray-700 border-green-200 dark:border-green-900">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Award className="h-4 w-4 text-green-600 dark:text-green-400" />
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Melhor Mês</p>
              </div>
              <p className="font-bold text-gray-900 dark:text-white">{nomeMes(data.melhorMes.mes)}</p>
              <p className="text-sm text-green-600 dark:text-green-400 font-medium">{fmt(data.melhorMes.saldo)}</p>
            </CardContent>
          </Card>
        )}

        {data.piorMes && (
          <Card className="dark:bg-gray-800 dark:border-gray-700 border-red-200 dark:border-red-900">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-red-500 dark:text-red-400" />
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Mês Mais Difícil</p>
              </div>
              <p className="font-bold text-gray-900 dark:text-white">{nomeMes(data.piorMes.mes)}</p>
              <p className={`text-sm font-medium ${data.piorMes.saldo >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                {fmt(data.piorMes.saldo)}
              </p>
            </CardContent>
          </Card>
        )}

        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Média Mensal</p>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Receitas</p>
            <p className="font-bold text-green-600 dark:text-green-400 text-sm">{fmt(data.mediaMensal.receitas)}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-1">Despesas</p>
            <p className="font-bold text-red-600 dark:text-red-400 text-sm">{fmt(data.mediaMensal.despesas)}</p>
          </CardContent>
        </Card>

        {data.maiorDespesa && (
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-orange-500 dark:text-orange-400" />
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Maior Despesa</p>
              </div>
              <p className="font-bold text-gray-900 dark:text-white text-sm truncate" title={data.maiorDespesa.descricao ?? ""}>
                {data.maiorDespesa.descricao || "Sem descrição"}
              </p>
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                {fmt(Number(data.maiorDespesa.valor))}
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

      {/* ── Gráfico 1: Evolução mensal ─────────────────────────────────── */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-base md:text-lg text-gray-900 dark:text-white">
            Evolução Mensal — {ano}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dadosEvolucao} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={fmtK} tick={{ fontSize: 11 }} width={55} />
              <Tooltip content={<TooltipMoeda />} />
              <Legend />
              <Bar dataKey="receitas" name="Receitas" fill="#10b981" radius={[3, 3, 0, 0]} />
              <Bar dataKey="despesas" name="Despesas" fill="#ef4444" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* ── Gráfico 2: Saldo por mês ────────────────────────────────────── */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-base md:text-lg text-gray-900 dark:text-white">
            Saldo por Mês — {ano}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={dadosEvolucao} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={fmtK} tick={{ fontSize: 11 }} width={55} />
              <Tooltip content={<TooltipMoeda />} />
              <Line type="monotone" dataKey="saldo" name="Saldo"
                stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* ── Gráfico 3: Comparativo de despesas ─────────────────────────── */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-base md:text-lg text-gray-900 dark:text-white">
            Comparativo de Despesas — {data.anoAnterior} vs {ano}
          </CardTitle>
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
        <Card className="dark:bg-gray-800 dark:border-gray-700">
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
                {data.categorias.length > 0 ? (
                  <RoscaComLista
                    itens={data.categorias}
                    cores={CORES_CATEGORIAS}
                    labelKey="categoria"
                    renderLabel={(item) => (
                      <span className="text-gray-700 dark:text-gray-300 truncate max-w-[140px]">
                        {item.categoria}
                      </span>
                    )}
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

      {/* ── Botão exportar mobile ──────────────────────────────────────── */}
      <Button className="md:hidden w-full bg-blue-700 hover:bg-blue-900"
        onClick={exportarPDF} disabled={exportando || !data}>
        <Download className="h-4 w-4 mr-2" />
        {exportando ? "Gerando PDF..." : "Exportar PDF"}
      </Button>

    </div>
  );
}