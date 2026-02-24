// src/components/dashboard/CardLimiteCredito.tsx
"use client";

import { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCartoes } from "@/hooks/useCartoes";
import { CreditCard, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const formatarMoeda = (valor: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);

function corUtilizacao(percentual: number) {
  if (percentual >= 80) return {
    barra:  "bg-red-500",
    texto:  "text-red-600 dark:text-red-400",
    badge:  "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
  };
  if (percentual >= 50) return {
    barra:  "bg-yellow-500",
    texto:  "text-yellow-600 dark:text-yellow-400",
    badge:  "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400",
  };
  return {
    barra:  "bg-green-500",
    texto:  "text-green-600 dark:text-green-400",
    badge:  "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400",
  };
}

export function CardLimiteCredito() {
  const { data: cartoes = [], isLoading } = useCartoes();
  const [indice, setIndice] = useState(0);

  // Apenas cartões de crédito ativos
  const cartoesCredito = useMemo(
    () => cartoes.filter((c) => c.tipo === "credito" && c.ativo),
    [cartoes]
  );

  // Totais consolidados (visão geral)
  const consolidado = useMemo(() => {
    const limiteTotal     = cartoesCredito.reduce((acc, c) => acc + Number(c.limite), 0);
    const limiteDisponivel = cartoesCredito.reduce((acc, c) => acc + Number(c.limiteDisponivel), 0);
    const limiteUsado     = Math.max(0, limiteTotal - limiteDisponivel);
    const percentual      = limiteTotal > 0 ? (limiteUsado / limiteTotal) * 100 : 0;
    return { limiteTotal, limiteDisponivel: Math.max(0, limiteDisponivel), limiteUsado, percentual };
  }, [cartoesCredito]);

  const cartaoAtual = cartoesCredito[indice] ?? null;
  const cartaoInfo = useMemo(() => {
    if (!cartaoAtual) return null;
    const limite      = Number(cartaoAtual.limite);
    const disponivel  = Number(cartaoAtual.limiteDisponivel);
    const usado       = Math.max(0, limite - disponivel);
    const percentual  = limite > 0 ? (usado / limite) * 100 : 0;
    return { limite, disponivel: Math.max(0, disponivel), usado, percentual };
  }, [cartaoAtual]);

  const temVariosCartoes = cartoesCredito.length > 1;

  const anterior = () => setIndice((i) => (i - 1 + cartoesCredito.length) % cartoesCredito.length);
  const proximo  = () => setIndice((i) => (i + 1) % cartoesCredito.length);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-4 rounded" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-2 w-full rounded-full" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
        </CardContent>
      </Card>
    );
  }

  // ── Sem cartões ───────────────────────────────────────────────────────────
  if (cartoesCredito.length === 0) {
    return (
      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-900 dark:text-white">
            <CreditCard className="h-4 w-4 text-blue-500" />
            Limite de Crédito
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
            Nenhum cartão de crédito cadastrado
          </p>
        </CardContent>
      </Card>
    );
  }

  // ── Dados do cartão atual ─────────────────────────────────────────────────
  const { barra, texto, badge } = corUtilizacao(
    temVariosCartoes && cartaoInfo ? cartaoInfo.percentual : consolidado.percentual
  );

  const percentualExibido = cartaoInfo ? cartaoInfo.percentual : consolidado.percentual;
  const usadoExibido      = cartaoInfo ? cartaoInfo.usado      : consolidado.limiteUsado;
  const disponivelExibido = cartaoInfo ? cartaoInfo.disponivel : consolidado.limiteDisponivel;
  const limiteExibido     = cartaoInfo ? cartaoInfo.limite     : consolidado.limiteTotal;

  return (
    <Card className="dark:bg-gray-900 dark:border-gray-800">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-900 dark:text-white">
          <CreditCard className="h-4 w-4 text-blue-500" />
          {temVariosCartoes ? "Limite de Crédito" : "Limite de Crédito"}
        </CardTitle>

        {/* Navegação entre cartões */}
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

      <CardContent className="space-y-4">

        {/* Nome do cartão (quando há mais de um) */}
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

        {/* Valores em destaque: Usado e Disponível */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-0.5">
            <p className="text-xs text-gray-500 dark:text-gray-400">Utilizado</p>
            <p className={`text-xl font-bold ${texto}`}>
              {formatarMoeda(usadoExibido)}
            </p>
          </div>
          <div className="space-y-0.5">
            <p className="text-xs text-gray-500 dark:text-gray-400">Disponível</p>
            <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
              {formatarMoeda(disponivelExibido)}
            </p>
          </div>
        </div>

        {/* Barra de progresso */}
        <div className="space-y-1.5">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${barra}`}
              style={{ width: `${Math.min(percentualExibido, 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {percentualExibido.toFixed(1)}% utilizado
            </span>
            <Badge className={`text-xs px-2 py-0 h-5 font-medium border-0 ${badge}`}>
              {percentualExibido >= 80 ? "Alto uso" : percentualExibido >= 50 ? "Uso moderado" : "Uso baixo"}
            </Badge>
          </div>
        </div>

        {/* Limite total — informação secundária e discreta */}
        <div className="pt-1 border-t border-gray-100 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-400 dark:text-gray-500">Limite total</span>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {formatarMoeda(limiteExibido)}
            </span>
          </div>
        </div>

        {/* Dots de navegação (quando há mais de um cartão) */}
        {temVariosCartoes && (
          <div className="flex justify-center gap-1.5 pt-1">
            {cartoesCredito.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndice(i)}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  i === indice
                    ? "bg-blue-500 w-3"
                    : "bg-gray-300 dark:bg-gray-600"
                }`}
              />
            ))}
          </div>
        )}

      </CardContent>
    </Card>
  );
}