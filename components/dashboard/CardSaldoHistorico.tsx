"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Wallet, Loader2, AlertCircle, TrendingUp, TrendingDown } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useSaldoHistorico } from "@/hooks/useDashboard";
import { useAplicacoes } from "@/hooks/useAplicacoes";
import { useHideValues } from "@/contexts/HideValuesContext";
import type { Aplicacao } from "@/services/aplicacaoService";
import {
  hojeBrt,
  somarDias,
  simularAplicacao,
  projetarLotes,
  estimarLiquidoTotal,
  type LoteEstado,
  type TaxaDia,
} from "@/utils/aplicacaoSimulacao";
import { formatarMoeda } from "@/utils/formatadores";
import { useMoeda } from "@/hooks/useMoeda";

const PERIODOS = [
  { label: "3m", value: "3" },
  { label: "6m", value: "6" },
  { label: "12m", value: "12" },
] as const;

const COR_CONTAS = "#2563eb";
const COR_INVESTIDO = "#059669";

function formatarMes(mes: string) {
  try {
    const [ano, mesNum] = mes.split("-");
    const meses = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
    return `${meses[parseInt(mesNum) - 1]}/${ano.slice(2)}`;
  } catch {
    return mes;
  }
}

function formatarMoedaCurta(valor: number) {
  if (Math.abs(valor) >= 1000) return `R$ ${(valor / 1000).toFixed(1)}k`;
  return formatarMoeda(valor);
}

/** Último dia do mês ("YYYY-MM" -> "YYYY-MM-DD") */
function fimDoMes(mes: string): string {
  const [ano, m] = mes.split("-").map(Number);
  const ultimoDia = new Date(ano, m, 0).getDate();
  return `${mes}-${String(ultimoDia).padStart(2, "0")}`;
}

/**
 * Valor LÍQUIDO estimado (após IR, como se tudo fosse resgatado na data) de
 * uma aplicação no fim de um mês PASSADO.
 *
 * Não guardamos o valor mês a mês, então a história é reconstruída: aportes e
 * resgates reais + taxa diária constante (a última taxa publicada) nos dias
 * úteis. Por isso é uma estimativa — o mês atual usa o valor real do app.
 */
function liquidoNoFimDoMes(a: Aplicacao, fimMes: string): number {
  const ultima = a.ultimaTaxa;
  if (!ultima) return 0;

  const aportes = (a.aportes ?? []).filter((x) => x.data <= fimMes);
  if (aportes.length === 0) return 0;

  const inicio = aportes.reduce((min, x) => (x.data < min ? x.data : min), aportes[0].data);
  const taxas: TaxaDia[] = [];
  // se o aporte rende no próprio dia, a primeira taxa é a do dia do aporte
  for (let d = a.rendeNoDiaAporte ? inicio : somarDias(inicio, 1); d <= fimMes; d = somarDias(d, 1)) {
    const dia = new Date(`${d}T00:00:00Z`).getUTCDay();
    if (dia === 0 || dia === 6) continue;
    taxas.push({ data: d, taxa: ultima.taxa });
  }

  const sim = simularAplicacao({
    percentual: Number(a.percentualIndexador),
    tributacao: a.tributacao,
    aportes: aportes.map((x) => ({ id: x.id, data: x.data, valor: Number(x.valor) })),
    resgates: (a.resgates ?? []).map((r) => ({
      id: r.id,
      data: r.data,
      valorBruto: Number(r.valorBruto),
      total: r.tipo === "total",
    })),
    taxas,
    ate: fimMes,
    rendeNoDiaAporte: a.rendeNoDiaAporte,
  });

  return estimarLiquidoTotal(sim.lotes, fimMes, a.tributacao).valorLiquido;
}

/** Valor líquido estimado AGORA — mesmo cálculo da página Contas */
function liquidoAtual(a: Aplicacao, hoje: string): number {
  const lotes: LoteEstado[] = (a.aportes ?? []).map((x) => ({
    id: x.id,
    data: x.data,
    aportado: Number(x.valor),
    principal: Number(x.principalRestante),
    valorAtual: Number(x.valorAtual),
  }));
  const proj = projetarLotes(
    lotes, Number(a.percentualIndexador), a.ultimaTaxa, hoje, a.rendeNoDiaAporte
  );
  return estimarLiquidoTotal(proj.lotes, hoje, a.tributacao).valorLiquido;
}

function CustomTooltip({ active, payload, label, hidden }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload ?? {};
  const contas = p.Contas ?? 0;
  const investido = p.Investido ?? 0;
  const total = contas + investido;
  const m = (v: number) => (hidden ? "••••••" : formatarMoeda(v));
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg text-xs space-y-1">
      <p className="font-medium text-gray-700 dark:text-gray-300">{label}</p>
      <p className={`font-bold text-sm ${total >= 0 ? "text-gray-900 dark:text-white" : "text-red-600 dark:text-red-400"}`}>
        {m(total)}
      </p>
      <div className="flex items-center justify-between gap-4">
        <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: COR_CONTAS }} />
          Em contas
        </span>
        <span className="text-gray-700 dark:text-gray-300">{m(contas)}</span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: COR_INVESTIDO }} />
          Investido (líq.)
        </span>
        <span className="text-gray-700 dark:text-gray-300">{m(investido)}</span>
      </div>
    </div>
  );
}

export function CardSaldoHistorico() {
  const [periodo, setPeriodo] = useState<"3" | "6" | "12">("6");
  const { data: historico, isLoading: loadingHistorico, error } = useSaldoHistorico(periodo);
  const aplicacoesQuery = useAplicacoes();
  const { hidden, mask } = useHideValues();

  const fmt = useMoeda();
  const erroAplicacoes = aplicacoesQuery.isError;
  const carregando = loadingHistorico || aplicacoesQuery.isLoading;

  // Série mensal: contas (API) + investido líquido estimado (cliente)
  const dadosGrafico = useMemo(() => {
    const hoje = hojeBrt();
    const mesAtual = hoje.slice(0, 7);
    const aplicacoes = aplicacoesQuery.data ?? [];

    // Sem contas ativas a API devolve [] — gera os meses aqui para
    // os investimentos continuarem aparecendo.
    let base = historico ?? [];
    if (base.length === 0 && aplicacoes.length > 0) {
      const n = parseInt(periodo);
      const [ano, mes] = mesAtual.split("-").map(Number);
      base = Array.from({ length: n }, (_, k) => {
        const d = new Date(ano, mes - 1 - (n - 1 - k), 1);
        return {
          mes: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
          saldoTotal: 0,
        };
      });
    }

    return base.map((item) => {
      let investido = 0;
      if (!erroAplicacoes) {
        if (item.mes >= mesAtual) {
          // Mês corrente: valor real, igual à página Contas
          investido = aplicacoes
            .filter((a) => !a.resgatada)
            .reduce((s, a) => s + liquidoAtual(a, hoje), 0);
        } else {
          const fim = fimDoMes(item.mes);
          investido = aplicacoes.reduce((s, a) => s + liquidoNoFimDoMes(a, fim), 0);
        }
      }
      const contas = item.saldoTotal;
      return {
        mes: formatarMes(item.mes),
        Contas: contas,
        Investido: Math.round(investido * 100) / 100,
        Total: Math.round((contas + investido) * 100) / 100,
      };
    });
  }, [historico, aplicacoesQuery.data, erroAplicacoes, periodo]);

  const ultimo = dadosGrafico[dadosGrafico.length - 1];
  const variacao = dadosGrafico.length >= 2 ? ultimo.Total - dadosGrafico[0].Total : null;
  const temInvestimento = dadosGrafico.some((d) => d.Investido > 0);

  const cardTitle = (
    <div className="flex items-center justify-between w-full">
      <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-900 dark:text-white">
        <Wallet className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <span className="hidden sm:inline">Evolução do Patrimônio</span>
        <span className="sm:hidden">Patrimônio</span>
      </CardTitle>
      <div className="flex items-center gap-1">
        {PERIODOS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => setPeriodo(p.value)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              periodo === p.value
                ? "bg-blue-600 text-white dark:bg-blue-500"
                : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );

  if (carregando) {
    return (
      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardHeader>{cardTitle}</CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardHeader>{cardTitle}</CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Erro ao carregar histórico de saldo</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="dark:bg-gray-900 dark:border-gray-800">
      <CardHeader>{cardTitle}</CardHeader>
      <CardContent className="space-y-4">

        {ultimo && (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Patrimônio total atual</p>
              <p className={`text-xl font-bold ${
                ultimo.Total >= 0
                  ? "text-gray-900 dark:text-white"
                  : "text-red-600 dark:text-red-400"
              }`}>
                {fmt(ultimo.Total)}
              </p>
            </div>
            {variacao !== null && (
              <div className={`flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-md ${
                variacao >= 0
                  ? "text-green-700 bg-green-50 dark:text-green-400 dark:bg-green-950/30"
                  : "text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-950/30"
              }`}>
                {variacao >= 0
                  ? <TrendingUp className="h-3.5 w-3.5" />
                  : <TrendingDown className="h-3.5 w-3.5" />
                }
                <span className="hidden sm:inline">{mask(formatarMoeda(Math.abs(variacao)))}</span>
                <span className="sm:hidden">{mask(formatarMoedaCurta(Math.abs(variacao)))}</span>
              </div>
            )}
          </div>
        )}

        {dadosGrafico.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={dadosGrafico} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradientContas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COR_CONTAS} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={COR_CONTAS} stopOpacity={0.03} />
                  </linearGradient>
                  <linearGradient id="gradientInvestido" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COR_INVESTIDO} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={COR_INVESTIDO} stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis
                  dataKey="mes"
                  tick={{ fontSize: 10 }}
                  className="fill-gray-500 dark:fill-gray-400"
                />
                <YAxis
                  tick={{ fontSize: 10 }}
                  className="fill-gray-500 dark:fill-gray-400"
                  tickFormatter={(v) => hidden ? "••••" : formatarMoedaCurta(v)}
                  width={55}
                />
                <Tooltip content={<CustomTooltip hidden={hidden} />} />
                <Area
                  type="monotone"
                  dataKey="Contas"
                  stackId="patrimonio"
                  stroke={COR_CONTAS}
                  strokeWidth={2}
                  fill="url(#gradientContas)"
                  dot={{ fill: COR_CONTAS, strokeWidth: 0, r: 3 }}
                  activeDot={{ r: 5 }}
                />
                {temInvestimento && (
                  <Area
                    type="monotone"
                    dataKey="Investido"
                    stackId="patrimonio"
                    stroke={COR_INVESTIDO}
                    strokeWidth={2}
                    fill="url(#gradientInvestido)"
                    dot={{ fill: COR_INVESTIDO, strokeWidth: 0, r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>

            <div className="flex items-center justify-center gap-4 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: COR_CONTAS }} />
                Em contas
              </span>
              {temInvestimento && (
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: COR_INVESTIDO }} />
                  Investido (líquido)
                </span>
              )}
            </div>

            {erroAplicacoes ? (
              <p className="text-xs text-amber-600 dark:text-amber-400 text-center">
                Investimentos indisponíveis — exibindo apenas as contas.
              </p>
            ) : temInvestimento ? (
              <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center">
                Investimentos dos meses anteriores são estimados (após IR); o mês atual usa o valor real.
              </p>
            ) : null}
          </>
        ) : (
          <div className="text-center py-6">
            <Wallet className="w-10 h-10 text-gray-300 dark:text-gray-700 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum dado disponível</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Adicione transações para ver a evolução do seu patrimônio
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}