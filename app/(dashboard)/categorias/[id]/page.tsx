"use client";

// src/app/(dashboard)/categorias/[id]/page.tsx

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useInfiniteQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Search,
  Tag,
  TrendingUp,
  TrendingDown,
  Receipt,
  CreditCard,
  Landmark,
  Repeat,
  Loader2,
  AlertCircle,
  Wallet,
  Equal,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { iconOptions } from "@/utils/iconOptions";
import { useHideValues } from "@/contexts/HideValuesContext";
import { formatarMoeda } from "@/utils/formatadores";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Lancamento {
  id: string;
  data: string;
  tipo: "entrada" | "saida" | "estorno";
  descricao: string | null;
  valor: number;
  formaPagamento: string | null;
  contaId: string | null;
  contaNome: string | null;
  cartaoId: number | null;
  cartaoNome: string | null;
  parcelado: boolean | null;
  parcelas: number | null;
  parcelaAtual: number | null;
  recorrente: boolean | null;
}

interface Totais {
  totalEntrada: number;
  totalSaida: number;
  quantidade: number;
}

interface ExtratoResponse {
  categoria: { id: string; nome: string; tipo: "entrada" | "saida" | "ambos"; icone: string };
  periodo: { ano: number; mes: number | null };
  resumo: Totais;
  anterior: Totais;
  porMes: { mes: number; entrada: number; saida: number }[];
  lancamentos: Lancamento[];
  temMais: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const MESES_CURTOS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const ANO_ATUAL = new Date().getFullYear();
const ANO_MIN = ANO_ATUAL - 5;
const ANO_MAX = ANO_ATUAL + 1;
const POR_PAGINA = 50;

const formatarCompacto = (v: number) =>
  Math.abs(v) >= 1000 ? `R$ ${(v / 1000).toFixed(1)}k` : formatarMoeda(v);

// As datas são gravadas em UTC à meia-noite: leia em UTC para não "voltar um dia"
const formatarDia = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" });

const mesDoLancamento = (iso: string) => new Date(iso).getUTCMonth() + 1;

// ─── Página ───────────────────────────────────────────────────────────────────

export default function CategoriaExtratoPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const searchParams = useSearchParams();
  const { mask } = useHideValues();

  const anoInicial = Number(searchParams.get("ano")) || ANO_ATUAL;
  const mesParam = searchParams.get("mes");

  const [ano, setAno] = useState(Math.min(Math.max(anoInicial, ANO_MIN), ANO_MAX));
  // null = ano inteiro
  const [mes, setMes] = useState<number | null>(
    mesParam === "todos" ? null : mesParam ? Number(mesParam) : new Date().getMonth() + 1
  );
  const [tipo, setTipo] = useState<"todos" | "entrada" | "saida">("todos");
  const [busca, setBusca] = useState("");
  const [buscaDebounced, setBuscaDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setBuscaDebounced(busca.trim()), 350);
    return () => clearTimeout(t);
  }, [busca]);

  const query = useInfiniteQuery<ExtratoResponse>({
    // Prefixo "transacoes": é invalidado junto com qualquer mudança em transações
    queryKey: ["transacoes", "categoria-extrato", id, ano, mes, tipo, buscaDebounced],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const p = new URLSearchParams({ ano: String(ano), limit: String(POR_PAGINA), offset: String(pageParam) });
      if (mes) p.set("mes", String(mes));
      if (tipo !== "todos") p.set("tipo", tipo);
      if (buscaDebounced) p.set("busca", buscaDebounced);
      const res = await fetch(`/api/categorias/${id}/extrato?${p.toString()}`);
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || "Erro ao carregar extrato");
      }
      return res.json();
    },
    getNextPageParam: (ultima, todas) =>
      ultima.temMais ? todas.reduce((s, p) => s + p.lancamentos.length, 0) : undefined,
    staleTime: 2 * 60 * 1000,
  });

  const primeira = query.data?.pages[0];
  const categoria = primeira?.categoria;
  const lancamentos = useMemo(
    () => query.data?.pages.flatMap((p) => p.lancamentos) ?? [],
    [query.data]
  );

  // ── Navegação de período ────────────────────────────────────────────────
  const anterior = () => {
    if (mes === null) return setAno((a) => Math.max(ANO_MIN, a - 1));
    if (mes === 1) {
      if (ano > ANO_MIN) { setAno(ano - 1); setMes(12); }
    } else setMes(mes - 1);
  };
  const proximo = () => {
    if (mes === null) return setAno((a) => Math.min(ANO_MAX, a + 1));
    if (mes === 12) {
      if (ano < ANO_MAX) { setAno(ano + 1); setMes(1); }
    } else setMes(mes + 1);
  };
  const noInicio = mes === null ? ano <= ANO_MIN : ano <= ANO_MIN && mes === 1;
  const noFim = mes === null ? ano >= ANO_MAX : ano >= ANO_MAX && mes === 12;

  // ── Resumo ──────────────────────────────────────────────────────────────
  const resumo = useMemo(() => {
    if (!primeira || !categoria) return null;
    const medida = (t: Totais) =>
      categoria.tipo === "entrada" ? t.totalEntrada
      : categoria.tipo === "saida" ? t.totalSaida
      : t.totalEntrada - t.totalSaida;

    const atual = medida(primeira.resumo);
    const ant = medida(primeira.anterior);
    const variacao = ant !== 0 ? ((atual - ant) / Math.abs(ant)) * 100 : null;
    const volume = primeira.resumo.totalEntrada + primeira.resumo.totalSaida;
    const media = primeira.resumo.quantidade > 0 ? volume / primeira.resumo.quantidade : 0;
    return { atual, ant, variacao, media, quantidade: primeira.resumo.quantidade };
  }, [primeira, categoria]);

  // Para despesa, "subir" é ruim; para receita, bom
  const subiuEhRuim = categoria?.tipo === "saida";

  const rotuloTotal =
    categoria?.tipo === "entrada" ? "Total recebido"
    : categoria?.tipo === "saida" ? "Total gasto"
    : "Saldo da categoria";

  // ── Gráfico ─────────────────────────────────────────────────────────────
  const dadosGrafico = useMemo(
    () =>
      (primeira?.porMes ?? []).map((m) => ({
        mes: m.mes,
        label: MESES_CURTOS[m.mes - 1],
        valor:
          categoria?.tipo === "entrada" ? m.entrada
          : categoria?.tipo === "saida" ? m.saida
          : m.entrada - m.saida,
      })),
    [primeira, categoria]
  );
  const corBarra = categoria?.tipo === "entrada" ? "#16a34a" : categoria?.tipo === "saida" ? "#dc2626" : "#2563eb";

  // ── Agrupamento (ano inteiro = por mês) ─────────────────────────────────
  const grupos = useMemo(() => {
    if (mes !== null) return [{ titulo: null as string | null, itens: lancamentos }];
    const mapa = new Map<number, Lancamento[]>();
    for (const l of lancamentos) {
      const m = mesDoLancamento(l.data);
      mapa.set(m, [...(mapa.get(m) ?? []), l]);
    }
    return Array.from(mapa.entries()).map(([m, itens]) => ({ titulo: `${MESES[m - 1]} de ${ano}`, itens }));
  }, [lancamentos, mes, ano]);

  const IconComp = categoria ? iconOptions.find((i) => i.name === categoria.icone)?.component : null;
  const gradiente =
    categoria?.tipo === "entrada" ? "from-green-500 to-green-600"
    : categoria?.tipo === "saida" ? "from-red-500 to-red-600"
    : "from-blue-500 to-purple-600";
  const tipoLabel = categoria?.tipo === "entrada" ? "Receita" : categoria?.tipo === "saida" ? "Despesa" : "Ambos";

  // ── Estados ─────────────────────────────────────────────────────────────
  if (query.isError && !primeira) {
    return (
      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-4">
        <Button variant="ghost" onClick={() => router.push("/categorias")} className="-ml-2">
          <ArrowLeft size={16} className="mr-2" /> Categorias
        </Button>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{(query.error as Error).message}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const cardResumo = "!py-0 !gap-0 border-l-4 dark:bg-gray-900 dark:border-gray-800 overflow-hidden";

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-5">
      {/* Cabeçalho */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/categorias")} className="h-9 w-9 mt-1 flex-shrink-0">
          <ArrowLeft size={18} />
        </Button>
        {categoria ? (
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradiente} flex items-center justify-center shadow-md flex-shrink-0`}>
              {IconComp ? <IconComp size={24} className="text-white" /> : <Tag size={24} className="text-white" />}
            </div>
            <div className="min-w-0">
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white truncate">{categoria.nome}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge className="text-xs">{tipoLabel}</Badge>
                <span className="text-xs text-gray-500 dark:text-gray-400">Extrato da categoria</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-xl" />
            <div className="space-y-2"><Skeleton className="h-5 w-40" /><Skeleton className="h-3 w-24" /></div>
          </div>
        )}
      </div>

      {/* Período */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={anterior} disabled={noInicio}>
            <ChevronLeft size={16} />
          </Button>
          <div className="min-w-[150px] text-center text-sm font-semibold text-gray-900 dark:text-white px-2">
            {mes === null ? `Ano de ${ano}` : `${MESES[mes - 1]} de ${ano}`}
          </div>
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={proximo} disabled={noFim}>
            <ChevronRight size={16} />
          </Button>
        </div>
        <div className="inline-flex rounded-md bg-muted p-1 dark:bg-gray-800">
          {([
            { v: false, label: "Mês" },
            { v: true, label: "Ano inteiro" },
          ] as const).map((o) => {
            const ativo = (mes === null) === o.v;
            return (
              <button
                key={o.label}
                type="button"
                onClick={() => setMes(o.v ? null : mes ?? (ano === ANO_ATUAL ? new Date().getMonth() + 1 : 1))}
                className={`px-3 py-1.5 text-sm font-medium rounded-sm transition-all ${
                  ativo ? "bg-background text-foreground shadow-sm dark:bg-gray-700 dark:text-white" : "text-muted-foreground"
                }`}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
        {query.isLoading || !resumo ? (
          [...Array(4)].map((_, i) => (
            <Card key={i} className={`${cardResumo} border-l-gray-200 dark:border-l-gray-700`}>
              <CardContent className="!px-3 !py-3 md:!px-4 md:!py-5 space-y-2">
                <Skeleton className="h-3 w-20" /><Skeleton className="h-6 w-28" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card className={`${cardResumo} ${categoria?.tipo === "entrada" ? "border-l-green-500" : categoria?.tipo === "saida" ? "border-l-red-500" : "border-l-blue-500"}`}>
              <CardContent className="!px-3 !py-3 md:!px-4 md:!py-5">
                <p className="text-[11px] md:text-sm font-medium text-gray-900 dark:text-white flex items-center justify-between">
                  {rotuloTotal}
                  <Wallet className="h-3 w-3 md:h-4 md:w-4 text-gray-400" />
                </p>
                <p className={`text-base md:text-2xl font-bold mt-1 ${
                  categoria?.tipo === "entrada" || (categoria?.tipo === "ambos" && resumo.atual >= 0)
                    ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                }`}>
                  {mask(formatarMoeda(resumo.atual))}
                </p>
              </CardContent>
            </Card>

            <Card className={`${cardResumo} border-l-blue-500`}>
              <CardContent className="!px-3 !py-3 md:!px-4 md:!py-5">
                <p className="text-[11px] md:text-sm font-medium text-gray-900 dark:text-white flex items-center justify-between">
                  Lançamentos
                  <Receipt className="h-3 w-3 md:h-4 md:w-4 text-gray-400" />
                </p>
                <p className="text-base md:text-2xl font-bold mt-1 text-blue-600 dark:text-blue-400">{resumo.quantidade}</p>
              </CardContent>
            </Card>

            <Card className={`${cardResumo} border-l-purple-500`}>
              <CardContent className="!px-3 !py-3 md:!px-4 md:!py-5">
                <p className="text-[11px] md:text-sm font-medium text-gray-900 dark:text-white flex items-center justify-between">
                  Média por lançamento
                  <Equal className="h-3 w-3 md:h-4 md:w-4 text-gray-400" />
                </p>
                <p className="text-base md:text-2xl font-bold mt-1 text-purple-600 dark:text-purple-400">
                  {mask(formatarMoeda(resumo.media))}
                </p>
              </CardContent>
            </Card>

            <Card className={`${cardResumo} border-l-orange-500`}>
              <CardContent className="!px-3 !py-3 md:!px-4 md:!py-5">
                <p className="text-[11px] md:text-sm font-medium text-gray-900 dark:text-white">
                  {mes === null ? "vs. ano anterior" : "vs. mês anterior"}
                </p>
                {resumo.variacao === null ? (
                  <p className="text-sm md:text-base text-gray-400 mt-1">Sem comparação</p>
                ) : (
                  <>
                    <p className={`text-base md:text-2xl font-bold mt-1 flex items-center gap-1 ${
                      (resumo.variacao > 0) === subiuEhRuim ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
                    }`}>
                      {resumo.variacao > 0 ? <ArrowUpRight className="h-4 w-4 md:h-5 md:w-5" /> : <ArrowDownRight className="h-4 w-4 md:h-5 md:w-5" />}
                      {Math.abs(resumo.variacao).toFixed(0)}%
                    </p>
                    <p className="text-[9px] md:text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                      antes: {mask(formatarMoeda(resumo.ant))}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Gráfico mensal */}
      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-900 dark:text-white">
            {categoria?.tipo === "ambos" ? "Saldo por mês" : "Por mês"} em {ano}
            <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">toque numa barra para filtrar o mês</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={dadosGrafico} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={52}
                tickFormatter={(v) => mask(formatarCompacto(v))}
              />
              <Tooltip
                formatter={(v) => [mask(formatarMoeda(Number(v ?? 0))), categoria?.tipo === "ambos" ? "Saldo" : "Total"] as [string, string]}
                labelFormatter={(l) => String(l)}
              />
              <Bar dataKey="valor" radius={[4, 4, 0, 0]} onClick={(d: any) => d?.mes && setMes(d.mes)} cursor="pointer">
                {dadosGrafico.map((d) => (
                  <Cell key={d.mes} fill={corBarra} fillOpacity={mes === null || mes === d.mes ? 1 : 0.35} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Filtros da lista */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <Input
            placeholder="Buscar por descrição..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9"
          />
        </div>
        {categoria?.tipo === "ambos" && (
          <div className="inline-flex rounded-md bg-muted p-1 dark:bg-gray-800 self-start">
            {(["todos", "entrada", "saida"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTipo(t)}
                className={`px-3 py-1.5 text-sm font-medium rounded-sm transition-all ${
                  tipo === t ? "bg-background text-foreground shadow-sm dark:bg-gray-700 dark:text-white" : "text-muted-foreground"
                }`}
              >
                {t === "todos" ? "Todos" : t === "entrada" ? "Entradas" : "Saídas"}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lista */}
      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardContent className="p-0">
          {query.isLoading ? (
            <div className="p-4 space-y-3">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : lancamentos.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="mx-auto mb-3 text-gray-300 dark:text-gray-600" size={44} />
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Nenhum lançamento neste período</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {buscaDebounced ? "Tente outra busca ou limpe os filtros." : "Navegue para outro mês ou veja o ano inteiro."}
              </p>
            </div>
          ) : (
            <div>
              {grupos.map((g, gi) => (
                <div key={g.titulo ?? gi}>
                  {g.titulo && (
                    <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/60 border-y border-gray-100 dark:border-gray-800">
                      {g.titulo}
                    </div>
                  )}
                  <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                    {g.itens.map((l) => {
                      const entrada = l.tipo === "entrada" || l.tipo === "estorno";
                      const noCartao = l.formaPagamento === "cartao" || !!l.cartaoId;
                      return (
                        <li key={l.id} className="flex items-center gap-3 px-4 py-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                            entrada ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30"
                          }`}>
                            {entrada
                              ? <TrendingUp size={16} className="text-green-600 dark:text-green-400" />
                              : <TrendingDown size={16} className="text-red-600 dark:text-red-400" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {l.descricao || categoria?.nome || "Sem descrição"}
                            </p>
                            <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 text-xs text-gray-500 dark:text-gray-400">
                              <span>{formatarDia(l.data)}</span>
                              <span className="inline-flex items-center gap-1">
                                {noCartao ? <CreditCard size={11} /> : <Landmark size={11} />}
                                {noCartao ? l.cartaoNome ?? "Cartão" : l.contaNome ?? "Sem conta"}
                              </span>
                              {l.parcelado && l.parcelas && (
                                <span className="px-1.5 rounded bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                                  {l.parcelaAtual}/{l.parcelas}
                                </span>
                              )}
                              {l.recorrente && (
                                <span className="inline-flex items-center gap-0.5">
                                  <Repeat size={11} /> recorrente
                                </span>
                              )}
                            </div>
                          </div>
                          <span className={`text-sm font-semibold tabular-nums flex-shrink-0 ${
                            entrada ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                          }`}>
                            {entrada ? "+" : "−"} {mask(formatarMoeda(l.valor))}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}

              {query.hasNextPage && (
                <div className="p-4 text-center border-t border-gray-100 dark:border-gray-800">
                  <Button variant="outline" onClick={() => query.fetchNextPage()} disabled={query.isFetchingNextPage}>
                    {query.isFetchingNextPage ? <><Loader2 size={14} className="mr-2 animate-spin" /> Carregando...</> : "Carregar mais"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}