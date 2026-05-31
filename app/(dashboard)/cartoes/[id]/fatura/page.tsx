"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Zap,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";

import {
  useFaturaCartao,
  usePagarFatura,
  useAdiantamentos,
  useRegistrarAdiantamento,
  useCancelarAdiantamento,
} from "@/hooks/useFaturas";
import { useFaturasPendentes } from "@/hooks/useFaturasPendentes";
import { useContas } from "@/hooks/useContas";
import FaturaItem from "@/components/fatura/FaturaItem";
import PagarFaturaModal from "@/components/fatura/PagarFaturaModal";
import AdiantamentoFaturaModal from "@/components/fatura/AdiantamentoFaturaModal";
import AdiantamentosLista from "@/components/fatura/AdiantamentosLista";
import AlertaFaturasPendentes from "@/components/fatura/AlertaFaturasPendentes";
import { usePeriodo } from "@/contexts/PeriodoContext";
import { useHideValues } from "@/contexts/HideValuesContext";

const meses = [
  "Janeiro",
  "Fevereiro",
  "Marco",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
const mesesAbreviados = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

const hoje = new Date();
const diaAtual = hoje.getDate();
const mesAtual = hoje.getMonth();
const anoAtual = hoje.getFullYear();

function calcularFaturaAtiva(diaFechamento: number) {
  if (diaAtual >= diaFechamento) {
    if (mesAtual === 11) return { mes: 0, ano: anoAtual + 1 };
    return { mes: mesAtual + 1, ano: anoAtual };
  }
  return { mes: mesAtual, ano: anoAtual };
}

export default function FaturaPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    mesSelecionado,
    anoSelecionado,
    setMesSelecionado,
    setAnoSelecionado,
    registrarOnNavegacao,
  } = usePeriodo();
  const { mask } = useHideValues();
  const { id } = params as { id: string };

  const mesUrl =
    searchParams.get("mes") !== null
      ? Number(searchParams.get("mes")) - 1
      : null;
  const anoUrl =
    searchParams.get("ano") !== null ? Number(searchParams.get("ano")) : null;
  const veioViaLink = mesUrl !== null && anoUrl !== null;

  const [modalPagar, setModalPagar] = useState(false);
  const [modalAdiantamento, setModalAdiantamento] = useState(false);
  const [modalCancelarPgto, setModalCancelarPgto] = useState(false);
  const [usuarioNavegou, setUsuarioNavegou] = useState(veioViaLink);

  const pagarFaturaMutation = usePagarFatura();
  const registrarAdiantamento = useRegistrarAdiantamento();
  const cancelarAdiantamentoMut = useCancelarAdiantamento();

  useEffect(() => {
    registrarOnNavegacao(() => setUsuarioNavegou(true));
    return () => registrarOnNavegacao(null);
  }, [registrarOnNavegacao]);

  useEffect(() => {
    if (!veioViaLink || mesUrl === null || anoUrl === null) return;
    setMesSelecionado(mesUrl);
    setAnoSelecionado(anoUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      setMesSelecionado(mesAtual);
      setAnoSelecionado(anoAtual);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data: contas = [], isLoading: contasLoading } = useContas();

  const {
    fatura,
    cartao,
    transacoes,
    porCategoria,
    isLoading: faturaLoading,
  } = useFaturaCartao({
    cartaoId: id,
    ano: anoSelecionado,
    mes: mesSelecionado + 1,
  });

  const { mesFinal, anoFinal, automatico } = useMemo(() => {
    if (usuarioNavegou)
      return {
        mesFinal: mesSelecionado,
        anoFinal: anoSelecionado,
        automatico: false,
      };
    if (cartao?.diaFechamento) {
      const { mes, ano } = calcularFaturaAtiva(cartao.diaFechamento);
      return { mesFinal: mes, anoFinal: ano, automatico: true };
    }
    return {
      mesFinal: mesSelecionado,
      anoFinal: anoSelecionado,
      automatico: false,
    };
  }, [usuarioNavegou, mesSelecionado, anoSelecionado, cartao?.diaFechamento]);

  useEffect(() => {
    if (!automatico) return;
    if (mesFinal === mesSelecionado && anoFinal === anoSelecionado) return;
    setMesSelecionado(mesFinal);
    setAnoSelecionado(anoFinal);
  }, [automatico, mesFinal, anoFinal]); // eslint-disable-line react-hooks/exhaustive-deps

  const periodoMudou =
    mesFinal !== mesSelecionado || anoFinal !== anoSelecionado;
  const {
    fatura: faturaFinal,
    transacoes: transacoesFinal,
    porCategoria: porCategoriaFinal,
    isLoading: faturaFinalLoading,
  } = useFaturaCartao({ cartaoId: id, ano: anoFinal, mes: mesFinal + 1 });

  const dadosFatura = periodoMudou ? faturaFinal : fatura;
  const dadosTransacoes = periodoMudou ? transacoesFinal : transacoes;
  const dadosPorCategoria = periodoMudou ? porCategoriaFinal : porCategoria;

  const { pendentes, isLoading: pendentesLoading } = useFaturasPendentes(id);
  const pendentesOutrosMeses = pendentes.filter(
    (p) => !(p.mes === mesFinal + 1 && p.ano === anoFinal),
  );

  const faturaAtiva = useMemo(
    () =>
      cartao?.diaFechamento ? calcularFaturaAtiva(cartao.diaFechamento) : null,
    [cartao?.diaFechamento],
  );
  const isExibindoFaturaAtiva =
    faturaAtiva && mesFinal === faturaAtiva.mes && anoFinal === faturaAtiva.ano;

  // ── Adiantamentos ─────────────────────────────────────────────────────────
  const { data: adiantamentos = [] } = useAdiantamentos(
    id,
    mesFinal + 1,
    anoFinal,
  );

  const totalAdiantado = adiantamentos.reduce(
    (acc, a) => acc + Number(a.valor),
    0,
  );
  const saldoRestanteFatura = Math.max(
    0,
    Number(dadosFatura?.total ?? 0) - totalAdiantado,
  );

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handlePagarFatura = async (dados: {
    contaId: string;
    dataPagamento?: string;
  }) => {
    await pagarFaturaMutation.mutateAsync({
      cartaoId: Number(id),
      ano: anoFinal,
      mes: mesFinal + 1,
      contaId: dados.contaId,
      dataPagamento: dados.dataPagamento,
    });
    setModalPagar(false);
  };

  const handleAdiantamento = async (dados: {
    contaId: string;
    valor: number;
    descricao?: string;
  }) => {
    await registrarAdiantamento.mutateAsync({
      cartaoId: id,
      mes: mesFinal + 1,
      ano: anoFinal,
      contaId: dados.contaId,
      valor: dados.valor,
      descricao: dados.descricao,
    });
    setModalAdiantamento(false);
  };

  const handleCancelarAdiantamento = async (adiantamentoId: string) => {
    await cancelarAdiantamentoMut.mutateAsync({
      cartaoId: id,
      adiantamentoId,
      mes: mesFinal + 1,
      ano: anoFinal,
    });
  };

  // ── Cancelar pagamento de fatura ──────────────────────────────────────────
  const handleCancelarPagamento = async () => {
    if (!dadosFatura?.id) return;
    const res = await fetch(
      `/api/cartoes/${id}/fatura?mes=${mesFinal + 1}&ano=${anoFinal}`,
      { method: "DELETE" },
    );
    if (!res.ok) {
      const err = await res
        .json()
        .catch(() => ({ error: "Erro ao cancelar pagamento" }));
      throw new Error(err.error);
    }
    setModalCancelarPgto(false);
    // Invalida cache via React Query
    pagarFaturaMutation.reset();
    window.location.reload();
  };

  const formatarMoeda = (valor: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(valor);
  const fmt = (valor: number) => mask(formatarMoeda(valor));

  if (!id) {
    return (
      <div className="max-w-3xl mx-auto p-4 md:p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Parametros invalidos.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const loading = faturaLoading || faturaFinalLoading || contasLoading;

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-32 bg-gray-200 dark:bg-gray-800 rounded animate-pulse"
          />
        ))}
      </div>
    );
  }

  const totalFatura = Number(dadosFatura?.total ?? 0);
  const faturaVazia = dadosTransacoes.length === 0;
  const categorias = Object.entries(dadosPorCategoria || {});
  const categoriaComMaiorGasto =
    categorias.length > 0
      ? categorias.reduce((max, cat) => (cat[1] > max[1] ? cat : max))
      : null;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
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
              Fatura {meses[mesFinal]} {anoFinal}
            </h1>
            {cartao?.diaFechamento && (
              <Badge
                className={
                  "text-xs flex items-center gap-1 " +
                  (isExibindoFaturaAtiva && !dadosFatura?.paga
                    ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 border border-green-200 dark:border-green-800"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700")
                }
              >
                {isExibindoFaturaAtiva && !dadosFatura?.paga ? (
                  <>
                    <Unlock size={11} /> Fatura Aberta
                  </>
                ) : (
                  <>
                    <Lock size={11} /> Fatura Fechada
                  </>
                )}
              </Badge>
            )}
          </div>
          <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {cartao?.diaFechamento
              ? "Fechamento dia " +
                cartao.diaFechamento +
                " • Vencimento dia " +
                (cartao.diaVencimento ?? "—")
              : "Visualize e gerencie sua fatura"}
          </p>
        </div>
      </div>

      {/* Alertas */}
      {(pendentesOutrosMeses.length > 0 || pendentesLoading) && (
        <AlertaFaturasPendentes
          cartaoId={id}
          pendentes={pendentesOutrosMeses}
          isLoading={pendentesLoading}
          onVerFatura={(mes, ano) => {
            setUsuarioNavegou(true);
            setMesSelecionado(mes);
            setAnoSelecionado(ano);
          }}
        />
      )}

      {automatico && cartao?.diaFechamento && (
        <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-900 py-2.5">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <AlertDescription className="text-xs text-blue-800 dark:text-blue-300">
            {diaAtual >= cartao.diaFechamento
              ? "A fatura de " +
                mesesAbreviados[mesAtual] +
                " fechou no dia " +
                cartao.diaFechamento +
                ". Exibindo a fatura aberta de " +
                meses[mesFinal] +
                " " +
                anoFinal +
                "."
              : "Fatura aberta — fecha no dia " +
                cartao.diaFechamento +
                " de " +
                meses[mesFinal] +
                "."}{" "}
            <span className="opacity-70">
              Use o seletor de periodo para ver outros meses.
            </span>
          </AlertDescription>
        </Alert>
      )}

      {/* Card principal — total + ações */}
      <Card
        className={
          dadosFatura?.paga
            ? "border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-900"
            : "border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-900"
        }
      >
        <CardContent className="p-4 md:p-6 space-y-4">
          <Badge
            className={
              (dadosFatura?.paga
                ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                : "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300") +
              " text-xs md:text-sm"
            }
          >
            {dadosFatura?.paga ? (
              <>
                <CheckCircle size={12} className="mr-1" /> Fatura Paga
              </>
            ) : (
              <>
                <AlertCircle size={12} className="mr-1" /> Em Aberto
              </>
            )}
          </Badge>

          <div>
            <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
              Total da Fatura
            </p>
            <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white break-all">
              {dadosFatura ? fmt(totalFatura) : "—"}
            </p>
            {/* Mostra resumo de adiantamentos se houver */}
            {adiantamentos.length > 0 && !dadosFatura?.paga && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                {fmt(totalAdiantado)} adiantado • Saldo restante:{" "}
                {fmt(saldoRestanteFatura)}
              </p>
            )}
          </div>

          {!dadosFatura?.paga && dadosTransacoes.length > 0 && (
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {dadosTransacoes.length}{" "}
              {dadosTransacoes.length === 1 ? "transacao" : "transacoes"} neste
              periodo
            </p>
          )}

          {/* Botões de ação */}
          {!dadosFatura?.paga && dadosTransacoes.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={() => setModalPagar(true)}
                disabled={pagarFaturaMutation.isPending}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {pagarFaturaMutation.isPending ? (
                  <>
                    <Loader2 size={16} className="mr-2 animate-spin" />{" "}
                    Pagando...
                  </>
                ) : (
                  <>
                    <DollarSign size={16} className="mr-2" /> Pagar Fatura
                  </>
                )}
              </Button>

              {/* ✅ NOVO: botão de adiantamento */}
              <Button
                variant="outline"
                onClick={() => setModalAdiantamento(true)}
                disabled={
                  registrarAdiantamento.isPending || saldoRestanteFatura <= 0
                }
                className="flex-1 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/30"
              >
                {registrarAdiantamento.isPending ? (
                  <>
                    <Loader2 size={16} className="mr-2 animate-spin" />{" "}
                    Processando...
                  </>
                ) : (
                  <>
                    <Zap size={16} className="mr-2" /> Adiantar
                  </>
                )}
              </Button>
            </div>
          )}

          {/* ✅ NOVO: botão cancelar pagamento */}
          {dadosFatura?.paga && (
            <Button
              variant="outline"
              onClick={() => setModalCancelarPgto(true)}
              className="w-full border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950/30"
            >
              <RotateCcw size={16} className="mr-2" />
              Cancelar Pagamento
            </Button>
          )}

          {!dadosFatura && !loading && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Nenhuma fatura encontrada para {meses[mesFinal]}/{anoFinal}.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ✅ NOVO: lista de adiantamentos */}
      <AdiantamentosLista
        adiantamentos={adiantamentos}
        cartaoId={id}
        mes={mesFinal + 1}
        ano={anoFinal}
        faturaJaPaga={!!dadosFatura?.paga}
        onCancelar={handleCancelarAdiantamento}
        cancelando={cancelarAdiantamentoMut.isPending}
      />

      {/* Alerta maior gasto */}
      {categoriaComMaiorGasto && !faturaVazia && (
        <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-900">
          <PieChart className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
          <AlertDescription className="text-xs md:text-sm text-blue-800 dark:text-blue-200">
            <strong>Maior gasto:</strong> {categoriaComMaiorGasto[0]} com{" "}
            {fmt(categoriaComMaiorGasto[1])} (
            {((categoriaComMaiorGasto[1] / totalFatura) * 100).toFixed(1)}% do
            total)
          </AlertDescription>
        </Alert>
      )}

      {/* Grid categorias + informações */}
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
                            {fmt(valor)}
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
              Informacoes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {[
              {
                icon: Receipt,
                label: "Transacoes",
                value: dadosTransacoes.length,
              },
              { icon: PieChart, label: "Categorias", value: categorias.length },
              {
                icon: Calendar,
                label: "Periodo",
                value: meses[mesFinal] + "/" + anoFinal,
              },
              ...(cartao?.diaFechamento
                ? [
                    {
                      icon: Lock,
                      label: "Fechamento",
                      value: "Dia " + cartao.diaFechamento,
                    },
                  ]
                : []),
              ...(adiantamentos.length > 0
                ? [
                    {
                      icon: Zap,
                      label: "Adiantamentos",
                      value: adiantamentos.length,
                    },
                  ]
                : []),
            ].map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-900 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <Icon
                    size={14}
                    className="text-gray-600 dark:text-gray-400 flex-shrink-0"
                  />
                  <span className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                    {label}
                  </span>
                </div>
                <span className="font-semibold text-sm text-gray-900 dark:text-white">
                  {value}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Lista de transações */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm md:text-base flex items-center gap-2">
            <Receipt size={16} className="text-blue-600" />
            Transacoes ({dadosTransacoes.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {faturaVazia ? (
            <div className="text-center py-8 md:py-12">
              <Receipt className="mx-auto mb-3 text-gray-300" size={40} />
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                Nenhuma transacao encontrada
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

      {/* Modal pagar fatura */}
      <PagarFaturaModal
        aberto={modalPagar}
        onClose={() => setModalPagar(false)}
        total={totalFatura}
        contas={contas}
        onConfirmar={handlePagarFatura}
        loading={pagarFaturaMutation.isPending}
      />

      {/* ✅ NOVO: modal de adiantamento */}
      <AdiantamentoFaturaModal
        aberto={modalAdiantamento}
        onClose={() => setModalAdiantamento(false)}
        totalFatura={saldoRestanteFatura}
        contas={contas}
        onConfirmar={handleAdiantamento}
        loading={registrarAdiantamento.isPending}
      />

      {/* ✅ NOVO: modal cancelar pagamento */}
      <Dialog open={modalCancelarPgto} onOpenChange={setModalCancelarPgto}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle size={18} />
              Cancelar pagamento
            </DialogTitle>
            <DialogDescription>
              O valor será estornado para a conta utilizada no pagamento e a
              fatura voltará ao status <strong>Em Aberto</strong>.
            </DialogDescription>
          </DialogHeader>
          {dadosFatura && (
            <div className="py-2">
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Fatura:</span>
                  <span className="font-medium">
                    {meses[mesFinal]} {anoFinal}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Valor:</span>
                  <span className="font-semibold">
                    {formatarMoeda(totalFatura)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Pago em:</span>
                  <span>{dadosFatura.dataPagamento ?? "—"}</span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setModalCancelarPgto(false)}
            >
              Voltar
            </Button>
            <Button variant="destructive" onClick={handleCancelarPagamento}>
              <RotateCcw size={14} className="mr-2" />
              Confirmar cancelamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
