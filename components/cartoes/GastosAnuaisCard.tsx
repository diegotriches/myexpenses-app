"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CreditCard, Loader2, TrendingDown, CheckCircle2, Clock } from "lucide-react";
import { useHideValues } from "@/contexts/HideValuesContext";

interface PorMes {
  mes: number;
  label: string;
  total: number;
  pago: number;
  pendente: number;
}

interface PorCartao {
  id: number;
  nome: string;
  empresa: string | null;
  totalGasto: number;
  totalPago: number;
  totalPendente: number;
}

interface GastosAnuaisData {
  ano: number;
  totalGasto: number;
  totalPago: number;
  totalPendente: number;
  porMes: PorMes[];
  porCartao: PorCartao[];
}

const ANO_ATUAL = new Date().getFullYear();

const formatarMoeda = (valor: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);

const formatarCompacto = (valor: number) => {
  if (valor >= 1_000_000) return `R$${(valor / 1_000_000).toFixed(1)}M`;
  if (valor >= 10_000)    return `R$${(valor / 1_000).toFixed(1)}k`;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(valor);
};

function TooltipCustomizado({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 text-sm min-w-[160px]">
      <p className="font-semibold text-gray-700 dark:text-gray-200 mb-2">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center justify-between gap-4 mb-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: entry.fill }} />
            <span className="text-gray-500 dark:text-gray-400">{entry.name}</span>
          </div>
          <span className="font-medium tabular-nums" style={{ color: entry.fill }}>
            {formatarCompacto(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function GastosAnuaisCard() {
  const [ano, setAno] = useState<number | null>(null);
  const { mask } = useHideValues();

  const { data: anosData, isLoading: loadingAnos } = useQuery<{ anos: number[] }>({
    queryKey: ["cartoes-gastos-anos"],
    queryFn: async () => {
      const res = await fetch("/api/cartoes/gastos-anuais/anos");
      if (!res.ok) throw new Error("Erro ao carregar anos disponíveis");
      return res.json();
    },
    staleTime: 1000 * 60 * 10,
  });

  // ✅ CORRIGIDO: prioriza o ano vigente se ele tiver dados;
  // só usa o mais recente como fallback se o ano atual não estiver na lista.
  useEffect(() => {
    if (ano === null && anosData?.anos && anosData.anos.length > 0) {
      const temAnoAtual = anosData.anos.includes(ANO_ATUAL);
      setAno(temAnoAtual ? ANO_ATUAL : anosData.anos[0]);
    }
  }, [anosData, ano]);

  const anos            = anosData?.anos ?? [];
  const anoSelecionado  = ano ?? ANO_ATUAL;
  const usarSelect      = anos.length > 5;

  const { data, isLoading, isError } = useQuery<GastosAnuaisData>({
    queryKey: ["cartoes-gastos-anuais", anoSelecionado],
    queryFn: async () => {
      const res = await fetch(`/api/cartoes/gastos-anuais?ano=${anoSelecionado}`);
      if (!res.ok) throw new Error("Erro ao carregar gastos anuais");
      return res.json();
    },
    staleTime: 1000 * 60 * 5,
    enabled: !loadingAnos,
  });

  const semDados = !isLoading && !isError && data?.totalGasto === 0;

  const dadosGrafico = (data?.porMes ?? []).filter((m) => {
    const mesAtual = new Date().getMonth() + 1;
    return m.mes <= mesAtual || m.total > 0;
  });

  return (
    <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-950/40 flex items-center justify-center flex-shrink-0">
              <CreditCard size={20} className="text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">
                Gastos Anuais — Cartões de Crédito
              </p>
              {isLoading ? (
                <div className="h-7 w-44 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              ) : isError ? (
                <p className="text-sm text-red-500">Erro ao carregar</p>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    {mask(formatarMoeda(data?.totalGasto ?? 0))}
                  </span>
                  <div className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    <CheckCircle2 size={12} />
                    <span>Pago: {mask(formatarCompacto(data?.totalPago ?? 0))}</span>
                  </div>
                  {(data?.totalPendente ?? 0) > 0 && (
                    <div className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                      <Clock size={12} />
                      <span>Pendente: {mask(formatarCompacto(data?.totalPendente ?? 0))}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {loadingAnos ? (
            <div className="h-9 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse self-start" />
          ) : usarSelect ? (
            <Select
              value={String(anoSelecionado)}
              onValueChange={(v) => setAno(Number(v))}
            >
              <SelectTrigger className="w-[110px] h-9 text-xs self-start">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {anos.map((a) => (
                  <SelectItem key={a} value={String(a)} className="text-xs">{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-900 rounded-lg p-1 self-start">
              {anos.map((a) => (
                <Button
                  key={a}
                  variant="ghost"
                  size="sm"
                  onClick={() => setAno(a)}
                  className={`h-7 px-3 text-xs font-medium rounded-md transition-all ${
                    anoSelecionado === a
                      ? "bg-white dark:bg-gray-700 text-purple-700 dark:text-purple-400 shadow-sm"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                  }`}
                >
                  {a}
                </Button>
              ))}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="h-52 flex items-center justify-center">
            <Loader2 size={28} className="animate-spin text-gray-400" />
          </div>
        ) : isError ? (
          <div className="h-52 flex items-center justify-center">
            <p className="text-sm text-red-500">Não foi possível carregar o gráfico.</p>
          </div>
        ) : semDados ? (
          <div className="h-52 flex flex-col items-center justify-center gap-2">
            <TrendingDown size={32} className="text-gray-300 dark:text-gray-600" />
            <p className="text-sm text-gray-400">Nenhuma fatura registrada em {anoSelecionado}.</p>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={dadosGrafico} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barSize={18}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-100 dark:text-gray-700" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "currentColor" }} className="text-gray-500 dark:text-gray-400" tickLine={false} axisLine={false} />
                <YAxis tickFormatter={formatarCompacto} tick={{ fontSize: 11, fill: "currentColor" }} className="text-gray-500 dark:text-gray-400" tickLine={false} axisLine={false} width={64} />
                <Tooltip content={<TooltipCustomizado />} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Bar dataKey="pago"     name="Pago"     stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} />
                <Bar dataKey="pendente" name="Pendente" stackId="a" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>

            {(data?.porCartao.length ?? 0) > 1 && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-2">
                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">
                  Por cartão
                </p>
                {data!.porCartao.map((c) => {
                  const pct = data!.totalGasto > 0 ? (c.totalGasto / data!.totalGasto) * 100 : 0;
                  return (
                    <div key={c.id} className="flex items-center gap-3">
                      <span className="text-xs text-gray-600 dark:text-gray-300 w-28 truncate flex-shrink-0">{c.nome}</span>
                      <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500 dark:bg-purple-400 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs font-semibold tabular-nums text-gray-700 dark:text-gray-300 w-20 text-right flex-shrink-0">
                        {mask(formatarCompacto(c.totalGasto))}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}