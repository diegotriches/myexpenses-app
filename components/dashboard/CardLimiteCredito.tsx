"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCartoes } from "@/hooks/useCartoes";
import { useFaturasAbertas } from "@/hooks/useDashboard";
import { CreditCard, ChevronLeft, ChevronRight, Receipt, ArrowRight, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const formatarMoeda = (valor: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);

function corUtilizacao(percentual: number) {
  if (percentual >= 80) return {
    barra: "bg-red-500",
    texto: "text-red-600 dark:text-red-400",
    badge: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
  };
  if (percentual >= 50) return {
    barra: "bg-yellow-500",
    texto: "text-yellow-600 dark:text-yellow-400",
    badge: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400",
  };
  return {
    barra: "bg-green-500",
    texto: "text-green-600 dark:text-green-400",
    badge: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400",
  };
}

export function CardLimiteCredito() {
  const router  = useRouter();
  const { data: cartoes = [], isLoading: loadingCartoes } = useCartoes();
  const { data: faturasAbertas = [], isLoading: loadingFaturas } = useFaturasAbertas();
  const [indice, setIndice] = useState(0);

  const isLoading = loadingCartoes || loadingFaturas;

  const cartoesCredito = useMemo(
    () => cartoes.filter((c) => c.tipo === "credito" && c.ativo),
    [cartoes]
  );

  const consolidado = useMemo(() => {
    const limiteTotal      = cartoesCredito.reduce((acc, c) => acc + Number(c.limite), 0);
    const limiteDisponivel = cartoesCredito.reduce((acc, c) => acc + Number(c.limiteDisponivel), 0);
    const limiteUsado      = Math.max(0, limiteTotal - limiteDisponivel);
    const percentual       = limiteTotal > 0 ? (limiteUsado / limiteTotal) * 100 : 0;
    const faturaTotal      = faturasAbertas.reduce((acc, f) => acc + f.total, 0);
    return { limiteTotal, limiteDisponivel: Math.max(0, limiteDisponivel), limiteUsado, percentual, faturaTotal };
  }, [cartoesCredito, faturasAbertas]);

  const cartaoAtual = cartoesCredito[indice] ?? null;

  const cartaoInfo = useMemo(() => {
    if (!cartaoAtual) return null;
    const limite       = Number(cartaoAtual.limite);
    const disponivel   = Number(cartaoAtual.limiteDisponivel);
    const usado        = Math.max(0, limite - disponivel);
    const percentual   = limite > 0 ? (usado / limite) * 100 : 0;
    const faturaAberta = faturasAbertas.find((f) => f.cartaoId === cartaoAtual.id) ?? null;
    return { limite, disponivel: Math.max(0, disponivel), usado, percentual, faturaAberta };
  }, [cartaoAtual, faturasAbertas]);

  const temVariosCartoes = cartoesCredito.length > 1;
  const anterior = () => setIndice((i) => (i - 1 + cartoesCredito.length) % cartoesCredito.length);
  const proximo  = () => setIndice((i) => (i + 1) % cartoesCredito.length);

  const handleVerFatura = () => {
    if (!cartaoAtual || !cartaoInfo?.faturaAberta) return;
    const { mes, ano } = cartaoInfo.faturaAberta;
    router.push("/cartoes/" + cartaoAtual.id + "/fatura?mes=" + mes + "&ano=" + ano);
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-4 rounded" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-6 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-2 w-full rounded-full" />
          <Skeleton className="h-4 w-24" />
        </CardContent>
      </Card>
    );
  }

  // ── Sem cartoes ───────────────────────────────────────────────────────────
  if (cartoesCredito.length === 0) {
    return (
      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-900 dark:text-white">
            <CreditCard className="h-4 w-4 text-blue-500" />
            Limite de Credito
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
            Nenhum cartao de credito cadastrado
          </p>
        </CardContent>
      </Card>
    );
  }

  const percentualExibido = cartaoInfo?.percentual   ?? consolidado.percentual;
  const usadoExibido      = cartaoInfo?.usado        ?? consolidado.limiteUsado;
  const disponivelExibido = cartaoInfo?.disponivel   ?? consolidado.limiteDisponivel;
  const limiteExibido     = cartaoInfo?.limite       ?? consolidado.limiteTotal;
  const faturaExibida     = cartaoInfo?.faturaAberta ?? null;

  // Fatura consolidada (varios cartoes sem fatura individual exibida)
  const faturaTotal = faturaExibida?.total
    ?? (temVariosCartoes ? consolidado.faturaTotal : null);
  const temFatura   = faturaTotal !== null && faturaTotal > 0;
  const temBotaoVerFatura = !!faturaExibida && !!cartaoAtual;

  const { barra, texto, badge } = corUtilizacao(percentualExibido);
  const atrasada = faturaExibida?.status === "ATRASADA";

  return (
    <Card className="dark:bg-gray-900 dark:border-gray-800">

      {/* ── Header ── */}
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-900 dark:text-white">
          <CreditCard className="h-4 w-4 text-blue-500" />
          Limite de Credito
        </CardTitle>

        {temVariosCartoes && (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={anterior}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs text-gray-500 dark:text-gray-400 min-w-[28px] text-center">
              {indice + 1}/{cartoesCredito.length}
            </span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={proximo}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-3">

        {/* ── Nome do cartao (varios cartoes) ── */}
        {temVariosCartoes && cartaoAtual && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
              {cartaoAtual.nome}
            </span>
            {cartaoAtual.bandeira && (
              <span className="text-xs text-gray-400 dark:text-gray-500">{cartaoAtual.bandeira}</span>
            )}
          </div>
        )}

        {/* ── Bloco de fatura em destaque ── */}
        {temFatura && (
          <div className={"rounded-lg p-3 " + (atrasada
            ? "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900"
            : "bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900"
          )}>
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <Receipt className={"h-3.5 w-3.5 " + (atrasada ? "text-red-500" : "text-orange-500")} />
                  <span className={"text-xs font-medium " + (atrasada
                    ? "text-red-600 dark:text-red-400"
                    : "text-orange-600 dark:text-orange-400"
                  )}>
                    Fatura em aberto
                  </span>
                  {atrasada && (
                    <Badge className="text-[10px] px-1.5 py-0 h-4 font-medium border-0 bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-300">
                      <AlertCircle className="h-2.5 w-2.5 mr-0.5" />
                      Atrasada
                    </Badge>
                  )}
                </div>
                <p className={"text-lg font-bold " + (atrasada
                  ? "text-red-700 dark:text-red-300"
                  : "text-orange-700 dark:text-orange-300"
                )}>
                  {formatarMoeda(faturaTotal!)}
                </p>
              </div>

              {/* Botao Ver fatura — so aparece quando ha fatura do cartao atual */}
              {temBotaoVerFatura && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleVerFatura}
                  className={"h-8 text-xs gap-1 flex-shrink-0 " + (atrasada
                    ? "border-red-300 text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/30"
                    : "border-orange-300 text-orange-700 hover:bg-orange-100 dark:border-orange-700 dark:text-orange-400 dark:hover:bg-orange-900/30"
                  )}
                >
                  Ver fatura
                  <ArrowRight className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* ── Limite utilizado / disponivel / total (compacto) ── */}
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-0.5">
            <p className="text-xs text-gray-500 dark:text-gray-400">Utilizado</p>
            <p className={"text-sm font-bold " + texto}>
              {formatarMoeda(usadoExibido)}
            </p>
          </div>
          <div className="space-y-0.5">
            <p className="text-xs text-gray-500 dark:text-gray-400">Disponivel</p>
            <p className="text-sm font-bold text-blue-600 dark:text-blue-400">
              {formatarMoeda(disponivelExibido)}
            </p>
          </div>
          <div className="space-y-0.5">
            <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
            <p className="text-sm font-bold text-gray-700 dark:text-gray-300">
              {formatarMoeda(limiteExibido)}
            </p>
          </div>
        </div>

        {/* ── Barra de progresso ── */}
        <div className="space-y-1">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
            <div
              className={"h-1.5 rounded-full transition-all duration-500 " + barra}
              style={{ width: Math.min(percentualExibido, 100) + "%" }}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {percentualExibido.toFixed(1)}% utilizado
            </span>
            <Badge className={"text-xs px-2 py-0 h-5 font-medium border-0 " + badge}>
              {percentualExibido >= 80 ? "Alto uso" : percentualExibido >= 50 ? "Uso moderado" : "Uso baixo"}
            </Badge>
          </div>
        </div>

        {/* ── Indicadores de cartao ── */}
        {temVariosCartoes && (
          <div className="flex justify-center gap-1.5 pt-0.5">
            {cartoesCredito.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndice(i)}
                className={"h-1.5 rounded-full transition-all " + (i === indice
                  ? "bg-blue-500 w-3"
                  : "w-1.5 bg-gray-300 dark:bg-gray-600"
                )}
              />
            ))}
          </div>
        )}

      </CardContent>
    </Card>
  );
}