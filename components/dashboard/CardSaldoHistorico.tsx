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
import { useContas } from "@/hooks/useContas";
import { useRendaVariavel } from "@/hooks/useRendaVariavel";
import { useHideValues } from "@/contexts/HideValuesContext";
import { hojeBrt } from "@/utils/aplicacaoSimulacao";
import { custoRendaVariavelEm, liquidoAtualAplicacao, mercadoRendaVariavel, valorAplicacaoEm } from "@/utils/patrimonioUtils";
import { formatarMoeda } from "@/utils/formatadores";
import { useMoeda } from "@/hooks/useMoeda";
import type { PropsTooltip } from "@/types/grafico";

const PERIODOS = [
  { label: "3m", value: "3" },
  { label: "6m", value: "6" },
  { label: "12m", value: "12" },
] as const;

const COR_CONTAS = "#2563eb";
const COR_RENDA_FIXA = "#059669";
const COR_RENDA_VARIAVEL = "#7c3aed";

const centavos = (v: number) => Math.round(v * 100) / 100;

interface PontoPatrimonio {
  mes: string;
  Contas: number;
  RendaFixa: number;
  RendaVariavel: number;
  Total: number;
  /** Mês passado: renda variável pelo custo de aquisição (não há histórico de cotações) */
  rvACusto: boolean;
}

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

function CustomTooltip({ active, payload, label, hidden }: PropsTooltip & { hidden?: boolean }) {
  if (!active || !payload?.length) return null;
  const p: Partial<PontoPatrimonio> = payload[0]?.payload ?? {};
  const total = p.Total ?? 0;
  const m = (v: number) => (hidden ? "••••••" : formatarMoeda(v));
  const linhas: { cor: string; nome: string; valor: number; mostrar: boolean }[] = [
    { cor: COR_CONTAS, nome: "Em contas", valor: p.Contas ?? 0, mostrar: true },
    { cor: COR_RENDA_FIXA, nome: "Renda fixa (líq.)", valor: p.RendaFixa ?? 0, mostrar: (p.RendaFixa ?? 0) !== 0 },
    {
      cor: COR_RENDA_VARIAVEL,
      nome: p.rvACusto ? "Renda variável (custo)" : "Renda variável",
      valor: p.RendaVariavel ?? 0,
      mostrar: (p.RendaVariavel ?? 0) !== 0,
    },
  ];
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg text-xs space-y-1">
      <p className="font-medium text-gray-700 dark:text-gray-300">{label}</p>
      <p className={`font-bold text-sm ${total >= 0 ? "text-gray-900 dark:text-white" : "text-red-600 dark:text-red-400"}`}>
        {m(total)}
      </p>
      {linhas.filter((l) => l.mostrar).map((l) => (
        <div key={l.nome} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
            <span className="inline-block w-2 h-2 rounded-full" style={{ background: l.cor }} />
            {l.nome}
          </span>
          <span className="text-gray-700 dark:text-gray-300">{m(l.valor)}</span>
        </div>
      ))}
    </div>
  );
}

export function CardSaldoHistorico() {
  const [periodo, setPeriodo] = useState<"3" | "6" | "12">("6");
  const { data: historico, isLoading: loadingHistorico, error } = useSaldoHistorico(periodo);
  const contasQuery = useContas();
  const aplicacoesQuery = useAplicacoes();
  const rvQuery = useRendaVariavel();
  const { hidden, mask } = useHideValues();

  const fmt = useMoeda();
  const erroAplicacoes = aplicacoesQuery.isError;
  const erroRv = rvQuery.isError;
  const carregando = loadingHistorico || contasQuery.isLoading || aplicacoesQuery.isLoading || rvQuery.isLoading;

  // Série mensal: contas (API) + renda fixa líquida estimada + renda variável (custo nos meses passados)
  const dadosGrafico = useMemo<PontoPatrimonio[]>(() => {
    const hoje = hojeBrt();
    const mesAtual = hoje.slice(0, 7);
    const aplicacoes = aplicacoesQuery.data ?? [];
    const operacoesRv = rvQuery.data?.operacoes ?? [];
    const temInvestimentos = aplicacoes.length > 0 || operacoesRv.length > 0;

    // Sem contas ativas a API devolve [] — gera os meses aqui para
    // os investimentos continuarem aparecendo.
    let base = historico ?? [];
    if (base.length === 0 && temInvestimentos) {
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

    // Mês atual: os mesmos valores da página Contas (saldo atual das contas ativas,
    // que já inclui lançamentos com data futura, e renda variável a mercado)
    const contasAgora = contasQuery.data
      ? contasQuery.data.filter((c) => c.ativo).reduce((s, c) => s + Number(c.saldoAtual), 0)
      : null;

    return base.map((item) => {
      const atual = item.mes >= mesAtual;
      const fim = fimDoMes(item.mes);

      let rendaFixa = 0;
      if (!erroAplicacoes) {
        rendaFixa = atual
          ? aplicacoes.filter((a) => !a.resgatada).reduce((s, a) => s + liquidoAtualAplicacao(a, hoje), 0)
          : aplicacoes.reduce((s, a) => s + valorAplicacaoEm(a, fim).liquido, 0);
      }

      let rendaVariavel = 0;
      if (!erroRv && operacoesRv.length > 0) {
        rendaVariavel = atual
          ? mercadoRendaVariavel(operacoesRv, rvQuery.data?.cotacoes ?? [])
          : custoRendaVariavelEm(operacoesRv, fim);
      }

      const contas = atual && contasAgora !== null ? contasAgora : item.saldoTotal;
      return {
        mes: formatarMes(item.mes),
        Contas: centavos(contas),
        RendaFixa: centavos(rendaFixa),
        RendaVariavel: centavos(rendaVariavel),
        Total: centavos(contas + rendaFixa + rendaVariavel),
        rvACusto: !atual,
      };
    });
  }, [historico, contasQuery.data, aplicacoesQuery.data, rvQuery.data, erroAplicacoes, erroRv, periodo]);

  const ultimo = dadosGrafico[dadosGrafico.length - 1];
  const variacao = dadosGrafico.length >= 2 ? ultimo.Total - dadosGrafico[0].Total : null;
  const temRendaFixa = dadosGrafico.some((d) => d.RendaFixa !== 0);
  const temRendaVariavel = dadosGrafico.some((d) => d.RendaVariavel !== 0);

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

  const indisponiveis = [erroAplicacoes && "renda fixa", erroRv && "renda variável"].filter(Boolean).join(" e ");

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
                  <linearGradient id="gradientRendaFixa" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COR_RENDA_FIXA} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={COR_RENDA_FIXA} stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="gradientRendaVariavel" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COR_RENDA_VARIAVEL} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={COR_RENDA_VARIAVEL} stopOpacity={0.05} />
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
                {temRendaFixa && (
                  <Area
                    type="monotone"
                    dataKey="RendaFixa"
                    stackId="patrimonio"
                    stroke={COR_RENDA_FIXA}
                    strokeWidth={2}
                    fill="url(#gradientRendaFixa)"
                    dot={{ fill: COR_RENDA_FIXA, strokeWidth: 0, r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                )}
                {temRendaVariavel && (
                  <Area
                    type="monotone"
                    dataKey="RendaVariavel"
                    stackId="patrimonio"
                    stroke={COR_RENDA_VARIAVEL}
                    strokeWidth={2}
                    fill="url(#gradientRendaVariavel)"
                    dot={{ fill: COR_RENDA_VARIAVEL, strokeWidth: 0, r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>

            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: COR_CONTAS }} />
                Em contas
              </span>
              {temRendaFixa && (
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: COR_RENDA_FIXA }} />
                  Renda fixa (líquida)
                </span>
              )}
              {temRendaVariavel && (
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: COR_RENDA_VARIAVEL }} />
                  Renda variável
                </span>
              )}
            </div>

            {indisponiveis ? (
              <p className="text-xs text-amber-600 dark:text-amber-400 text-center">
                {`Sem ${indisponiveis} (indisponível no momento): o total está incompleto.`}
              </p>
            ) : temRendaFixa || temRendaVariavel ? (
              <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center">
                Meses anteriores: renda fixa estimada após IR e renda variável pelo custo de aquisição. O mês atual usa os valores da página Contas.
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
