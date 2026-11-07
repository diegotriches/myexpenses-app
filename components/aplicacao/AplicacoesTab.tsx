"use client";

// src/components/contas/AplicacoesTab.tsx

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  TrendingUp, PiggyBank, Calendar, Undo2, Loader2, Plus, History, RefreshCw,
  AlertCircle, Infinity as InfinityIcon, Receipt, ChevronDown, ChevronUp, Info,
} from "lucide-react";
import {
  useAplicacoes, useCriarAplicacao, useResgatarAplicacao,
  useAportarAplicacao, useRecalcularAplicacao,
} from "@/hooks/useAplicacoes";
import type { Aplicacao } from "@/services/aplicacaoService";
import type { Conta } from "@/types/conta";
import { calcularAliquotaIR } from "@/utils/aplicacaoUtils";
import {
  hojeBrt, diasEntre, projetarLotes, estimarLiquidoTotal, simularResgateFifo,
  type LoteEstado,
} from "@/utils/aplicacaoSimulacao";
// Mesmos campos do modal de Nova Movimentação (conta com logo do banco e
// valor em formato calculadora)
import MovCampoConta from "@/components/transacao/MovCampoConta";
import MovCamposBasicos from "@/components/transacao/MovCamposBasicos";

interface Props {
  contas: Conta[];
}

const INDEXADOR_LABEL: Record<string, string> = { cdi: "CDI", selic: "Selic" };

const formatarMoeda = (valor: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);

// Datas "YYYY-MM-DD" (ou timestamps ISO) -> dd/mm/aaaa SEM passar por fuso
const fmtIso = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/");

export default function AplicacoesTab({ contas }: Props) {
  const { data: todasAplicacoes = [], isLoading } = useAplicacoes();
  const criar = useCriarAplicacao();
  const resgatar = useResgatarAplicacao();
  const aportar = useAportarAplicacao();
  const recalcular = useRecalcularAplicacao();

  const hojeIso = hojeBrt();

  const [verHistorico, setVerHistorico] = useState(false);
  const [modalNovaOpen, setModalNovaOpen] = useState(false);
  const [expandidas, setExpandidas] = useState<Set<string>>(new Set());

  // ── Nova aplicação ───────────────────────────────────────────────────────
  const [form, setForm] = useState({
    contaId: "",
    tipo: "saida" as "entrada" | "saida",
    descricao: "",
    valor: "",
    dataAplicacao: hojeIso,
    indexador: "cdi" as "cdi" | "selic",
    percentualIndexador: "100",
    tributacao: "tributavel" as "isento" | "tributavel",
    rendeNoDiaAporte: false,
    semVencimento: false,
    dataVencimento: "",
  });
  const [erro, setErro] = useState<string | null>(null);
  const updateForm = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));

  // ── Aporte ───────────────────────────────────────────────────────────────
  const [aporteAlvo, setAporteAlvo] = useState<Aplicacao | null>(null);
  const [aporteForm, setAporteForm] = useState({
    contaId: "", tipo: "saida" as "entrada" | "saida", valor: "", data: hojeIso,
  });
  const [erroAporte, setErroAporte] = useState<string | null>(null);
  const updateAporte = (key: string, value: any) => setAporteForm((f) => ({ ...f, [key]: value }));

  // ── Resgate ──────────────────────────────────────────────────────────────
  const [resgateAlvo, setResgateAlvo] = useState<Aplicacao | null>(null);
  const [resgateModo, setResgateModo] = useState<"total" | "parcial">("total");
  const [resgateForm, setResgateForm] = useState({ tipo: "entrada" as "entrada" | "saida", data: "", valor: "", descricao: "" });
  const [erroResgate, setErroResgate] = useState<string | null>(null);
  const updateResgate = (key: string, value: any) => setResgateForm((f) => ({ ...f, [key]: value }));

  const nomeConta = (contaId: string) => contas.find((c) => c.id === contaId)?.nome ?? "Conta";

  const hoje = useMemo(() => new Date(), []);

  const aplicacoesFiltradas = useMemo(
    () => todasAplicacoes.filter((a) => a.resgatada === verHistorico),
    [todasAplicacoes, verHistorico]
  );

  const gruposPorConta = useMemo(() => {
    const grupos = new Map<string, Aplicacao[]>();
    aplicacoesFiltradas.forEach((a) => {
      if (!grupos.has(a.contaId)) grupos.set(a.contaId, []);
      grupos.get(a.contaId)!.push(a);
    });
    return Array.from(grupos.entries()).map(([contaId, lista]) => ({
      contaId,
      nomeConta: nomeConta(contaId),
      aplicacoes: lista,
    }));
  }, [aplicacoesFiltradas, contas]);

  // Lotes (aportes) no formato das funções puras
  const lotesDe = (a: Aplicacao): LoteEstado[] =>
    (a.aportes ?? []).map((x) => ({
      id: x.id,
      data: x.data,
      aportado: Number(x.valor),
      principal: Number(x.principalRestante),
      valorAtual: Number(x.valorAtual),
    }));

  // Visão da aplicação ATIVA: valor oficial (confirmado pelo BCB) + projeção
  // estimada dos dias úteis ainda não publicados + IR/líquido estimados
  function visaoAtiva(a: Aplicacao) {
    const oficiais = lotesDe(a);
    const pct = Number(a.percentualIndexador);
    const proj = projetarLotes(oficiais, pct, a.ultimaTaxa, hojeIso, a.rendeNoDiaAporte);
    const est = estimarLiquidoTotal(proj.lotes, hojeIso, a.tributacao);
    const oficialBruto = oficiais.reduce((s, l) => s + l.valorAtual, 0);
    return { oficiais, oficialBruto, diasProjetados: proj.diasProjetados, est };
  }

  function calcularProgresso(a: Aplicacao) {
    if (!a.dataVencimento) return 0;
    const inicio = new Date(a.dataAplicacao).getTime();
    const fim    = new Date(a.dataVencimento).getTime();
    const agora  = hoje.getTime();
    if (fim <= inicio) return 100;
    return Math.min(100, Math.max(0, ((agora - inicio) / (fim - inicio)) * 100));
  }

  function diasRestantes(a: Aplicacao) {
    if (!a.dataVencimento) return null;
    const diff = Math.ceil((new Date(a.dataVencimento).getTime() - hoje.getTime()) / 86_400_000);
    return Math.max(0, diff);
  }

  function alternarExpandida(id: string) {
    setExpandidas((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  // ── Nova aplicação ───────────────────────────────────────────────────────
  function abrirNovaAplicacao() {
    setForm({
      contaId: contas[0]?.id ?? "", tipo: "saida", descricao: "", valor: "",
      dataAplicacao: hojeIso, indexador: "cdi", percentualIndexador: "100",
      tributacao: "tributavel", rendeNoDiaAporte: false, semVencimento: false, dataVencimento: "",
    });
    setErro(null);
    setModalNovaOpen(true);
  }

  async function confirmarNovaAplicacao() {
    setErro(null);
    const valorNum = parseFloat(form.valor);
    if (!form.contaId) { setErro("Selecione uma conta"); return; }
    if (isNaN(valorNum) || valorNum <= 0) { setErro("Informe um valor válido"); return; }
    const percentualNum = parseFloat(form.percentualIndexador);
    if (isNaN(percentualNum) || percentualNum <= 0) { setErro("Informe um percentual válido"); return; }
    if (!form.dataAplicacao || form.dataAplicacao > hojeIso) { setErro("A data da aplicação não pode ser futura"); return; }
    if (!form.semVencimento && !form.dataVencimento) { setErro("Selecione a data de vencimento, ou marque 'sem vencimento'"); return; }

    try {
      await criar.mutateAsync({
        contaId: form.contaId,
        descricao: form.descricao || undefined,
        valor: valorNum,
        indexador: form.indexador,
        percentualIndexador: percentualNum,
        tributacao: form.tributacao,
        rendeNoDiaAporte: form.rendeNoDiaAporte,
        dataVencimento: form.semVencimento ? undefined : form.dataVencimento,
        dataAplicacao: form.dataAplicacao,
      });
      setModalNovaOpen(false);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao criar aplicação");
    }
  }

  // ── Aporte ───────────────────────────────────────────────────────────────
  function abrirAporte(a: Aplicacao) {
    setAporteForm({ contaId: a.contaId, tipo: "saida", valor: "", data: hojeIso });
    setErroAporte(null);
    setAporteAlvo(a);
  }

  async function confirmarAporte() {
    if (!aporteAlvo) return;
    setErroAporte(null);
    const valorNum = parseFloat(aporteForm.valor);
    if (isNaN(valorNum) || valorNum <= 0) { setErroAporte("Informe um valor válido"); return; }
    if (!aporteForm.data || aporteForm.data > hojeIso) { setErroAporte("A data do aporte não pode ser futura"); return; }

    try {
      await aportar.mutateAsync({
        id: aporteAlvo.id,
        dados: { valor: valorNum, data: aporteForm.data, contaId: aporteForm.contaId || undefined },
      });
      setAporteAlvo(null);
    } catch (err) {
      setErroAporte(err instanceof Error ? err.message : "Erro ao registrar aporte");
    }
  }

  // ── Resgate ──────────────────────────────────────────────────────────────
  function abrirResgate(a: Aplicacao) {
    setResgateForm({ tipo: "entrada", data: "", valor: "", descricao: "" });
    setResgateModo("total");
    setErroResgate(null);
    setResgateAlvo(a);
  }

  // Preview — mesma função (FIFO por lote) que o servidor usa, sobre os
  // valores CONFIRMADOS pelo BCB (é isso que o resgate de fato considera)
  const previewResgate = useMemo(() => {
    if (!resgateAlvo) return null;
    const lotes = lotesDe(resgateAlvo);
    const disponivel = lotes.reduce((s, l) => s + l.valorAtual, 0);
    const valorDigitado = parseFloat(resgateForm.valor);
    const bruto = resgateModo === "total" ? disponivel : (isNaN(valorDigitado) ? 0 : valorDigitado);
    if (bruto <= 0) return { disponivel, bruto: 0, r: null as null | ReturnType<typeof simularResgateFifo> };
    return { disponivel, bruto, r: simularResgateFifo(lotes, bruto, hojeIso, resgateAlvo.tributacao) };
  }, [resgateAlvo, resgateModo, resgateForm.valor, hojeIso]);

  async function confirmarResgate() {
    if (!resgateAlvo || !previewResgate) return;
    setErroResgate(null);

    if (resgateModo === "parcial") {
      if (previewResgate.bruto <= 0) { setErroResgate("Informe o valor a resgatar"); return; }
      if (previewResgate.r?.excedeSaldo) { setErroResgate("Valor maior que o saldo da aplicação"); return; }
    }

    try {
      await resgatar.mutateAsync({
        id: resgateAlvo.id,
        dados: resgateModo === "total" ? { total: true } : { valor: previewResgate.bruto },
      });
      setResgateAlvo(null);
    } catch (err) {
      setErroResgate(err instanceof Error ? err.message : "Erro ao resgatar");
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const nomeAplicacao = (a: Aplicacao) => a.descricao || `Aplicação em ${INDEXADOR_LABEL[a.indexador]}`;

  return (
    <>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="inline-flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setVerHistorico(false)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
              !verHistorico ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400"
            }`}
          >
            Ativas
          </button>
          <button
            onClick={() => setVerHistorico(true)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-1.5 ${
              verHistorico ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Histórico
          </button>
        </div>

        {!verHistorico && (
          <Button onClick={abrirNovaAplicacao} className="bg-blue-700 hover:bg-blue-900 text-white">
            <Plus className="w-4 h-4 mr-1.5" />
            Nova Aplicação
          </Button>
        )}
      </div>

      {gruposPorConta.length === 0 ? (
        <div className="text-center py-12 md:py-16 bg-gray-50 dark:bg-gray-900/40 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
          <PiggyBank className="mx-auto mb-4 text-gray-300 dark:text-gray-700" size={48} />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {verHistorico ? "Nenhuma aplicação resgatada ainda" : "Nenhuma aplicação ativa"}
          </h3>
          {!verHistorico && (
            <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto px-4">
              Aplique um valor da sua conta em CDI ou Selic e acompanhe o rendimento diário aqui.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {gruposPorConta.map((grupo) => (
            <div key={grupo.contaId}>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 px-1">
                {grupo.nomeConta}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                {grupo.aplicacoes.map((a) => {
                  const progresso = calcularProgresso(a);
                  const dias = diasRestantes(a);
                  const liquidezDiaria = !a.dataVencimento;
                  const ativa = !a.resgatada;
                  const visao = ativa ? visaoAtiva(a) : null;

                  const valorExibido = visao ? visao.est.valorBruto : Number(a.valorAtual);
                  const principalExibido = visao ? visao.est.principal : Number(a.valorPrincipal);
                  const rendimento = valorExibido - principalExibido;
                  const aberta = expandidas.has(a.id);
                  const aportesComSaldo = (a.aportes ?? []).filter((x) => Number(x.valorAtual) > 0);
                  const recalculandoEste = recalcular.isPending && recalcular.variables === a.id;

                  return (
                    <Card key={a.id} className="dark:bg-gray-900 dark:border-gray-800">
                      <CardContent className="pt-5 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30 flex-shrink-0">
                              <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                {nomeAplicacao(a)}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {a.percentualIndexador}% do {INDEXADOR_LABEL[a.indexador]}
                                {a.rendeNoDiaAporte && " · rende no dia do aporte"}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            {a.resgatada ? (
                              <Badge className="text-[10px] px-2 py-0.5 border-0 bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                                Resgatada
                              </Badge>
                            ) : (
                              <Badge className="text-[10px] px-2 py-0.5 border-0 bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                                Ativa
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                              {a.tributacao === "isento" ? "Isento de IR" : "Tributável"}
                            </Badge>
                          </div>
                        </div>

                        <div className="flex items-baseline justify-between">
                          <span className="text-lg font-bold text-gray-900 dark:text-white">
                            {formatarMoeda(valorExibido)}
                          </span>
                          <span className="text-xs font-medium text-green-600 dark:text-green-400">
                            +{formatarMoeda(rendimento)}
                          </span>
                        </div>

                        <p className="text-[11px] text-gray-500 dark:text-gray-400">
                          Principal investido: {formatarMoeda(principalExibido)}
                        </p>

                        {/* IR e líquido estimados — comparáveis com a corretora */}
                        {visao && a.tributacao === "tributavel" && (
                          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2.5 space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">IR estimado (se resgatar hoje)</span>
                              <span className="font-medium text-red-600 dark:text-red-400">-{formatarMoeda(visao.est.impostoRetido)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="font-medium text-gray-700 dark:text-gray-300">Líquido estimado</span>
                              <span className="font-bold text-gray-900 dark:text-white">{formatarMoeda(visao.est.valorLiquido)}</span>
                            </div>
                          </div>
                        )}

                        {visao && visao.diasProjetados > 0 && (
                          <p className="flex items-start gap-1.5 text-[11px] text-amber-700 dark:text-amber-400">
                            <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            Inclui {visao.diasProjetados} dia(s) útil(eis) estimado(s): o BCB ainda não publicou a taxa.
                            Confirmado até {a.ultimaTaxa ? fmtIso(a.ultimaTaxa.data) : "—"}: {formatarMoeda(visao.oficialBruto)}.
                          </p>
                        )}

                        {ativa && (
                          liquidezDiaria ? (
                            <div className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 rounded-lg px-2.5 py-1.5">
                              <InfinityIcon className="w-3.5 h-3.5" />
                              Liquidez diária — sem data de vencimento
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Vence em {fmtIso(a.dataVencimento!)}</span>
                                <span>{dias}d restantes</span>
                              </div>
                              <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-300" style={{ width: `${progresso}%` }} />
                              </div>
                            </div>
                          )
                        )}

                        {a.resgatada && a.dataResgate && (
                          <div className="text-[11px] text-gray-500 dark:text-gray-400 space-y-0.5">
                            <p className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Resgatada em {fmtIso(new Date(a.dataResgate).toISOString())}
                            </p>
                            {a.impostoRetido && Number(a.impostoRetido) > 0 && (
                              <p className="flex items-center gap-1">
                                <Receipt className="w-3 h-3" />
                                IR retido: {formatarMoeda(Number(a.impostoRetido))}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Detalhes: aportes (lotes) e resgates */}
                        {((a.aportes?.length ?? 0) > 0 || (a.resgates?.length ?? 0) > 0) && (
                          <div>
                            <button
                              onClick={() => alternarExpandida(a.id)}
                              className="flex items-center gap-1 text-xs font-medium text-blue-700 dark:text-blue-400 hover:underline"
                            >
                              {aberta ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              {aberta ? "Ocultar detalhes" : `Ver aportes (${aportesComSaldo.length}) e resgates (${a.resgates?.length ?? 0})`}
                            </button>

                            {aberta && (
                              <div className="mt-2 space-y-3">
                                {aportesComSaldo.length > 0 && (
                                  <div className="space-y-1">
                                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Aportes</p>
                                    {aportesComSaldo.map((x) => {
                                      const aliq = a.tributacao === "isento" ? 0 : calcularAliquotaIR(diasEntre(x.data, hojeIso));
                                      return (
                                        <div key={x.id} className="flex items-center justify-between text-xs gap-2 border-b border-gray-100 dark:border-gray-800 pb-1">
                                          <span className="text-gray-700 dark:text-gray-300">
                                            {fmtIso(x.data)}
                                            {x.historico && <span className="ml-1 text-[10px] text-gray-400">(histórico)</span>}
                                          </span>
                                          <span className="text-gray-500 dark:text-gray-400">
                                            {formatarMoeda(Number(x.valor))} → <strong className="text-gray-900 dark:text-white">{formatarMoeda(Number(x.valorAtual))}</strong>
                                          </span>
                                          <span className="text-[10px] text-gray-400 whitespace-nowrap">IR {aliq}%</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                                {(a.resgates?.length ?? 0) > 0 && (
                                  <div className="space-y-1">
                                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Resgates</p>
                                    {a.resgates.map((r) => (
                                      <div key={r.id} className="flex items-center justify-between text-xs gap-2 border-b border-gray-100 dark:border-gray-800 pb-1">
                                        <span className="text-gray-700 dark:text-gray-300">
                                          {fmtIso(r.data)}
                                          <span className="ml-1 text-[10px] text-gray-400">
                                            ({r.tipo === "total" ? "total" : "parcial"}{r.historico ? ", histórico" : ""})
                                          </span>
                                        </span>
                                        <span className="text-gray-500 dark:text-gray-400">
                                          {formatarMoeda(Number(r.valorBruto))}
                                          {r.impostoRetido && Number(r.impostoRetido) > 0 && (
                                            <span className="text-red-600 dark:text-red-400"> (IR {formatarMoeda(Number(r.impostoRetido))})</span>
                                          )}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {ativa && (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 h-8 text-xs text-green-700 hover:text-green-800 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950/30"
                              onClick={() => abrirAporte(a)}
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              Aportar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 h-8 text-xs text-amber-700 hover:text-amber-800 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/30"
                              onClick={() => abrirResgate(a)}
                            >
                              <Undo2 className="w-3 h-3 mr-1" />
                              Resgatar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-2.5"
                              title="Atualizar rendimentos agora"
                              aria-label="Atualizar rendimentos"
                              disabled={recalculandoEste}
                              onClick={() => recalcular.mutate(a.id)}
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${recalculandoEste ? "animate-spin" : ""}`} />
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal Nova Aplicação ────────────────────────────────────────── */}
      <Dialog open={modalNovaOpen} onOpenChange={setModalNovaOpen}>
        <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Aplicação</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-3">
              <MovCampoConta
                form={{ contaId: form.contaId, tipo: form.tipo, valor: form.valor }}
                update={updateForm}
                renderInfoBox={() => null}
              />
              <MovCamposBasicos
                form={{ tipo: form.tipo, data: "", valor: form.valor, descricao: "" }}
                update={updateForm}
                campo="valor"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="aplicacao-data">Data da aplicação</Label>
              <Input
                id="aplicacao-data"
                type="date"
                max={hojeIso}
                value={form.dataAplicacao}
                onChange={(e) => updateForm("dataAplicacao", e.target.value)}
              />
              {form.dataAplicacao && form.dataAplicacao < hojeIso && (
                <p className="text-[11px] text-amber-700 dark:text-amber-400 flex items-start gap-1">
                  <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  Data passada: o rendimento e o IR são calculados desde essa data, mas o saldo da conta NÃO é alterado.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="aplicacao-descricao">Descrição (opcional)</Label>
              <Input
                id="aplicacao-descricao"
                value={form.descricao}
                onChange={(e) => updateForm("descricao", e.target.value)}
                placeholder="Ex: Reserva de emergência"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Indexador</Label>
                <Select value={form.indexador} onValueChange={(v: "cdi" | "selic") => updateForm("indexador", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cdi">CDI</SelectItem>
                    <SelectItem value="selic">Selic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="aplicacao-percentual">% do indexador</Label>
                <Input
                  id="aplicacao-percentual"
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  min="0"
                  value={form.percentualIndexador}
                  onChange={(e) => updateForm("percentualIndexador", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Tributação</Label>
              <Select value={form.tributacao} onValueChange={(v: "isento" | "tributavel") => updateForm("tributacao", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tributavel">Tributável (CDB, Tesouro, Fundos...)</SelectItem>
                  <SelectItem value="isento">Isento de IR (LCI, LCA, Poupança...)</SelectItem>
                </SelectContent>
              </Select>
              {form.tributacao === "tributavel" && (
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  O IR é calculado por aporte, pela tabela regressiva (22,5% a 15%, conforme o tempo de cada aporte).
                </p>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Rende a partir do dia do aporte</span>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Ligue se a sua corretora já conta o rendimento no próprio dia da aplicação. Desligado, o aporte começa a render no dia útil seguinte. Vale para esta aplicação e seus próximos aportes.
                </p>
              </div>
              <Switch
                checked={form.rendeNoDiaAporte}
                onCheckedChange={(checked) => updateForm("rendeNoDiaAporte", checked)}
              />
            </div>

            <div className="flex items-center justify-between gap-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sem vencimento</span>
                <p className="text-xs text-gray-500 dark:text-gray-400">Liquidez diária — resgate quando quiser</p>
              </div>
              <Switch
                checked={form.semVencimento}
                onCheckedChange={(checked) => updateForm("semVencimento", checked)}
              />
            </div>

            {!form.semVencimento && (
              <div className="space-y-1.5">
                <Label htmlFor="aplicacao-vencimento">Vencimento</Label>
                <Input
                  id="aplicacao-vencimento"
                  type="date"
                  value={form.dataVencimento}
                  onChange={(e) => updateForm("dataVencimento", e.target.value)}
                />
              </div>
            )}

            {erro && (
              <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {erro}
              </p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setModalNovaOpen(false)}>Cancelar</Button>
            <Button onClick={confirmarNovaAplicacao} disabled={criar.isPending}>
              {criar.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Aplicando...</> : "Aplicar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal Aporte ────────────────────────────────────────────────── */}
      <Dialog open={!!aporteAlvo} onOpenChange={(open) => { if (!open) setAporteAlvo(null); }}>
        <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Aportar em {aporteAlvo ? nomeAplicacao(aporteAlvo) : ""}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-3">
              <MovCampoConta
                form={{ contaId: aporteForm.contaId, tipo: aporteForm.tipo, valor: aporteForm.valor }}
                update={updateAporte}
                renderInfoBox={() => null}
              />
              <MovCamposBasicos
                form={{ tipo: aporteForm.tipo, data: "", valor: aporteForm.valor, descricao: "" }}
                update={updateAporte}
                campo="valor"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="aporte-data">Data do aporte</Label>
              <Input
                id="aporte-data"
                type="date"
                max={hojeIso}
                value={aporteForm.data}
                onChange={(e) => updateAporte("data", e.target.value)}
              />
              {aporteForm.data && aporteForm.data < hojeIso ? (
                <p className="text-[11px] text-amber-700 dark:text-amber-400 flex items-start gap-1">
                  <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  Data passada: registrado como histórico — o rendimento e o IR contam desde essa data, mas o saldo da conta NÃO é alterado.
                </p>
              ) : (
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  O valor sai da conta agora e começa a render no próximo dia útil.
                </p>
              )}
            </div>

            {erroAporte && (
              <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {erroAporte}
              </p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAporteAlvo(null)}>Cancelar</Button>
            <Button onClick={confirmarAporte} disabled={aportar.isPending}>
              {aportar.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Registrando...</> : "Confirmar aporte"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal Resgate (total ou parcial) ────────────────────────────── */}
      <Dialog open={!!resgateAlvo} onOpenChange={(open) => { if (!open) setResgateAlvo(null); }}>
        <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Resgatar {resgateAlvo ? nomeAplicacao(resgateAlvo) : ""}</DialogTitle>
          </DialogHeader>

          {resgateAlvo && previewResgate && (
            <div className="space-y-4 py-2">
              <div className="inline-flex w-full items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                {(["total", "parcial"] as const).map((modo) => (
                  <button
                    key={modo}
                    onClick={() => { setResgateModo(modo); setErroResgate(null); }}
                    className={`flex-1 px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                      resgateModo === modo
                        ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white"
                        : "text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    {modo === "total" ? "Resgate total" : "Resgate parcial"}
                  </button>
                ))}
              </div>

              {resgateModo === "parcial" && (
                <div className="space-y-1.5">
                  <MovCamposBasicos
                    form={{ tipo: resgateForm.tipo, data: "", valor: resgateForm.valor, descricao: "" }}
                    update={updateResgate}
                    campo="valor"
                  />
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Valor BRUTO a retirar (disponível: {formatarMoeda(previewResgate.disponivel)}). O IR é descontado desse valor
                    e sai primeiro dos aportes mais antigos.
                  </p>
                </div>
              )}

              {previewResgate.r && (
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Valor resgatado (bruto):</span>
                    <span className="font-medium text-gray-900 dark:text-white">{formatarMoeda(previewResgate.r.bruto)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Rendimento nesse valor:</span>
                    <span className="font-medium text-green-600 dark:text-green-400">+{formatarMoeda(previewResgate.r.rendimentoBruto)}</span>
                  </div>

                  {resgateAlvo.tributacao === "tributavel" ? (
                    <>
                      {previewResgate.r.consumo.map((c) => {
                        const lote = resgateAlvo.aportes.find((x) => x.id === c.loteId);
                        return (
                          <div key={c.loteId} className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                            <span>Aporte de {lote ? fmtIso(lote.data) : "—"} · IR {c.aliquota}%</span>
                            <span>-{formatarMoeda(c.imposto)}</span>
                          </div>
                        );
                      })}
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">IR retido:</span>
                        <span className="font-medium text-red-600 dark:text-red-400">-{formatarMoeda(previewResgate.r.impostoRetido)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">IR:</span>
                      <span className="font-medium text-green-600 dark:text-green-400">Isento</span>
                    </div>
                  )}

                  <div className="flex justify-between pt-1.5 border-t border-gray-200 dark:border-gray-700">
                    <span className="font-semibold text-gray-900 dark:text-white">Valor líquido a receber:</span>
                    <span className="font-bold text-gray-900 dark:text-white">{formatarMoeda(previewResgate.r.valorLiquido)}</span>
                  </div>
                </div>
              )}

              <p className="text-xs text-gray-500 dark:text-gray-400">
                Considera os rendimentos confirmados pelo BCB até agora. O líquido entra no saldo da conta
                na hora. Essa ação não pode ser desfeita.
              </p>

              {erroResgate && (
                <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {erroResgate}
                </p>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setResgateAlvo(null)}>Cancelar</Button>
            <Button
              onClick={confirmarResgate}
              className="bg-amber-600 hover:bg-amber-700 text-white"
              disabled={resgatar.isPending}
            >
              {resgatar.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Resgatando...</> : "Confirmar resgate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}