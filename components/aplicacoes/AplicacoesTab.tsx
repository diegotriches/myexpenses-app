"use client";

import { useCallback, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  TrendingUp, PiggyBank, Calendar, Undo2, Loader2, Plus, History, RefreshCw, Pencil,
  AlertCircle, Receipt, ChevronDown, ChevronUp, Info,
  ChevronsDownUp, ChevronsUpDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useAplicacoes, useCriarAplicacao, useResgatarAplicacao,
  useAportarAplicacao, useRecalcularAplicacao, useDescontoAporte, useDefinirTipoAplicacao, useEditarAplicacao,
} from "@/hooks/useAplicacoes";
import type { Aplicacao, AporteAplicacao } from "@/services/aplicacaoService";
import type { Conta } from "@/types/conta";
import { calcularAliquotaIR } from "@/utils/aplicacaoUtils";
import {
  descreverRentabilidade, usaTaxaAnual, INDEXADORES, INDEXADOR_LABEL, type Indexador,
} from "@/utils/tesouroUtils";
import {
  indexadoresDoTipo, nomePadraoAplicacao, podeSemVencimento, temFgc, tiposParaIndexador, tributacaoDoTipo,
  TIPOS_APLICACAO, TIPO_APLICACAO_DESCRICAO, TIPO_APLICACAO_LABEL, type TipoAplicacao,
} from "@/utils/tipoAplicacao";
import {
  hojeBrt, diasEntre, projetarLotes, estimarLiquidoTotal, simularResgateFifo,
  type LoteEstado,
} from "@/utils/aplicacaoSimulacao";
// Mesmos campos do modal de Nova Movimentação (conta com logo do banco e
// valor em formato calculadora)
import MovCampoConta from "@/components/transacoes/MovCampoConta";
import MovCamposBasicos from "@/components/transacoes/MovCamposBasicos";
import { useHideValues } from "@/contexts/HideValuesContext";
import { formatarMoeda } from "@/utils/formatadores";

interface Props {
  contas: Conta[];
}


// Datas "YYYY-MM-DD" (ou timestamps ISO) -> dd/mm/aaaa SEM passar por fuso
const fmtIso = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/");

export default function AplicacoesTab({ contas }: Props) {
  const { mask } = useHideValues();
  const { data: todasAplicacoes = [], isLoading } = useAplicacoes();
  const criar = useCriarAplicacao();
  const resgatar = useResgatarAplicacao();
  const aportar = useAportarAplicacao();
  const recalcular = useRecalcularAplicacao();
  const descontoAporte = useDescontoAporte();
  const definirTipo = useDefinirTipoAplicacao();
  const editarAplicacao = useEditarAplicacao();
  // Modal de Nova Aplicação em modo edição: só o que não mexe em dinheiro
  const [editando, setEditando] = useState<Aplicacao | null>(null);
  // Aplicação antiga, sem tipo: diálogo "Definir tipo"
  const [tipoAlvo, setTipoAlvo] = useState<Aplicacao | null>(null);
  const [tipoEscolhido, setTipoEscolhido] = useState<TipoAplicacao | "">("");
  // Aporte cujo desconto na conta está sendo ligado ou desfeito (abre a confirmação)
  const [descontoAlvo, setDescontoAlvo] = useState<{ aplicacao: Aplicacao; aporte: AporteAplicacao } | null>(null);

  const hojeIso = hojeBrt();

  const [verHistorico, setVerHistorico] = useState(false);
  const [modalNovaOpen, setModalNovaOpen] = useState(false);
  const [expandidas, setExpandidas] = useState<Set<string>>(new Set());
  // Cards compactos: só nome, indexador, prazo, valor e rendimento; clicar abre o resto.
  // Separado de `expandidas`, que controla a lista de aportes e resgates dentro do card
  const [cardsAbertos, setCardsAbertos] = useState<Set<string>>(new Set());

  // ── Nova aplicação ───────────────────────────────────────────────────────
  const [form, setForm] = useState({
    contaId: "",
    tipo: "saida" as "entrada" | "saida",
    descricao: "",
    valor: "",
    dataAplicacao: hojeIso,
    // Tipo do produto (CDB, LCI, Tesouro...); `tipo` acima é entrada/saída do campo de conta
    tipoProduto: "" as TipoAplicacao | "",
    indexador: "cdi" as Indexador,
    percentualIndexador: "100",
    // Prefixado/IPCA+: taxa contratada em % a.a.
    taxaAnual: "",
    tributacao: "tributavel" as "isento" | "tributavel",
    rendeNoDiaAporte: false,
    semVencimento: false,
    dataVencimento: "",
    // Data passada: desconta da conta por padrão; desligado, é só registro histórico
    movimentar: true,
  });
  const [erro, setErro] = useState<string | null>(null);
  const updateForm = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));

  // ── Aporte ───────────────────────────────────────────────────────────────
  const [aporteAlvo, setAporteAlvo] = useState<Aplicacao | null>(null);
  const [aporteForm, setAporteForm] = useState({
    contaId: "", tipo: "saida" as "entrada" | "saida", valor: "", data: hojeIso, movimentar: true,
  });
  const [erroAporte, setErroAporte] = useState<string | null>(null);
  const updateAporte = <K extends keyof typeof aporteForm>(key: K, value: (typeof aporteForm)[K]) => setAporteForm((f) => ({ ...f, [key]: value }));

  // ── Resgate ──────────────────────────────────────────────────────────────
  const [resgateAlvo, setResgateAlvo] = useState<Aplicacao | null>(null);
  const [resgateModo, setResgateModo] = useState<"total" | "parcial">("total");
  const [resgateForm, setResgateForm] = useState({ tipo: "entrada" as "entrada" | "saida", data: "", valor: "", descricao: "" });
  const [erroResgate, setErroResgate] = useState<string | null>(null);
  const updateResgate = <K extends keyof typeof resgateForm>(key: K, value: (typeof resgateForm)[K]) => setResgateForm((f) => ({ ...f, [key]: value }));

  const nomeConta = useCallback((contaId: string) => contas.find((c) => c.id === contaId)?.nome ?? "Conta", [contas]);

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
  }, [aplicacoesFiltradas, nomeConta]);

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

  function alternarCard(id: string) {
    setCardsAbertos((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
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
      contaId: contas[0]?.id ?? "", tipo: "saida", descricao: "", valor: "", tipoProduto: "",
      dataAplicacao: hojeIso, indexador: "cdi", percentualIndexador: "100", taxaAnual: "",
      tributacao: "tributavel", rendeNoDiaAporte: false, semVencimento: false, dataVencimento: "",
      movimentar: true,
    });
    setEditando(null);
    setErro(null);
    setModalNovaOpen(true);
  }

  // Editar: o mesmo modal, preenchido, sem conta, valor e data
  function abrirEdicao(a: Aplicacao) {
    setForm({
      contaId: a.contaId, tipo: "saida", descricao: a.descricao ?? "", valor: "", tipoProduto: a.tipo ?? "",
      dataAplicacao: hojeIso, indexador: a.indexador,
      percentualIndexador: String(Number(a.percentualIndexador)),
      taxaAnual: a.taxaAnual ? String(Number(a.taxaAnual)) : "",
      tributacao: a.tributacao, rendeNoDiaAporte: a.rendeNoDiaAporte,
      semVencimento: !a.dataVencimento, dataVencimento: a.dataVencimento ? a.dataVencimento.slice(0, 10) : "",
      movimentar: true,
    });
    setEditando(a);
    setErro(null);
    setModalNovaOpen(true);
  }

  // Escolher o tipo sugere a tributação e ajusta o indexador aos que o tipo aceita
  function escolherTipoProduto(t: TipoAplicacao) {
    // Resgatada: só o tipo muda (as opções já são as que combinam com o indexador)
    if (editando?.resgatada) { updateForm("tipoProduto", t); return; }
    setForm((f) => {
      const permitidos = indexadoresDoTipo(t);
      const indexador = permitidos.includes(f.indexador) ? f.indexador : permitidos[0];
      return {
        ...f,
        tipoProduto: t,
        indexador,
        tributacao: tributacaoDoTipo(t),
        semVencimento: f.semVencimento && podeSemVencimento(t, indexador),
      };
    });
  }

  // Rentabilidade e vencimento do formulário, com as mesmas regras na criação e na edição
  function lerRentabilidade(tipoProduto: TipoAplicacao) {
    const comTaxaAnual = usaTaxaAnual(form.indexador);
    const percentualNum = comTaxaAnual ? 100 : parseFloat(form.percentualIndexador);
    if (isNaN(percentualNum) || percentualNum <= 0) return { erro: "Informe um percentual válido" } as const;
    const taxaAnualNum = parseFloat(form.taxaAnual.replace(",", "."));
    if (comTaxaAnual && (isNaN(taxaAnualNum) || taxaAnualNum <= 0 || taxaAnualNum >= 100))
      return { erro: "Informe a taxa do título (% ao ano)" } as const;
    // Liquidez diária só em CDB/RDB/LC atrelados ao CDI; o resto sempre vence
    const aceitaSemVencimento = podeSemVencimento(tipoProduto, form.indexador);
    const semVencimento = form.semVencimento && aceitaSemVencimento;
    if (!semVencimento && !form.dataVencimento)
      return { erro: aceitaSemVencimento ? "Selecione a data de vencimento, ou marque 'sem vencimento'" : "Selecione a data de vencimento" } as const;
    if (!semVencimento && form.dataVencimento <= hojeIso) return { erro: "O vencimento precisa ser uma data futura" } as const;
    return { comTaxaAnual, percentualNum, taxaAnualNum, semVencimento } as const;
  }

  async function confirmarEdicao(a: Aplicacao) {
    setErro(null);
    const tipoProduto = form.tipoProduto;
    if (!tipoProduto) { setErro("Escolha o tipo da aplicação"); return; }
    const descricao = form.descricao.trim() || null;
    try {
      if (a.resgatada) {
        await editarAplicacao.mutateAsync({ id: a.id, dados: { descricao, tipo: tipoProduto } });
      } else {
        const r = lerRentabilidade(tipoProduto);
        if (r.erro !== undefined) { setErro(r.erro); return; }
        await editarAplicacao.mutateAsync({
          id: a.id,
          dados: {
            descricao,
            tipo: tipoProduto,
            indexador: form.indexador,
            percentualIndexador: r.percentualNum,
            taxaAnual: r.comTaxaAnual ? r.taxaAnualNum : null,
            tributacao: form.tributacao,
            rendeNoDiaAporte: form.rendeNoDiaAporte,
            dataVencimento: r.semVencimento ? null : form.dataVencimento,
          },
        });
      }
      setModalNovaOpen(false);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao editar a aplicação");
    }
  }

  async function confirmarNovaAplicacao() {
    if (editando) return confirmarEdicao(editando);
    setErro(null);
    const valorNum = parseFloat(form.valor);
    if (!form.contaId) { setErro("Selecione uma conta"); return; }
    if (isNaN(valorNum) || valorNum <= 0) { setErro("Informe um valor válido"); return; }
    const tipoProduto = form.tipoProduto;
    if (!tipoProduto) { setErro("Escolha o tipo da aplicação"); return; }
    if (!form.dataAplicacao || form.dataAplicacao > hojeIso) { setErro("A data da aplicação não pode ser futura"); return; }
    const r = lerRentabilidade(tipoProduto);
    if (r.erro !== undefined) { setErro(r.erro); return; }
    const { comTaxaAnual, percentualNum, taxaAnualNum, semVencimento } = r;

    try {
      await criar.mutateAsync({
        contaId: form.contaId,
        descricao: form.descricao || undefined,
        tipo: tipoProduto,
        valor: valorNum,
        indexador: form.indexador,
        percentualIndexador: percentualNum,
        taxaAnual: comTaxaAnual ? taxaAnualNum : undefined,
        tributacao: form.tributacao,
        rendeNoDiaAporte: form.rendeNoDiaAporte,
        dataVencimento: semVencimento ? undefined : form.dataVencimento,
        dataAplicacao: form.dataAplicacao,
        movimentarConta: form.dataAplicacao < hojeIso ? form.movimentar : true,
      });
      setModalNovaOpen(false);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao criar aplicação");
    }
  }

  // ── Aporte ───────────────────────────────────────────────────────────────
  function abrirAporte(a: Aplicacao) {
    setAporteForm({ contaId: a.contaId, tipo: "saida", valor: "", data: hojeIso, movimentar: true });
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
        dados: {
          valor: valorNum,
          data: aporteForm.data,
          contaId: aporteForm.contaId || undefined,
          movimentarConta: aporteForm.data < hojeIso ? aporteForm.movimentar : true,
        },
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
  const previewResgate = (() => {
    if (!resgateAlvo) return null;
    const lotes = lotesDe(resgateAlvo);
    const disponivel = lotes.reduce((s, l) => s + l.valorAtual, 0);
    const valorDigitado = parseFloat(resgateForm.valor);
    const bruto = resgateModo === "total" ? disponivel : (isNaN(valorDigitado) ? 0 : valorDigitado);
    if (bruto <= 0) return { disponivel, bruto: 0, r: null as null | ReturnType<typeof simularResgateFifo> };
    return { disponivel, bruto, r: simularResgateFifo(lotes, bruto, hojeIso, resgateAlvo.tributacao) };
  })();

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

  // Sem descrição: "CDB", "LCI IPCA+", "Tesouro Selic"; aplicação antiga sem tipo: "Aplicação em CDI"
  const nomeAplicacao = (a: Aplicacao) =>
    a.descricao || (a.tipo ? nomePadraoAplicacao(a) : `Aplicação em ${nomePadraoAplicacao(a)}`);

  return (
    // Entra com animação quando os dados chegam (o carregamento retorna antes, com esqueleto)
    <div className="motion-safe:animate-conteudo-in">
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
          <div className="flex justify-end -mb-4">
            {(() => {
              const ids = gruposPorConta.flatMap((g) => g.aplicacoes.map((a) => a.id));
              const todosAbertos = ids.every((id) => cardsAbertos.has(id));
              return (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-gray-600 dark:text-gray-400"
                  onClick={() => setCardsAbertos(todosAbertos ? new Set() : new Set(ids))}
                >
                  {todosAbertos
                    ? <><ChevronsDownUp className="w-3.5 h-3.5 mr-1.5" />Recolher todos</>
                    : <><ChevronsUpDown className="w-3.5 h-3.5 mr-1.5" />Expandir todos</>}
                </Button>
              );
            })()}
          </div>
          {gruposPorConta.map((grupo) => (
            <div key={grupo.contaId}>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 px-1">
                {grupo.nomeConta}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4 items-start">
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
                  const cardAberto = cardsAbertos.has(a.id);
                  // Prazo na linha do cabeçalho: é o que mais se consulta numa aplicação
                  const resumoPrazo = ativa
                    ? (liquidezDiaria ? "liquidez diária" : `vence ${fmtIso(a.dataVencimento!)}`)
                    : (a.dataResgate ? `resgatada em ${fmtIso(new Date(a.dataResgate).toISOString())}` : "resgatada");

                  return (
                    <Card key={a.id} className="py-0 gap-0 dark:bg-gray-900 dark:border-gray-800">
                      <CardContent className="p-0">
                        {/* Cabeçalho: nome, indexador, prazo, valor atual e rendimento. Clicar abre o resto */}
                        <div
                          role="button"
                          tabIndex={0}
                          aria-expanded={cardAberto}
                          aria-label={`${nomeAplicacao(a)}: ${cardAberto ? "ocultar" : "ver"} detalhes`}
                          onClick={() => alternarCard(a.id)}
                          onKeyDown={(e) => {
                            if (e.target !== e.currentTarget || (e.key !== "Enter" && e.key !== " ")) return;
                            e.preventDefault();
                            alternarCard(a.id);
                          }}
                          className="flex items-center gap-2.5 px-4 py-3.5 cursor-pointer rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        >
                          <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30 flex-shrink-0">
                            <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                              {nomeAplicacao(a)}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {/* em português: "120%" ou "102,5%" (o banco devolve "120.00") */}
                              {a.tipo && a.descricao && `${TIPO_APLICACAO_LABEL[a.tipo]} · `}{descreverRentabilidade(a)} · {resumoPrazo}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-base font-bold text-gray-900 dark:text-white">
                              {mask(formatarMoeda(valorExibido))}
                            </p>
                            <p className="text-xs font-medium text-green-600 dark:text-green-400">
                              +{mask(formatarMoeda(rendimento))}
                            </p>
                          </div>
                          <ChevronDown
                            aria-hidden="true"
                            className={cn("w-4 h-4 flex-shrink-0 text-gray-400 transition-transform duration-300", cardAberto && "rotate-180")}
                          />
                        </div>

                        {/* Detalhes: a grade anima a altura de 0fr a 1fr; fechado, o conteúdo fica inerte (sem foco) */}
                        <div
                          className={cn(
                            "grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                            cardAberto ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                          )}
                        >
                          <div className="overflow-hidden" inert={!cardAberto}>
                            <div className="px-4 pb-4 space-y-3">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                  Principal investido: {mask(formatarMoeda(principalExibido))}
                                  {a.rendeNoDiaAporte && " · rende no dia do aporte"}
                                </p>
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 text-[11px] text-gray-600 dark:text-gray-400"
                                    onClick={() => abrirEdicao(a)}
                                  >
                                    <Pencil className="w-3 h-3 mr-1" />
                                    Editar
                                  </Button>
                                  <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                                    {a.tributacao === "isento" ? "Isento de IR" : "Tributável"}
                                  </Badge>
                                  {a.tipo ? (
                                    <Badge variant="outline" className="text-[10px] px-2 py-0.5" title={temFgc(a.tipo) ? "Coberto pelo Fundo Garantidor de Créditos" : "Não tem a garantia do Fundo Garantidor de Créditos"}>
                                      {temFgc(a.tipo) ? "Garantia FGC" : "Sem FGC"}
                                    </Badge>
                                  ) : (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-6 px-2 text-[11px] text-blue-700 dark:text-blue-400"
                                      onClick={() => { setTipoEscolhido(""); setTipoAlvo(a); }}
                                    >
                                      Definir tipo
                                    </Button>
                                  )}
                                </div>
                              </div>

                              {/* IR e líquido estimados — comparáveis com a corretora */}
                              {visao && a.tributacao === "tributavel" && (
                                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2.5 space-y-1 text-xs">
                                  <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">IR estimado (se resgatar hoje)</span>
                                    <span className="font-medium text-red-600 dark:text-red-400">-{mask(formatarMoeda(visao.est.impostoRetido))}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="font-medium text-gray-700 dark:text-gray-300">Líquido estimado</span>
                                    <span className="font-bold text-gray-900 dark:text-white">{mask(formatarMoeda(visao.est.valorLiquido))}</span>
                                  </div>
                                </div>
                              )}

                              {visao && visao.diasProjetados > 0 && (
                                <p className="flex items-start gap-1.5 text-[11px] text-amber-700 dark:text-amber-400">
                                  <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                  Inclui {visao.diasProjetados} dia(s) útil(eis) estimado(s): o BCB ainda não publicou {usaTaxaAnual(a.indexador) ? "o calendário" : "a taxa"}.
                                  Confirmado até {a.ultimaTaxa ? fmtIso(a.ultimaTaxa.data) : "—"}: {mask(formatarMoeda(visao.oficialBruto))}.
                                </p>
                              )}

                              {/* IPCA+: a inflação do mês só sai no mês seguinte; até lá repete a última */}
                              {ativa && a.indexador === "ipca" && (
                                <p className="flex items-start gap-1.5 text-[11px] text-gray-500 dark:text-gray-400">
                                  <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                  {a.ultimoIpca
                                    ? <>Valor na curva (levando até o vencimento). IPCA publicado até {a.ultimoIpca.mes.split("-").reverse().join("/")} ({a.ultimoIpca.taxa.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%); os meses seguintes usam esse valor até sair o oficial.</>
                                    : <>Valor na curva (levando até o vencimento). O IPCA ainda não foi carregado: clique em atualizar.</>}
                                </p>
                              )}
                              {ativa && a.indexador === "prefixado" && (
                                <p className="flex items-start gap-1.5 text-[11px] text-gray-500 dark:text-gray-400">
                                  <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                  Valor na curva (levando até o vencimento). Vendendo antes, vale o preço de mercado, que pode ser maior ou menor.
                                </p>
                              )}

                              {/* Liquidez diária já aparece no cabeçalho; aqui só a barra de prazo de quem vence */}
                              {ativa && !liquidezDiaria && (
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Vence em {fmtIso(a.dataVencimento!)}</span>
                                    <span>{dias}d restantes</span>
                                  </div>
                                  <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-300" style={{ width: `${progresso}%` }} />
                                  </div>
                                </div>
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
                                      IR retido: {mask(formatarMoeda(Number(a.impostoRetido)))}
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
                                                <span className="flex flex-col items-start text-gray-700 dark:text-gray-300">
                                                  <span>
                                                    {fmtIso(x.data)}
                                                    {x.historico && <span className="ml-1 text-[10px] text-gray-400">(histórico)</span>}
                                                  </span>
                                                  <button
                                                    type="button"
                                                    onClick={() => setDescontoAlvo({ aplicacao: a, aporte: x })}
                                                    className={cn(
                                                      "text-[11px] font-medium hover:underline",
                                                      x.historico ? "text-blue-700 dark:text-blue-400" : "text-gray-500 dark:text-gray-400",
                                                    )}
                                                  >
                                                    {x.historico ? "Descontar da conta" : "Desfazer desconto"}
                                                  </button>
                                                </span>
                                                <span className="text-gray-500 dark:text-gray-400">
                                                  {mask(formatarMoeda(Number(x.valor)))} → <strong className="text-gray-900 dark:text-white">{mask(formatarMoeda(Number(x.valorAtual)))}</strong>
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
                                                {mask(formatarMoeda(Number(r.valorBruto)))}
                                                {r.impostoRetido && Number(r.impostoRetido) > 0 && (
                                                  <span className="text-red-600 dark:text-red-400"> (IR {mask(formatarMoeda(Number(r.impostoRetido)))})</span>
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
                            </div>
                          </div>
                        </div>
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
            <DialogTitle>{editando ? "Editar aplicação" : "Nova Aplicação"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {editando && (
              <p className="flex items-start gap-1.5 rounded-lg bg-gray-50 dark:bg-gray-800/50 p-2.5 text-[11px] text-gray-600 dark:text-gray-400">
                <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                {editando.resgatada
                  ? "Aplicação resgatada: só a descrição e o tipo podem mudar."
                  : "Mudar a rentabilidade, a tributação ou o vencimento recalcula o rendimento desde o primeiro aporte. Valor, data e conta dos aportes não mudam aqui."}
              </p>
            )}
            {!editando && (
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
            )}

            {/* Data e tipo lado a lado; as dicas de cada um ficam abaixo, na largura toda. Na edição, só o tipo */}
            <div className={cn("grid grid-cols-1 gap-3 items-start", !editando && "min-[420px]:grid-cols-2")}>
              {!editando && (
              <div className="space-y-1.5">
                <Label htmlFor="aplicacao-data">Data da aplicação</Label>
                <Input
                  id="aplicacao-data"
                  type="date"
                  max={hojeIso}
                  value={form.dataAplicacao}
                  onChange={(e) => updateForm("dataAplicacao", e.target.value)}
                />
              </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="aplicacao-tipo">Tipo</Label>
                <Select value={form.tipoProduto} onValueChange={(v: TipoAplicacao) => escolherTipoProduto(v)}>
                  <SelectTrigger id="aplicacao-tipo" className="w-full"><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                  <SelectContent>
                    {(editando?.resgatada ? tiposParaIndexador(editando.indexador) : TIPOS_APLICACAO).map((t) => (
                      <SelectItem key={t} value={t}>{TIPO_APLICACAO_LABEL[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {(form.tipoProduto || (!editando && form.dataAplicacao && form.dataAplicacao < hojeIso)) && (
              <div className="-mt-2 space-y-1">
                {form.tipoProduto && (
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    {TIPO_APLICACAO_DESCRICAO[form.tipoProduto]}
                    {tributacaoDoTipo(form.tipoProduto) === "isento" ? " · isento de IR" : " · tributável"}
                    {temFgc(form.tipoProduto) ? " · garantia do FGC" : " · sem FGC"}
                  </p>
                )}
                {!editando && form.dataAplicacao && form.dataAplicacao < hojeIso && (
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 flex items-start gap-1">
                    <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    Data passada: o rendimento e o IR são calculados desde essa data.
                  </p>
                )}
              </div>
            )}

            {!editando && form.dataAplicacao && form.dataAplicacao < hojeIso && (
            <div className="flex items-center justify-between gap-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Descontar do saldo da conta</span>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {form.movimentar
                    ? "O valor sai da conta escolhida, com o lançamento no extrato na data informada."
                    : "Só registro histórico: o rendimento e o IR contam desde essa data, mas o saldo da conta não muda (para quando o dinheiro já saiu da conta)."}
                </p>
              </div>
              <Switch
                checked={form.movimentar}
                onCheckedChange={(checked) => updateForm("movimentar", checked)}
                aria-label="Descontar do saldo da conta"
              />
            </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="aplicacao-descricao">Descrição (opcional)</Label>
              <Input
                id="aplicacao-descricao"
                value={form.descricao}
                onChange={(e) => updateForm("descricao", e.target.value)}
                placeholder="Ex: Reserva de emergência"
              />
            </div>

            {/* Resgatada: a rentabilidade e o vencimento não mudam mais */}
            {!editando?.resgatada && (
              <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Indexador</Label>
                  <Select value={form.indexador} onValueChange={(v: Indexador) => updateForm("indexador", v)}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(form.tipoProduto ? indexadoresDoTipo(form.tipoProduto) : INDEXADORES).map((i) => (
                        <SelectItem key={i} value={i}>{INDEXADOR_LABEL[i]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {usaTaxaAnual(form.indexador) ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="aplicacao-taxa">{form.indexador === "ipca" ? "Taxa acima do IPCA (% a.a.)" : "Taxa (% a.a.)"}</Label>
                    <Input
                      id="aplicacao-taxa"
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      placeholder={form.indexador === "ipca" ? "Ex: 6,5" : "Ex: 13,5"}
                      value={form.taxaAnual}
                      onChange={(e) => updateForm("taxaAnual", e.target.value)}
                    />
                  </div>
                ) : (
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
                )}
              </div>
              {usaTaxaAnual(form.indexador) && (
                <p className="-mt-2 text-[11px] text-gray-500 dark:text-gray-400">
                  Sem cupom (os juros vêm no vencimento), calculado na curva: o valor que o título atinge se for levado até o vencimento.
                  {form.indexador === "ipca" && " A inflação vem do IPCA mensal do Banco Central."}
                </p>
              )}

              <div className="space-y-1.5">
                <Label>Tributação</Label>
                <Select value={form.tributacao} onValueChange={(v: "isento" | "tributavel") => updateForm("tributacao", v)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
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

              {/* Liquidez diária só em CDB/RDB/LC atrelados ao CDI */}
              {form.tipoProduto && podeSemVencimento(form.tipoProduto, form.indexador) && (
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
              )}

              {(!form.semVencimento || !form.tipoProduto || !podeSemVencimento(form.tipoProduto, form.indexador)) && (
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
              </>
            )}

            {erro && (
              <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {erro}
              </p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setModalNovaOpen(false)}>Cancelar</Button>
            <Button
              onClick={confirmarNovaAplicacao}
              disabled={criar.isPending || editarAplicacao.isPending}
              className="bg-blue-700 text-white hover:bg-blue-800"
            >
              {editando
                ? (editarAplicacao.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</> : "Salvar")
                : (criar.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Aplicando...</> : "Aplicar")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Definir o tipo de uma aplicação antiga ─────────────────────────── */}
      <Dialog open={!!tipoAlvo} onOpenChange={(v) => { if (!v && !definirTipo.isPending) setTipoAlvo(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Definir tipo</DialogTitle>
            <DialogDescription>
              {tipoAlvo && <>Qual é o tipo de <strong>{nomeAplicacao(tipoAlvo)}</strong> ({descreverRentabilidade(tipoAlvo)})?</>}
            </DialogDescription>
          </DialogHeader>
          {tipoAlvo && (
            <div className="space-y-2">
              <Select value={tipoEscolhido} onValueChange={(v: TipoAplicacao) => setTipoEscolhido(v)}>
                <SelectTrigger className="w-full" aria-label="Tipo"><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                <SelectContent>
                  {tiposParaIndexador(tipoAlvo.indexador).map((t) => (
                    <SelectItem key={t} value={t}>{TIPO_APLICACAO_LABEL[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {tipoEscolhido && (
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  {TIPO_APLICACAO_DESCRICAO[tipoEscolhido]}{temFgc(tipoEscolhido) ? " · garantia do FGC" : " · sem FGC"}
                </p>
              )}
              {tipoEscolhido && tributacaoDoTipo(tipoEscolhido) !== tipoAlvo.tributacao && (
                <p className="flex items-start gap-1.5 text-[11px] text-amber-700 dark:text-amber-400">
                  <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  {TIPO_APLICACAO_LABEL[tipoEscolhido]} costuma ser {tributacaoDoTipo(tipoEscolhido) === "isento" ? "isento de IR" : "tributável"}, mas esta aplicação está cadastrada como {tipoAlvo.tributacao === "isento" ? "isenta" : "tributável"}. O tipo não muda a tributação.
                </p>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setTipoAlvo(null)} disabled={definirTipo.isPending}>Cancelar</Button>
            <Button
              className="bg-blue-700 text-white hover:bg-blue-800"
              disabled={!tipoEscolhido || definirTipo.isPending}
              onClick={() => {
                if (!tipoAlvo || !tipoEscolhido) return;
                definirTipo.mutate({ id: tipoAlvo.id, tipo: tipoEscolhido }, { onSuccess: () => setTipoAlvo(null) });
              }}
            >
              {definirTipo.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</> : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Descontar aporte da conta / desfazer o desconto ──────────────── */}
      {(() => {
        const alvo = descontoAlvo;
        const descontar = alvo?.aporte.historico ?? true;
        const valorAporte = alvo ? mask(formatarMoeda(Number(alvo.aporte.valor))) : "";
        const conta = alvo ? nomeConta(alvo.aporte.contaId ?? alvo.aplicacao.contaId) : "";
        const ocupado = descontoAporte.isPending;
        const fechar = () => { if (!ocupado) setDescontoAlvo(null); };
        return (
          <Dialog open={!!alvo} onOpenChange={(v) => { if (!v) fechar(); }}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{descontar ? "Descontar aporte da conta" : "Desfazer desconto do aporte"}</DialogTitle>
                <DialogDescription>
                  {alvo && (
                    <>
                      {descontar
                        ? <>Sai <strong>{valorAporte}</strong> da conta <strong>{conta}</strong>, com o lançamento no extrato em {fmtIso(alvo.aporte.data)}.</>
                        : <>Volta <strong>{valorAporte}</strong> para a conta <strong>{conta}</strong>, e o lançamento de {fmtIso(alvo.aporte.data)} sai do extrato. O aporte fica como histórico.</>}
                    </>
                  )}
                </DialogDescription>
              </DialogHeader>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {descontar
                  ? "Use quando o aporte foi registrado sem tirar o dinheiro da conta. Em data antiga, o saldo mostrado no extrato daquela data em diante fica menor. O rendimento não muda."
                  : "Use quando o aporte foi descontado por engano, porque o dinheiro já tinha saído da conta. O rendimento não muda."}
              </p>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={fechar} disabled={ocupado}>Cancelar</Button>
                <Button
                  variant={descontar ? "default" : "destructive"}
                  className={descontar ? "bg-blue-700 text-white hover:bg-blue-800" : undefined}
                  disabled={ocupado}
                  onClick={() => {
                    if (!alvo) return;
                    descontoAporte.mutate(
                      { id: alvo.aplicacao.id, aporteId: alvo.aporte.id, descontado: descontar },
                      { onSuccess: () => setDescontoAlvo(null) },
                    );
                  }}
                >
                  {ocupado
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{descontar ? "Descontando..." : "Desfazendo..."}</>
                    : descontar ? "Descontar da conta" : "Desfazer desconto"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        );
      })()}

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
                <p className="text-[11px] text-gray-500 dark:text-gray-400 flex items-start gap-1">
                  <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  Data passada: o rendimento e o IR contam desde essa data.
                </p>
              ) : (
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  O valor sai da conta agora e começa a render no próximo dia útil.
                </p>
              )}
            </div>

            {aporteForm.data && aporteForm.data < hojeIso && (
            <div className="flex items-center justify-between gap-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Descontar do saldo da conta</span>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {aporteForm.movimentar
                    ? "O valor sai da conta escolhida, com o lançamento no extrato na data informada."
                    : "Só registro histórico: o rendimento e o IR contam desde essa data, mas o saldo da conta não muda (para quando o dinheiro já saiu da conta)."}
                </p>
              </div>
              <Switch
                checked={aporteForm.movimentar}
                onCheckedChange={(checked) => updateAporte("movimentar", checked)}
                aria-label="Descontar do saldo da conta"
              />
            </div>
            )}

            {erroAporte && (
              <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {erroAporte}
              </p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAporteAlvo(null)}>Cancelar</Button>
            <Button onClick={confirmarAporte} disabled={aportar.isPending} className="bg-blue-700 text-white hover:bg-blue-800">
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
                    Valor BRUTO a retirar (disponível: {mask(formatarMoeda(previewResgate.disponivel))}). O IR é descontado desse valor
                    e sai primeiro dos aportes mais antigos.
                  </p>
                </div>
              )}

              {previewResgate.r && (
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Valor resgatado (bruto):</span>
                    <span className="font-medium text-gray-900 dark:text-white">{mask(formatarMoeda(previewResgate.r.bruto))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Rendimento nesse valor:</span>
                    <span className="font-medium text-green-600 dark:text-green-400">+{mask(formatarMoeda(previewResgate.r.rendimentoBruto))}</span>
                  </div>

                  {resgateAlvo.tributacao === "tributavel" ? (
                    <>
                      {previewResgate.r.consumo.map((c) => {
                        const lote = resgateAlvo.aportes.find((x) => x.id === c.loteId);
                        return (
                          <div key={c.loteId} className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                            <span>Aporte de {lote ? fmtIso(lote.data) : "—"} · IR {c.aliquota}%</span>
                            <span>-{mask(formatarMoeda(c.imposto))}</span>
                          </div>
                        );
                      })}
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">IR retido:</span>
                        <span className="font-medium text-red-600 dark:text-red-400">-{mask(formatarMoeda(previewResgate.r.impostoRetido))}</span>
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
                    <span className="font-bold text-gray-900 dark:text-white">{mask(formatarMoeda(previewResgate.r.valorLiquido))}</span>
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
              className="bg-blue-700 text-white hover:bg-blue-800"
              disabled={resgatar.isPending}
            >
              {resgatar.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Resgatando...</> : "Confirmar resgate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}