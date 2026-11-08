"use client";

// src/components/aplicacao/RendaVariavel.tsx

import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  Plus, LineChart, Loader2, AlertCircle, Info, ChevronDown, ChevronUp,
  Pencil, Trash2, ShoppingCart, HandCoins, RefreshCw, Upload,
} from "lucide-react";
import { useHideValues } from "@/contexts/HideValuesContext";
import {
  useRendaVariavel, useCriarOperacaoRv, useExcluirOperacaoRv, useSalvarCotacaoRv,
  useAtualizarCotacoesRv, useProventosRv,
} from "@/hooks/useRendaVariavel";
import type { OperacaoRvApi } from "@/services/rendaVariavelService";
import type { Conta } from "@/types/conta";
import { hojeBrt } from "@/utils/aplicacaoSimulacao";
import {
  resumirCarteira, sugerirTipoAtivo, normalizarTicker, totalOperacao,
  TIPO_ATIVO_LABEL, TICKER_REGEX,
  type AtivoCarteira, type PosicaoAtivo, type TipoAtivo, type TipoOperacao,
} from "@/utils/rendaVariavelUtils";
import MovCampoConta from "@/components/transacao/MovCampoConta";
import ProventosRendaVariavel from "@/components/aplicacao/ProventosRendaVariavel";
import ImportarOperacoesDialog from "@/components/aplicacao/ImportarOperacoesDialog";
import { EVENTO_LABEL } from "@/utils/rendaVariavelUtils";

interface Props {
  contas: Conta[];
}

const formatarMoeda = (valor: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);

const formatarPreco = (valor: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(valor);

const fmtIso = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/");

const fmtDataHora = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });

// Aceita "38,50" e "1.234,56"
const lerDecimal = (s: string): number => {
  const t = s.trim();
  if (!t) return NaN;
  return Number(t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t);
};

const COR_TIPO: Record<TipoAtivo, string> = {
  acao: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  fii: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  etf: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
  bdr: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
};

interface FormOperacao {
  tipo: TipoOperacao;
  ticker: string;
  tipoAtivo: TipoAtivo;
  tipoAtivoManual: boolean;
  data: string;
  quantidade: string;
  preco: string;
  taxas: string;
  contaId: string;
  movimentar: boolean;
}

export default function RendaVariavel({ contas }: Props) {
  const { mask } = useHideValues();
  const { data, isLoading } = useRendaVariavel();
  const criar = useCriarOperacaoRv();
  const excluir = useExcluirOperacaoRv();
  const salvarCotacao = useSalvarCotacaoRv();
  const atualizarCotacoes = useAtualizarCotacoesRv();
  const { data: proventos = [] } = useProventosRv();

  const hojeIso = hojeBrt();
  const operacoes = useMemo(() => data?.operacoes ?? [], [data]);
  const cotacoes = useMemo(() => data?.cotacoes ?? [], [data]);
  const carteira = useMemo(() => resumirCarteira(operacoes, cotacoes), [operacoes, cotacoes]);
  // total de proventos recebidos por ticker (para mostrar em cada card)
  const provPorTicker = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of proventos) m.set(p.ticker, (m.get(p.ticker) ?? 0) + p.valorLiquido);
    return m;
  }, [proventos]);

  // Ao abrir a aba, busca cotações novas uma vez (o servidor só consulta a brapi
  // dos ativos cuja cotação ficou velha, então abrir a aba não gasta cota à toa)
  const buscouAoAbrir = useRef(false);
  useEffect(() => {
    if (buscouAoAbrir.current || !data || carteira.ativos.length === 0) return;
    buscouAoAbrir.current = true;
    atualizarCotacoes.mutate({ forcar: false, silencioso: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, carteira.ativos.length]);

  const [abertos, setAbertos] = useState<Set<string>>(new Set());
  const [verEncerrados, setVerEncerrados] = useState(false);

  // ── Nova operação ──────────────────────────────────────────────────────────
  const formVazio = (tipo: TipoOperacao = "compra", ticker = ""): FormOperacao => ({
    tipo,
    ticker,
    tipoAtivo: tipoDoTicker(ticker),
    tipoAtivoManual: false,
    data: hojeIso,
    quantidade: "",
    preco: "",
    taxas: "",
    contaId: contas[0]?.id ?? "",
    movimentar: true,
  });

  // Tipo do ativo: o que já está na carteira ou a sugestão pelo sufixo
  function tipoDoTicker(ticker: string): TipoAtivo {
    const t = normalizarTicker(ticker);
    const existente = operacoes.find((o) => o.ticker === t);
    return existente ? existente.tipoAtivo : sugerirTipoAtivo(t);
  }

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormOperacao>(formVazio());
  const [erro, setErro] = useState<string | null>(null);

  const abrirModal = (tipo: TipoOperacao = "compra", ticker = "") => {
    setForm(formVazio(tipo, ticker));
    setErro(null);
    setModalOpen(true);
  };

  const updateForm = <K extends keyof FormOperacao>(k: K, v: FormOperacao[K]) => {
    setForm((f) => {
      const novo = { ...f, [k]: v };
      if (k === "ticker") {
        const t = normalizarTicker(String(v));
        novo.ticker = t;
        if (!f.tipoAtivoManual) novo.tipoAtivo = tipoDoTicker(t);
      }
      if (k === "tipoAtivo") novo.tipoAtivoManual = true;
      // por padrão só movimenta o saldo quando a operação é de hoje
      if (k === "data") novo.movimentar = v === hojeIso;
      return novo;
    });
  };

  const qtdNum = Number(form.quantidade);
  const precoNum = lerDecimal(form.preco);
  const taxasNum = form.taxas.trim() ? lerDecimal(form.taxas) : 0;
  const totalPrevisto =
    Number.isFinite(qtdNum) && Number.isFinite(precoNum) && Number.isFinite(taxasNum) && qtdNum > 0 && precoNum > 0
      ? totalOperacao({ tipo: form.tipo, quantidade: qtdNum, precoUnitario: precoNum, taxas: taxasNum })
      : 0;

  const posicaoDoTicker = carteira.ativos.find((a) => a.ticker === form.ticker);

  const confirmarOperacao = async () => {
    setErro(null);
    if (!TICKER_REGEX.test(form.ticker)) return setErro("Informe um ticker válido (ex.: PETR4, BRCR11).");
    if (!Number.isInteger(qtdNum) || qtdNum <= 0) return setErro("Informe a quantidade (número inteiro).");
    if (!Number.isFinite(precoNum) || precoNum <= 0) return setErro("Informe o preço unitário.");
    if (!Number.isFinite(taxasNum) || taxasNum < 0) return setErro("Taxas inválidas.");
    if (!form.data || form.data > hojeIso) return setErro("A data não pode ser futura.");
    if (form.movimentar && !form.contaId) return setErro("Escolha a conta para movimentar o saldo.");

    try {
      await criar.mutateAsync({
        ticker: form.ticker,
        tipoAtivo: form.tipoAtivo,
        tipo: form.tipo,
        data: form.data,
        quantidade: qtdNum,
        precoUnitario: precoNum,
        taxas: taxasNum,
        contaId: form.contaId || undefined,
        movimentarConta: form.movimentar,
      });
      setModalOpen(false);
    } catch (e: any) {
      setErro(e.message);
    }
  };

  // ── Cotação manual ─────────────────────────────────────────────────────────
  const [cotacaoAlvo, setCotacaoAlvo] = useState<AtivoCarteira | null>(null);
  const [cotacaoValor, setCotacaoValor] = useState("");
  const [cotacaoErro, setCotacaoErro] = useState<string | null>(null);

  const abrirCotacao = (a: AtivoCarteira) => {
    setCotacaoAlvo(a);
    setCotacaoValor(a.cotacao !== null ? String(a.cotacao).replace(".", ",") : "");
    setCotacaoErro(null);
  };

  const confirmarCotacao = async () => {
    const v = lerDecimal(cotacaoValor);
    if (!cotacaoAlvo) return;
    if (!Number.isFinite(v) || v <= 0) return setCotacaoErro("Informe um preço válido.");
    try {
      await salvarCotacao.mutateAsync({ ticker: cotacaoAlvo.ticker, preco: v });
      setCotacaoAlvo(null);
    } catch (e: any) {
      setCotacaoErro(e.message);
    }
  };

  // ── Exclusão ───────────────────────────────────────────────────────────────
  const [excluirAlvo, setExcluirAlvo] = useState<OperacaoRvApi | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const confirmarExclusao = async () => {
    if (!excluirAlvo) return;
    try {
      await excluir.mutateAsync(excluirAlvo.id);
    } catch {
      /* o toast do hook já mostra o motivo */
    }
    setExcluirAlvo(null);
  };

  const alternar = (ticker: string) =>
    setAbertos((s) => {
      const n = new Set(s);
      if (n.has(ticker)) n.delete(ticker); else n.add(ticker);
      return n;
    });

  const cor = (v: number) =>
    v >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400";
  const sinal = (v: number) => (v >= 0 ? "+" : "");

  // ── Lista de operações de um ticker ───────────────────────────────────────
  const ListaOperacoes = ({ ticker }: { ticker: string }) => {
    const lista = operacoes
      .filter((o) => o.ticker === ticker)
      .sort((a, b) => (a.data === b.data ? (a.createdAt < b.createdAt ? 1 : -1) : a.data < b.data ? 1 : -1));
    return (
      <div className="border-t border-gray-100 dark:border-gray-800 pt-2 space-y-1.5">
        {lista.map((o) => (
          <div key={o.id} className="flex items-center justify-between gap-2 text-xs">
            <div className="min-w-0">
              <p className="text-gray-700 dark:text-gray-300">
                <span className={o.tipo === "compra" ? "text-blue-600 dark:text-blue-400 font-medium" : "text-orange-600 dark:text-orange-400 font-medium"}>
                  {o.evento ? EVENTO_LABEL[o.evento] : o.tipo === "compra" ? "Compra" : "Venda"}
                </span>{" "}
                · {fmtIso(o.data)}{o.dataEstimada && <span title="Data do negócio estimada a partir da liquidação"> *</span>}
              </p>
              <p className="text-gray-500 dark:text-gray-400 truncate">
                {o.evento ? `${o.quantidade} (custo zero)` : `${o.quantidade} × ${mask(formatarPreco(o.precoUnitario))}`}
                {o.taxas > 0 && ` · taxas ${mask(formatarMoeda(o.taxas))}`}
                {o.movimentouConta && " · movimentou a conta"}
                {o.origemImportacao && " · importada"}
              </p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <span className="font-medium text-gray-900 dark:text-white">
                {mask(formatarMoeda(totalOperacao(o)))}
              </span>
              <button
                type="button"
                aria-label="Excluir operação"
                onClick={() => setExcluirAlvo(o)}
                className="p-1 rounded text-gray-400 hover:text-red-600 dark:hover:text-red-400"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // ── Card de ativo aberto ──────────────────────────────────────────────────
  const CartaoAtivo = ({ a }: { a: AtivoCarteira }) => {
    const aberto = abertos.has(a.ticker);
    return (
      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardContent className="pt-5 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-base font-bold text-gray-900 dark:text-white">{a.ticker}</p>
                <Badge className={`text-[10px] px-2 py-0.5 border-0 ${COR_TIPO[a.tipoAtivo]}`}>
                  {TIPO_ATIVO_LABEL[a.tipoAtivo]}
                </Badge>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {a.quantidade.toLocaleString("pt-BR")} {a.quantidade === 1 ? "unidade" : "unidades"} · PM {mask(formatarPreco(a.precoMedio))}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-gray-900 dark:text-white">{mask(formatarMoeda(a.valorMercado))}</p>
              {a.cotacao !== null ? (
                <p className={`text-xs font-medium ${cor(a.resultadoNaoRealizado)}`}>
                  {mask(`${sinal(a.resultadoNaoRealizado)}${formatarMoeda(a.resultadoNaoRealizado)}`)} ({sinal(a.resultadoPct)}{a.resultadoPct.toFixed(2)}%)
                </p>
              ) : (
                <p className="text-xs text-amber-700 dark:text-amber-400">sem cotação</p>
              )}
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2.5 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Cotação</span>
              <span className="font-medium text-gray-900 dark:text-white flex items-center gap-1.5">
                {a.cotacao !== null ? mask(formatarPreco(a.cotacao)) : "—"}
                <button
                  type="button"
                  aria-label="Atualizar cotação"
                  onClick={() => abrirCotacao(a)}
                  className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              </span>
            </div>
            {a.variacaoDia !== null && (
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Variação no dia</span>
                <span className={`font-medium ${cor(a.variacaoDia)}`}>
                  {sinal(a.variacaoDia)}{a.variacaoDia.toFixed(2)}%
                </span>
              </div>
            )}
            {a.cotacaoAtualizadaEm && (
              <p className="text-[10px] text-gray-500 dark:text-gray-400">
                {a.cotacaoFonte === "manual" ? "Informada manualmente" : "Atualizada pela brapi"} em {fmtDataHora(a.cotacaoAtualizadaEm)}
              </p>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Custo total</span>
              <span className="font-medium text-gray-900 dark:text-white">{mask(formatarMoeda(a.custoTotal))}</span>
            </div>
            {(provPorTicker.get(a.ticker) ?? 0) > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Proventos recebidos</span>
                <span className="font-medium text-purple-600 dark:text-purple-400">
                  {mask(formatarMoeda(provPorTicker.get(a.ticker) ?? 0))}
                </span>
              </div>
            )}
            {a.vendas.length > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Realizado nas vendas</span>
                <span className={`font-medium ${cor(a.resultadoRealizado)}`}>{mask(formatarMoeda(a.resultadoRealizado))}</span>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1" onClick={() => abrirModal("compra", a.ticker)}>
              <ShoppingCart className="w-3.5 h-3.5 mr-1.5" />Comprar
            </Button>
            <Button size="sm" variant="outline" className="flex-1" onClick={() => abrirModal("venda", a.ticker)}>
              <HandCoins className="w-3.5 h-3.5 mr-1.5" />Vender
            </Button>
          </div>

          <button
            type="button"
            onClick={() => alternar(a.ticker)}
            className="w-full flex items-center justify-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            {aberto ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {aberto ? "Ocultar operações" : "Ver operações"}
          </button>
          {aberto && <ListaOperacoes ticker={a.ticker} />}
        </CardContent>
      </Card>
    );
  };

  const CartaoEncerrado = ({ p }: { p: PosicaoAtivo }) => {
    const aberto = abertos.has(p.ticker);
    return (
      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardContent className="pt-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{p.ticker}</p>
              <Badge className={`text-[10px] px-2 py-0.5 border-0 ${COR_TIPO[p.tipoAtivo]}`}>
                {TIPO_ATIVO_LABEL[p.tipoAtivo]}
              </Badge>
              <Badge variant="outline" className="text-[10px] px-2 py-0.5">Encerrada</Badge>
            </div>
            <span className={`text-sm font-bold ${cor(p.resultadoRealizado)}`}>
              {mask(`${sinal(p.resultadoRealizado)}${formatarMoeda(p.resultadoRealizado)}`)}
            </span>
          </div>
          <button
            type="button"
            onClick={() => alternar(p.ticker)}
            className="w-full flex items-center justify-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            {aberto ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {aberto ? "Ocultar operações" : "Ver operações"}
          </button>
          {aberto && <ListaOperacoes ticker={p.ticker} />}
        </CardContent>
      </Card>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  const vazio = carteira.ativos.length === 0 && carteira.encerrados.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-600 dark:text-gray-400 max-w-xl">
          Ações, FIIs, ETFs e BDRs. Preço médio por CPF, somando todas as corretoras. Cotações pela brapi, com cerca de 30 minutos de atraso.
        </p>
        <div className="flex gap-2">
          {carteira.ativos.length > 0 && (
            <Button
              variant="outline"
              onClick={() => atualizarCotacoes.mutate({ forcar: true })}
              disabled={atualizarCotacoes.isPending}
            >
              <RefreshCw className={`w-4 h-4 mr-1.5 ${atualizarCotacoes.isPending ? "animate-spin" : ""}`} />
              Atualizar cotações
            </Button>
          )}
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="w-4 h-4 mr-1.5" />
            Importar B3
          </Button>
          <Button onClick={() => abrirModal("compra")} className="bg-blue-700 hover:bg-blue-900 text-white">
            <Plus className="w-4 h-4 mr-1.5" />
            Nova operação
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
      ) : vazio ? (
        <div className="text-center py-12 md:py-16 bg-gray-50 dark:bg-gray-900/40 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
          <LineChart className="mx-auto mb-4 text-gray-300 dark:text-gray-700" size={48} />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Nenhum ativo na carteira
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto px-4">
            Registre sua primeira compra para acompanhar posição, preço médio e resultado.
          </p>
        </div>
      ) : (
        <>
          {carteira.ativos.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              {carteira.ativos.map((a) => <CartaoAtivo key={a.ticker} a={a} />)}
            </div>
          )}

          {carteira.encerrados.length > 0 && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setVerEncerrados((v) => !v)}
                className="flex items-center gap-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                {verEncerrados ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                Posições encerradas ({carteira.encerrados.length})
              </button>
              {verEncerrados && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
                  {carteira.encerrados.map((p) => <CartaoEncerrado key={p.ticker} p={p} />)}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Proventos ───────────────────────────────────────────────────── */}
      <ProventosRendaVariavel contas={contas} />

      <ImportarOperacoesDialog open={importOpen} onOpenChange={setImportOpen} existentes={operacoes} />

      {/* ── Modal Nova operação ─────────────────────────────────────────── */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova operação</DialogTitle>
            <DialogDescription>Registre uma compra ou venda de ativos da B3.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-2">
              {(["compra", "venda"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => updateForm("tipo", t)}
                  className={[
                    "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                    form.tipo === t
                      ? t === "compra"
                        ? "border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300"
                        : "border-orange-600 bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-300"
                      : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400",
                  ].join(" ")}
                >
                  {t === "compra" ? "Compra" : "Venda"}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="rv-ticker">Ticker</Label>
                <Input
                  id="rv-ticker"
                  value={form.ticker}
                  maxLength={7}
                  placeholder="PETR4"
                  autoCapitalize="characters"
                  onChange={(e) => updateForm("ticker", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo de ativo</Label>
                <Select
                  value={form.tipoAtivo}
                  onValueChange={(v: TipoAtivo) => updateForm("tipoAtivo", v)}
                  disabled={!!posicaoDoTicker}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(TIPO_ATIVO_LABEL) as TipoAtivo[]).map((t) => (
                      <SelectItem key={t} value={t}>{TIPO_ATIVO_LABEL[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {form.tipo === "venda" && posicaoDoTicker && (
              <p className="text-[11px] text-gray-500 dark:text-gray-400 flex items-start gap-1">
                <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                Posição atual: {posicaoDoTicker.quantidade.toLocaleString("pt-BR")} un. · preço médio {formatarPreco(posicaoDoTicker.precoMedio)}.
              </p>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="rv-data">Data da operação</Label>
              <Input
                id="rv-data"
                type="date"
                max={hojeIso}
                value={form.data}
                onChange={(e) => updateForm("data", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="rv-qtd">Quantidade</Label>
                <Input
                  id="rv-qtd"
                  inputMode="numeric"
                  placeholder="100"
                  value={form.quantidade}
                  onChange={(e) => updateForm("quantidade", e.target.value.replace(/\D/g, ""))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rv-preco">Preço unitário (R$)</Label>
                <Input
                  id="rv-preco"
                  inputMode="decimal"
                  placeholder="38,50"
                  value={form.preco}
                  onChange={(e) => updateForm("preco", e.target.value.replace(/[^\d.,]/g, ""))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rv-taxas">Taxas e corretagem (R$, opcional)</Label>
              <Input
                id="rv-taxas"
                inputMode="decimal"
                placeholder="0,00"
                value={form.taxas}
                onChange={(e) => updateForm("taxas", e.target.value.replace(/[^\d.,]/g, ""))}
              />
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Somadas ao custo nas compras (entram no preço médio) e descontadas nas vendas.
              </p>
            </div>

            {totalPrevisto > 0 && (
              <div className="flex justify-between bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  {form.tipo === "compra" ? "Total a pagar" : "Total a receber"}
                </span>
                <span className="font-bold text-gray-900 dark:text-white">{formatarMoeda(totalPrevisto)}</span>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Movimentar saldo da conta</span>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {form.tipo === "compra" ? "Debita" : "Credita"} a conta escolhida e lança no extrato.
                  {form.data < hojeIso && " Em datas passadas, o padrão é só registrar o histórico."}
                </p>
              </div>
              <Switch checked={form.movimentar} onCheckedChange={(c) => updateForm("movimentar", c)} />
            </div>

            {form.movimentar && contas.length > 0 && (
              <MovCampoConta
                form={{
                  contaId: form.contaId,
                  tipo: form.tipo === "compra" ? "saida" : "entrada",
                  valor: totalPrevisto.toFixed(2),
                }}
                update={(k: string, v: any) => { if (k === "contaId") updateForm("contaId", v); }}
                renderInfoBox={() => null}
              />
            )}

            {erro && (
              <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {erro}
              </p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={confirmarOperacao} disabled={criar.isPending}>
              {criar.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</> : "Registrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal Cotação ───────────────────────────────────────────────── */}
      <Dialog open={!!cotacaoAlvo} onOpenChange={(open) => { if (!open) setCotacaoAlvo(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Cotação de {cotacaoAlvo?.ticker}</DialogTitle>
            <DialogDescription>
              Informe o preço manualmente. A próxima atualização automática substitui este valor.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label htmlFor="rv-cotacao">Preço (R$)</Label>
            <Input
              id="rv-cotacao"
              inputMode="decimal"
              value={cotacaoValor}
              onChange={(e) => setCotacaoValor(e.target.value.replace(/[^\d.,]/g, ""))}
              placeholder="0,00"
            />
            {cotacaoErro && (
              <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {cotacaoErro}
              </p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCotacaoAlvo(null)}>Cancelar</Button>
            <Button onClick={confirmarCotacao} disabled={salvarCotacao.isPending}>
              {salvarCotacao.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Confirmar exclusão ──────────────────────────────────────────── */}
      <Dialog open={!!excluirAlvo} onOpenChange={(open) => { if (!open) setExcluirAlvo(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir operação?</DialogTitle>
            <DialogDescription>
              {excluirAlvo &&
                `${excluirAlvo.tipo === "compra" ? "Compra" : "Venda"} de ${excluirAlvo.quantidade} ${excluirAlvo.ticker} em ${fmtIso(excluirAlvo.data)}. `}
              {excluirAlvo?.movimentouConta
                ? "O valor será devolvido ao saldo da conta e removido do extrato. "
                : ""}
              O preço médio e a posição serão recalculados.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setExcluirAlvo(null)}>Cancelar</Button>
            <Button onClick={confirmarExclusao} disabled={excluir.isPending} className="bg-red-600 hover:bg-red-700 text-white">
              {excluir.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}