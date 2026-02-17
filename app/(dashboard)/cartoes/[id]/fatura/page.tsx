"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  CheckCircle,
  AlertCircle,
  PieChart,
  Receipt,
  Loader2,
  Lock,
  Unlock,
  Info,
} from "lucide-react";

import { useFaturaCartao, usePagarFatura } from "@/hooks/useFaturas";
import { useFaturasPendentes } from "@/hooks/useFaturasPendentes";
import { useContas } from "@/hooks/useContas";
import FaturaItem from "@/components/fatura/FaturaItem";
import PagarFaturaModal from "@/components/fatura/PagarFaturaModal";
import AlertaFaturasPendentes from "@/components/fatura/AlertaFaturasPendentes";
import { usePeriodo } from "@/contexts/PeriodoContext";

// ============================================================================
// CONSTANTES
// ============================================================================

const meses = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const mesesAbreviados = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

const hoje     = new Date();
const diaAtual = hoje.getDate();
const mesAtual = hoje.getMonth();    // 0-11
const anoAtual = hoje.getFullYear();

// ============================================================================
// HELPERS
// ============================================================================

function calcularFaturaAtiva(diaFechamento: number): { mes: number; ano: number } {
  if (diaAtual >= diaFechamento) {
    if (mesAtual === 11) return { mes: 0, ano: anoAtual + 1 };
    return { mes: mesAtual + 1, ano: anoAtual };
  }
  return { mes: mesAtual, ano: anoAtual };
}

// ============================================================================
// COMPONENTE
// ============================================================================

export default function FaturaPage() {
  const params       = useParams();
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { mesSelecionado, anoSelecionado, setMesSelecionado, setAnoSelecionado } = usePeriodo();
  const { id } = params as { id: string };

  const [modalAberto, setModalAberto] = useState(false);
  const pagarFaturaMutation = usePagarFatura();

  // ── Cleanup: restaura seletor ao sair da página ───────────────────────────
  useEffect(() => {
    return () => {
      setMesSelecionado(mesAtual);
      setAnoSelecionado(anoAtual);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data: contas = [], isLoading: contasLoading } = useContas();

  // ── Override via URL (?mes=1&ano=2026) ────────────────────────────────────
  // Usado pelo AlertaFaturasPendentes para abrir mês específico sem depender
  // do seletor global (que é sempre resetado para o mês atual)
  const mesUrl  = searchParams.get("mes")  ? Number(searchParams.get("mes"))  - 1 : null; // 0-11
  const anoUrl  = searchParams.get("ano")  ? Number(searchParams.get("ano"))      : null;
  const temOverrideUrl = mesUrl !== null && anoUrl !== null;

  // ── 1º fetch: período de referência (para obter cartão + diaFechamento) ───
  const periodoRef = temOverrideUrl
    ? { mes: mesUrl!, ano: anoUrl! }
    : { mes: mesSelecionado, ano: anoSelecionado };

  const {
    fatura,
    cartao,
    transacoes,
    porCategoria,
    isLoading: faturaLoading,
  } = useFaturaCartao({
    cartaoId: id,
    ano: periodoRef.ano,
    mes: periodoRef.mes + 1,
  });

  // ── Período final ─────────────────────────────────────────────────────────
  const { mesFinal, anoFinal, automatico } = useMemo(() => {
    // Prioridade 1: override via URL (?mes=2&ano=2026 → exibe Fevereiro)
    if (temOverrideUrl) {
      return { mesFinal: mesUrl!, anoFinal: anoUrl!, automatico: false };
    }

    // Prioridade 2: seletor global alterado pelo usuário no TopMenu
    const seletorAlterado = mesSelecionado !== mesAtual || anoSelecionado !== anoAtual;
    if (seletorAlterado) {
      return { mesFinal: mesSelecionado, anoFinal: anoSelecionado, automatico: false };
    }

    // Prioridade 3: cálculo automático pelo diaFechamento
    if (cartao?.diaFechamento) {
      const { mes, ano } = calcularFaturaAtiva(cartao.diaFechamento);
      return { mesFinal: mes, anoFinal: ano, automatico: true };
    }

    // Fallback
    return { mesFinal: mesSelecionado, anoFinal: anoSelecionado, automatico: false };
  }, [temOverrideUrl, mesUrl, anoUrl, mesSelecionado, anoSelecionado, cartao?.diaFechamento]);

  const periodoMudou = mesFinal !== periodoRef.mes || anoFinal !== periodoRef.ano;

  // ── 2º fetch: período final quando difere do de referência ────────────────
  const {
    fatura: faturaFinal,
    transacoes: transacoesFinal,
    porCategoria: porCategoriaFinal,
    isLoading: faturaFinalLoading,
  } = useFaturaCartao({
    cartaoId: id,
    ano: anoFinal,
    mes: mesFinal + 1,
  });

  const dadosFatura       = periodoMudou ? faturaFinal       : fatura;
  const dadosTransacoes   = periodoMudou ? transacoesFinal   : transacoes;
  const dadosPorCategoria = periodoMudou ? porCategoriaFinal : porCategoria;

  // ── Faturas pendentes (últimos 4 meses) ───────────────────────────────────
  const { pendentes, isLoading: pendentesLoading } = useFaturasPendentes(id);

  const pendentesOutrosMeses = pendentes.filter(
    (p) => !(p.mes === mesFinal + 1 && p.ano === anoFinal)
  );

  // ── Fatura ativa de referência ────────────────────────────────────────────
  const faturaAtiva = useMemo(
    () => cartao?.diaFechamento ? calcularFaturaAtiva(cartao.diaFechamento) : null,
    [cartao?.diaFechamento]
  );

  const isExibindoFaturaAtiva =
    faturaAtiva &&
    mesFinal === faturaAtiva.mes &&
    anoFinal === faturaAtiva.ano;

  // ── Pagar fatura ──────────────────────────────────────────────────────────
  const handlePagarFatura = async (dados: { contaId: string; dataPagamento?: string }) => {
    await pagarFaturaMutation.mutateAsync({
      cartaoId: Number(id),
      ano: anoFinal,
      mes: mesFinal + 1,
      contaId: dados.contaId,
      dataPagamento: dados.dataPagamento,
    });
    setModalAberto(false);
  };

  const formatarMoeda = (valor: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);

  if (!id) {
    return (
      <div className="max-w-3xl mx-auto p-4 md:p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Parâmetros inválidos.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const loading = faturaLoading || faturaFinalLoading || contasLoading;

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-4 md:space-y-6">
        <div className="space-y-3">
          <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-48 animate-pulse" />
          <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="h-40 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
          <div className="h-40 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  const totalFatura = Number(dadosFatura?.total ?? 0);
  const faturaVazia = dadosTransacoes.length === 0;
  const categorias  = Object.entries(dadosPorCategoria || {});
  const categoriaComMaiorGasto =
    categorias.length > 0
      ? categorias.reduce((max, cat) => (cat[1] > max[1] ? cat : max))
      : null;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-4 md:space-y-6">

      {/* ── HEADER ── */}
      <div className="flex items-start gap-2 md:gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="h-9 w-9 mt-0.5 flex-shrink-0"
        >
          <ArrowLeft size={18} />
        </Button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white">
              Fatura — {meses[mesFinal]} {anoFinal}
            </h1>

            {cartao?.diaFechamento && (
              <Badge className={`text-xs flex items-center gap-1 ${
                isExibindoFaturaAtiva && !dadosFatura?.paga
                  ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 border border-green-200 dark:border-green-800"
                  : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700"
              }`}>
                {isExibindoFaturaAtiva && !dadosFatura?.paga
                  ? <><Unlock size={11} /> Fatura Aberta</>
                  : <><Lock   size={11} /> Fatura Fechada</>
                }
              </Badge>
            )}
          </div>

          <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {cartao?.diaFechamento
              ? `Fechamento dia ${cartao.diaFechamento} • Vencimento dia ${cartao.diaVencimento ?? "—"}`
              : "Visualize e gerencie sua fatura"}
          </p>
        </div>
      </div>

      {/* ── ALERTA: faturas pendentes de outros meses ── */}
      {(pendentesOutrosMeses.length > 0 || pendentesLoading) && (
        <AlertaFaturasPendentes
          cartaoId={id}
          pendentes={pendentesOutrosMeses}
          isLoading={pendentesLoading}
        />
      )}

      {/* ── INFO: mês calculado automaticamente ── */}
      {automatico && cartao?.diaFechamento && (
        <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-900 py-2.5">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <AlertDescription className="text-xs text-blue-800 dark:text-blue-300">
            {diaAtual >= cartao.diaFechamento
              ? `A fatura de ${mesesAbreviados[mesAtual]} fechou no dia ${cartao.diaFechamento}. Exibindo a fatura aberta de ${meses[mesFinal]} ${anoFinal}.`
              : `Fatura aberta — fecha no dia ${cartao.diaFechamento} de ${meses[mesFinal]}.`
            }
            {" "}<span className="opacity-70">Use o seletor de período para ver outros meses.</span>
          </AlertDescription>
        </Alert>
      )}

      {/* ── CARD DE RESUMO ── */}
      <Card className={
        dadosFatura?.paga
          ? "border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-900"
          : "border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-900"
      }>
        <CardContent className="p-4 md:p-6 space-y-4">
          <Badge className={`${
            dadosFatura?.paga
              ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
              : "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300"
          } text-xs md:text-sm`}>
            {dadosFatura?.paga
              ? <><CheckCircle size={12} className="mr-1" /> Fatura Paga</>
              : <><AlertCircle size={12} className="mr-1" /> Em Aberto</>
            }
          </Badge>

          <div>
            <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Total da Fatura</p>
            <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white break-all">
              {dadosFatura ? formatarMoeda(totalFatura) : "—"}
            </p>
          </div>

          {!dadosFatura?.paga && dadosTransacoes.length > 0 && (
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {dadosTransacoes.length}{" "}
              {dadosTransacoes.length === 1 ? "transação" : "transações"} neste período
            </p>
          )}

          {!dadosFatura?.paga && dadosTransacoes.length > 0 && (
            <Button
              onClick={() => setModalAberto(true)}
              disabled={pagarFaturaMutation.isPending}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {pagarFaturaMutation.isPending
                ? <><Loader2 size={16} className="mr-2 animate-spin" /> Pagando...</>
                : <><DollarSign size={16} className="mr-2" /> Pagar Fatura</>
              }
            </Button>
          )}

          {!dadosFatura && !loading && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Nenhuma fatura encontrada para {meses[mesFinal]}/{anoFinal}.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── INSIGHT ── */}
      {categoriaComMaiorGasto && !faturaVazia && (
        <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-900">
          <PieChart className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
          <AlertDescription className="text-xs md:text-sm text-blue-800 dark:text-blue-200">
            <strong>Maior gasto:</strong> {categoriaComMaiorGasto[0]} com{" "}
            {formatarMoeda(categoriaComMaiorGasto[1])} (
            {((categoriaComMaiorGasto[1] / totalFatura) * 100).toFixed(1)}% do total)
          </AlertDescription>
        </Alert>
      )}

      {/* ── GRID: Categorias + Informações ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm md:text-base flex items-center gap-2">
              <PieChart size={16} className="text-blue-600" />
              Resumo por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {categorias.length === 0 ? (
              <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
                Sem categorias para exibir
              </p>
            ) : (
              <div className="space-y-3">
                {categorias
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 5)
                  .map(([categoria, valor]) => {
                    const pct = (valor / totalFatura) * 100;
                    return (
                      <div key={categoria} className="space-y-1.5">
                        <div className="flex justify-between text-xs md:text-sm gap-2">
                          <span className="font-medium text-gray-700 dark:text-gray-300 truncate">
                            {categoria}
                          </span>
                          <span className="text-gray-900 dark:text-white font-semibold flex-shrink-0">
                            {formatarMoeda(valor)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={pct} className="h-1.5 flex-1" />
                          <span className="text-xs text-gray-500 w-10 text-right flex-shrink-0">
                            {pct.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm md:text-base flex items-center gap-2">
              <Calendar size={16} className="text-blue-600" />
              Informações
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {[
              { icon: Receipt,  label: "Transações", value: dadosTransacoes.length },
              { icon: PieChart, label: "Categorias",  value: categorias.length },
              { icon: Calendar, label: "Período",     value: `${meses[mesFinal]}/${anoFinal}` },
              ...(cartao?.diaFechamento
                ? [{ icon: Lock, label: "Fechamento", value: `Dia ${cartao.diaFechamento}` }]
                : []),
            ].map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-900 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <Icon size={14} className="text-gray-600 dark:text-gray-400 flex-shrink-0" />
                  <span className="text-xs md:text-sm text-gray-600 dark:text-gray-400">{label}</span>
                </div>
                <span className="font-semibold text-sm text-gray-900 dark:text-white">{value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* ── LISTA DE TRANSAÇÕES ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm md:text-base flex items-center gap-2">
            <Receipt size={16} className="text-blue-600" />
            Transações ({dadosTransacoes.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {faturaVazia ? (
            <div className="text-center py-8 md:py-12">
              <Receipt className="mx-auto mb-3 text-gray-300" size={40} />
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                Nenhuma transação encontrada
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                Não há transações para {meses[mesFinal]}/{anoFinal}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {dadosTransacoes.map((t) => (
                <FaturaItem key={t.id} transacao={t} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── MODAL ── */}
      <PagarFaturaModal
        aberto={modalAberto}
        onClose={() => setModalAberto(false)}
        total={totalFatura}
        contas={contas}
        onConfirmar={handlePagarFatura}
        loading={pagarFaturaMutation.isPending}
      />
    </div>
  );
}