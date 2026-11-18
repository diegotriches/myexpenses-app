"use client";

import Link from "next/link";
import { PieChart as PieIcon, Briefcase, Coins, AlertTriangle, ArrowRight } from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useInvestimentos } from "@/hooks/useInvestimentos";
import { useMoeda } from "@/hooks/useMoeda";
import { useHideValues } from "@/contexts/HideValuesContext";
import { formatarMoeda } from "@/utils/formatadores";

// Cards da aba Investimentos do dashboard: alocação, carteira e proventos.
// Os três usam o mesmo hook, que reaproveita as consultas em cache.

const COR_CONTAS = "#2563eb";
const COR_RENDA_FIXA = "#059669";
const COR_RENDA_VARIAVEL = "#7c3aed";

const fmtData = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/");
const fmtPct = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(1).replace(".", ",")}%`;

function Carregando() {
  return (
    <CardContent className="space-y-3">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-32 w-full" />
    </CardContent>
  );
}

export function CardAlocacao() {
  const { contas, rendaFixa, carteira, carregando, erro } = useInvestimentos();
  const fmt = useMoeda();
  const { mask } = useHideValues();

  const fatias = [
    // A fatia não pode ser negativa; a lista mostra o valor real (conta no negativo, por exemplo)
    { nome: "Em contas", real: contas, valor: Math.max(0, contas), cor: COR_CONTAS },
    { nome: "Renda fixa", real: rendaFixa.liquido, valor: Math.max(0, rendaFixa.liquido), cor: COR_RENDA_FIXA },
    { nome: "Renda variável", real: carteira.valorMercado, valor: Math.max(0, carteira.valorMercado), cor: COR_RENDA_VARIAVEL },
  ];
  const total = contas + rendaFixa.liquido + carteira.valorMercado;
  const base = fatias.reduce((s, f) => s + f.valor, 0);
  const incompleto = erro.contas || erro.rendaFixa || erro.rendaVariavel;

  return (
    <Card className="dark:bg-gray-900 dark:border-gray-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
          <PieIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          Alocação
        </CardTitle>
      </CardHeader>
      {carregando ? <Carregando /> : (
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Patrimônio total</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{fmt(total)}</p>
          </div>
          {base > 0 && (
            <ResponsiveContainer width="100%" height={140}>
              <PieChart>
                <Pie data={fatias} dataKey="valor" nameKey="nome" innerRadius={42} outerRadius={64} paddingAngle={2}>
                  {fatias.map((f) => <Cell key={f.nome} fill={f.cor} />)}
                </Pie>
                <Tooltip formatter={(v) => mask(formatarMoeda(Number(v ?? 0)))} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <ul className="space-y-1.5 text-sm">
            {fatias.map((f) => (
              <li key={f.nome} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: f.cor }} />
                  {f.nome}
                </span>
                <span className="text-gray-900 dark:text-white">
                  {fmt(f.real)}
                  <span className="ml-1.5 text-xs text-gray-500 dark:text-gray-400">
                    {base > 0 ? `${Math.round((f.valor / base) * 100)}%` : "0%"}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          {incompleto && (
            <p className="text-xs text-amber-600 dark:text-amber-400">Parte dos dados não carregou: o total está incompleto.</p>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export function CardCarteira() {
  const { rendaFixa, carteira, darfsAbertos, carregando, erro } = useInvestimentos();
  const fmt = useMoeda();

  const pctRf = rendaFixa.principal > 0 ? (rendaFixa.rendimentoLiquido / rendaFixa.principal) * 100 : 0;
  const totalDarf = darfsAbertos.reduce((s, d) => s + d.valor, 0);
  const proximoDarf = [...darfsAbertos].sort((a, b) => (a.vencimento < b.vencimento ? -1 : 1))[0];

  const linha = (rotulo: string, valor: string, cor = "text-gray-900 dark:text-white") => (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-gray-500 dark:text-gray-400">{rotulo}</span>
      <span className={`font-medium ${cor}`}>{valor}</span>
    </div>
  );
  const corResultado = (v: number) => (v >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400");

  return (
    <Card className="dark:bg-gray-900 dark:border-gray-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
          <Briefcase className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          Carteira
        </CardTitle>
      </CardHeader>
      {carregando ? <Carregando /> : (
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: COR_RENDA_FIXA }}>
              Renda fixa · {rendaFixa.quantidade} aplicaç{rendaFixa.quantidade === 1 ? "ão" : "ões"}
            </p>
            {erro.rendaFixa ? <p className="text-xs text-red-500">Indisponível</p> : (
              <>
                {linha("Valor líquido", fmt(rendaFixa.liquido))}
                {linha("Aplicado", fmt(rendaFixa.principal))}
                {linha("Rendimento líquido", `${fmt(rendaFixa.rendimentoLiquido)} (${fmtPct(pctRf)})`, corResultado(rendaFixa.rendimentoLiquido))}
              </>
            )}
          </div>

          <div className="space-y-1.5 pt-3 border-t border-gray-200 dark:border-gray-800">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: COR_RENDA_VARIAVEL }}>
              Renda variável · {carteira.ativos.length} ativo{carteira.ativos.length === 1 ? "" : "s"}
            </p>
            {erro.rendaVariavel ? <p className="text-xs text-red-500">Indisponível</p> : (
              <>
                {linha("Valor de mercado", fmt(carteira.valorMercado))}
                {linha("Custo", fmt(carteira.custoTotal))}
                {linha(
                  "Resultado não realizado",
                  `${fmt(carteira.resultadoNaoRealizado)} (${fmtPct(carteira.resultadoNaoRealizadoPct)})`,
                  corResultado(carteira.resultadoNaoRealizado),
                )}
                {carteira.semCotacao > 0 && (
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">
                    {carteira.semCotacao} ativo{carteira.semCotacao === 1 ? "" : "s"} sem cotação, avaliado{carteira.semCotacao === 1 ? "" : "s"} pelo custo.
                  </p>
                )}
              </>
            )}
          </div>

          {darfsAbertos.length > 0 && proximoDarf && (
            // abre direto a seção de IR da renda variável
            <Link
              href="/aplicacoes?rv=ir"
              className="flex items-start gap-2 p-2.5 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/30 dark:hover:bg-amber-950/50 transition-colors"
            >
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
              <span className="text-xs text-amber-800 dark:text-amber-200">
                {darfsAbertos.length === 1 ? "1 DARF em aberto" : `${darfsAbertos.length} DARFs em aberto`}: {fmt(totalDarf)}.
                {" "}Próximo vencimento em {fmtData(proximoDarf.vencimento)}.
              </span>
            </Link>
          )}

          <Link href="/aplicacoes" className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline">
            Ver investimentos <ArrowRight className="w-4 h-4" />
          </Link>
        </CardContent>
      )}
    </Card>
  );
}

export function CardProventosResumo() {
  const { proventos, carregando, erro } = useInvestimentos();
  const fmt = useMoeda();
  const { mask } = useHideValues();
  const temProventos = proventos.porMes.some((m) => m.total > 0);

  return (
    <Card className="dark:bg-gray-900 dark:border-gray-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
          <Coins className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          Proventos
        </CardTitle>
      </CardHeader>
      {carregando ? <Carregando /> : erro.proventos ? (
        <CardContent><p className="text-sm text-red-500">Não foi possível carregar os proventos.</p></CardContent>
      ) : (
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Últimos 12 meses</p>
              <p className="text-xl font-bold text-green-600 dark:text-green-400">{fmt(proventos.ultimos12m)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">No ano</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{fmt(proventos.noAno)}</p>
            </div>
          </div>
          {temProventos ? (
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={proventos.porMes} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fontSize: 9 }} interval={1} className="fill-gray-500 dark:fill-gray-400" />
                <Tooltip formatter={(v) => [mask(formatarMoeda(Number(v ?? 0))), "Proventos"]} />
                <Bar dataKey="total" fill={COR_RENDA_VARIAVEL} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-center text-gray-500 dark:text-gray-400 py-6">Nenhum provento nos últimos 12 meses.</p>
          )}
          <p className="text-[11px] text-gray-400 dark:text-gray-500">Valores líquidos, como a B3 informa.</p>
        </CardContent>
      )}
    </Card>
  );
}
