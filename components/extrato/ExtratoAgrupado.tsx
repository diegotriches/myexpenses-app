"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  Store,
  MapPin,
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
import { PageHeader } from "@/components/common/PageHeader";
import { KpiCard } from "@/components/common/KpiCard";
import { Skeleton } from "@/components/ui/skeleton";
import { iconOptions } from "@/utils/iconOptions";
import { useHideValues } from "@/contexts/HideValuesContext";
import { formatarMoeda } from "@/utils/formatadores";
import { useExtratoAgrupado } from "@/hooks/useExtratoAgrupado";
import type { LancamentoAgrupado, OrigemExtratoAgrupado, TotaisExtratoAgrupado } from "@/types/extratoAgrupado";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const MESES_CURTOS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const ANO_ATUAL = new Date().getFullYear();
const ANO_MIN = ANO_ATUAL - 5;
const ANO_MAX = ANO_ATUAL + 1;

const formatarCompacto = (v: number) =>
  Math.abs(v) >= 1000 ? `R$ ${(v / 1000).toFixed(1)}k` : formatarMoeda(v);

// As datas são gravadas em UTC à meia-noite: leia em UTC para não "voltar um dia"
const formatarDia = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" });

const mesDoLancamento = (iso: string) => new Date(iso).getUTCMonth() + 1;

const VOLTAR: Record<OrigemExtratoAgrupado, { href: string; rotulo: string }> = {
  categorias: { href: "/categorias", rotulo: "Categorias" },
  estabelecimentos: { href: "/estabelecimentos", rotulo: "Estabelecimentos" },
};

interface Props {
  origem: OrigemExtratoAgrupado;
  id: string;
}

/**
 * Extrato de uma categoria ou de um estabelecimento: resumo, gráfico mensal e lançamentos paginados.
 * Categoria pode ser "ambos" (mostra saldo); estabelecimento usa o tipo predominante dos lançamentos.
 */
export default function ExtratoAgrupado({ origem, id }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { mask } = useHideValues();
  const ehCategoria = origem === "categorias";
  const voltar = VOLTAR[origem];

  const anoInicial = Number(searchParams.get("ano")) || ANO_ATUAL;
  const mesParam = searchParams.get("mes");

  const [ano, setAno] = useState(Math.min(Math.max(anoInicial, ANO_MIN), ANO_MAX));
  // null = ano inteiro. Categoria abre no mês atual; estabelecimento, no ano inteiro (costuma ter poucos lançamentos por mês)
  const [mes, setMes] = useState<number | null>(() => {
    if (mesParam === "todos") return null;
    if (mesParam) return Number(mesParam);
    return ehCategoria ? new Date().getMonth() + 1 : null;
  });
  const [tipo, setTipo] = useState<"todos" | "entrada" | "saida">("todos");
  const [busca, setBusca] = useState("");
  const [buscaDebounced, setBuscaDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setBuscaDebounced(busca.trim()), 350);
    return () => clearTimeout(t);
  }, [busca]);

  const query = useExtratoAgrupado(origem, id, { ano, mes, tipo, busca: buscaDebounced });

  const primeira = query.data?.pages[0];
  const categoria = primeira?.categoria;
  const estab = primeira?.estabelecimento;
  const identidade = ehCategoria ? categoria : estab;
  // O que o total mede: receita, despesa ou saldo (só categoria "ambos")
  const modo = ehCategoria ? categoria?.tipo : (primeira?.tipoPrincipal ?? "saida");
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
    if (!primeira || !identidade) return null;
    const medida = (t: TotaisExtratoAgrupado) =>
      modo === "entrada" ? t.totalEntrada
      : modo === "saida" ? t.totalSaida
      : t.totalEntrada - t.totalSaida;

    const atual = medida(primeira.resumo);
    const ant = medida(primeira.anterior);
    const variacao = ant !== 0 ? ((atual - ant) / Math.abs(ant)) * 100 : null;
    const volume = primeira.resumo.totalEntrada + primeira.resumo.totalSaida;
    const media = primeira.resumo.quantidade > 0 ? volume / primeira.resumo.quantidade : 0;
    // Estabelecimento: valor do tipo secundário no período (só exibido quando existe)
    const outro = ehCategoria ? 0 : modo === "entrada" ? primeira.resumo.totalSaida : primeira.resumo.totalEntrada;
    return { atual, ant, variacao, media, outro, quantidade: primeira.resumo.quantidade };
  }, [primeira, identidade, modo, ehCategoria]);

  // Para despesa, "subir" é ruim; para receita, bom
  const subiuEhRuim = modo === "saida";

  const rotuloTotal =
    modo === "entrada" ? "Total recebido"
    : modo === "saida" ? "Total gasto"
    : "Saldo da categoria";
  const rotuloOutro = modo === "entrada" ? "gasto" : "recebido";

  // ── Gráfico ─────────────────────────────────────────────────────────────
  const dadosGrafico = useMemo(
    () =>
      (primeira?.porMes ?? []).map((m) => ({
        mes: m.mes,
        label: MESES_CURTOS[m.mes - 1],
        valor:
          modo === "entrada" ? m.entrada
          : modo === "saida" ? m.saida
          : m.entrada - m.saida,
      })),
    [primeira, modo]
  );
  const corBarra = modo === "entrada" ? "#16a34a" : modo === "saida" ? "#dc2626" : "#2563eb";
  const tituloGrafico = ehCategoria
    ? (modo === "ambos" ? "Saldo por mês" : "Por mês")
    : `${modo === "entrada" ? "Recebido" : "Gasto"} por mês`;
  const rotuloTooltip = ehCategoria
    ? (modo === "ambos" ? "Saldo" : "Total")
    : (modo === "entrada" ? "Recebido" : "Gasto");

  // ── Agrupamento (ano inteiro = por mês) ─────────────────────────────────
  const grupos = useMemo(() => {
    if (mes !== null) return [{ titulo: null as string | null, itens: lancamentos }];
    const mapa = new Map<number, LancamentoAgrupado[]>();
    for (const l of lancamentos) {
      const m = mesDoLancamento(l.data);
      mapa.set(m, [...(mapa.get(m) ?? []), l]);
    }
    return Array.from(mapa.entries()).map(([m, itens]) => ({ titulo: `${MESES[m - 1]} de ${ano}`, itens }));
  }, [lancamentos, mes, ano]);

  const IconComp = identidade ? iconOptions.find((i) => i.name === identidade.icone)?.component : null;
  const IconePadrao = ehCategoria ? Tag : Store;
  const gradiente = !ehCategoria
    ? "from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700"
    : modo === "entrada" ? "from-green-500 to-green-600"
    : modo === "saida" ? "from-red-500 to-red-600"
    : "from-blue-500 to-purple-600";
  const tipoLabel = modo === "entrada" ? "Receita" : modo === "saida" ? "Despesa" : "Ambos";
  const mostrarFiltroTipo = ehCategoria ? modo === "ambos" : !!primeira?.temEntradaESaida;
  const rotulosFiltroTipo = ehCategoria
    ? { entrada: "Entradas", saida: "Saídas" }
    : { entrada: "Receitas", saida: "Despesas" };

  // ── Estados ─────────────────────────────────────────────────────────────
  if (query.isError && !primeira) {
    return (
      <div className="page-container p-4 md:p-6 space-y-4">
        <Button variant="ghost" onClick={() => router.push(voltar.href)} className="-ml-2">
          <ArrowLeft size={16} className="mr-2" /> {voltar.rotulo}
        </Button>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{query.error.message}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="page-container p-4 md:p-6 space-y-5">
      {identidade ? (
        <PageHeader
          onVoltar={() => router.push(voltar.href)}
          iconeCustom={
            <div className={`w-10 h-10 md:w-11 md:h-11 rounded-xl bg-gradient-to-br ${gradiente} flex items-center justify-center shadow-sm flex-shrink-0`}>
              {IconComp ? <IconComp size={22} className="text-white" /> : <IconePadrao size={22} className="text-white" />}
            </div>
          }
          titulo={<span className="truncate">{identidade.nome}</span>}
          selo={ehCategoria ? <Badge className="text-xs">{tipoLabel}</Badge> : undefined}
          descricao={
            ehCategoria ? "Extrato da categoria" : estab?.localizacao ? (
              <span className="flex items-center gap-1 truncate"><MapPin size={12} className="flex-shrink-0" />{estab.localizacao}</span>
            ) : "Extrato do estabelecimento"
          }
        />
      ) : (
        <div className="flex items-center gap-3">
          <Skeleton className="h-11 w-11 rounded-xl" />
          <div className="space-y-2"><Skeleton className="h-5 w-40" /><Skeleton className="h-3 w-24" /></div>
        </div>
      )}

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
        <KpiCard
          titulo={rotuloTotal}
          valor={resumo ? mask(formatarMoeda(resumo.atual)) : ""}
          icone={Wallet}
          tom={modo === "entrada" ? "verde" : modo === "saida" ? "vermelho" : "azul"}
          tomValor={modo === "ambos" && resumo ? (resumo.atual >= 0 ? "positivo" : "negativo") : "neutro"}
          detalhe={resumo && resumo.outro > 0 ? `${rotuloOutro}: ${mask(formatarMoeda(resumo.outro))}` : undefined}
          carregando={query.isLoading || !resumo}
        />
        <KpiCard
          titulo="Lançamentos"
          valor={resumo?.quantidade ?? 0}
          icone={Receipt}
          tom="azul"
          carregando={query.isLoading || !resumo}
        />
        <KpiCard
          titulo="Média por lançamento"
          valor={resumo ? mask(formatarMoeda(resumo.media)) : ""}
          icone={Equal}
          tom="roxo"
          carregando={query.isLoading || !resumo}
        />
        <KpiCard
          titulo={mes === null ? "vs. ano anterior" : "vs. mês anterior"}
          valor={
            !resumo || resumo.variacao === null ? (
              <span className="text-sm md:text-base font-normal text-gray-400">Sem comparação</span>
            ) : (
              <span className="inline-flex items-center gap-1">
                {resumo.variacao > 0 ? <ArrowUpRight className="h-4 w-4 md:h-5 md:w-5" /> : <ArrowDownRight className="h-4 w-4 md:h-5 md:w-5" />}
                {Math.abs(resumo.variacao).toFixed(0)}%
              </span>
            )
          }
          icone={resumo && resumo.variacao !== null && resumo.variacao > 0 ? ArrowUpRight : ArrowDownRight}
          tom="laranja"
          tomValor={
            !resumo || resumo.variacao === null ? "neutro"
              : (resumo.variacao > 0) === subiuEhRuim ? "negativo" : "positivo"
          }
          detalhe={resumo && resumo.variacao !== null ? `antes: ${mask(formatarMoeda(resumo.ant))}` : undefined}
          carregando={query.isLoading || !resumo}
        />
      </div>

      {/* Gráfico mensal */}
      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-900 dark:text-white">
            {tituloGrafico} em {ano}
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
                formatter={(v) => [mask(formatarMoeda(Number(v ?? 0))), rotuloTooltip] as [string, string]}
                labelFormatter={(l) => String(l)}
              />
              <Bar
                dataKey="valor"
                radius={[4, 4, 0, 0]}
                onClick={(barra) => {
                  const mesClicado = (barra.payload as { mes?: number } | undefined)?.mes;
                  if (mesClicado) setMes(mesClicado);
                }}
                cursor="pointer"
              >
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
        {mostrarFiltroTipo && (
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
                {t === "todos" ? "Todos" : rotulosFiltroTipo[t]}
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
                              {l.descricao || (ehCategoria ? categoria?.nome : l.categoria) || "Sem descrição"}
                            </p>
                            <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 text-xs text-gray-500 dark:text-gray-400">
                              <span>{formatarDia(l.data)}</span>
                              {!ehCategoria && l.categoria && (
                                <span className="inline-flex items-center gap-1 px-1.5 rounded bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                                  <Tag size={10} />
                                  {l.categoria}
                                </span>
                              )}
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
