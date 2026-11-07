"use client";

import { useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PiggyBank, Banknote, TrendingUp, Receipt } from "lucide-react";
import { useHideValues } from "@/contexts/HideValuesContext";
import { useAplicacoes } from "@/hooks/useAplicacoes";
import type { Aplicacao } from "@/services/aplicacaoService";
import {
  hojeBrt,
  projetarLotes,
  estimarLiquidoTotal,
  type LoteEstado,
} from "@/utils/aplicacaoSimulacao";

const formatarMoeda = (valor: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);

const plural = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`;

// Padrão compacto dos cards de resumo (mesmo das páginas Dashboard, Cartões e Contas)
const CARD = "!py-0 !gap-0 border-l-4 dark:bg-gray-900 dark:border-gray-800 hover:shadow-lg transition-shadow overflow-hidden";
const HEADER = "flex flex-row items-center justify-between -space-y-1 !px-3 !pt-3 !pb-1 md:!px-4 md:!pt-5 md:!pb-1.5";
const TITLE = "text-[11px] md:text-sm font-medium text-gray-900 dark:text-white leading-none md:leading-normal";
const CONTENT = "!px-3 !pt-0 !pb-3 md:!px-4 md:!pt-0 md:!pb-5";
const VALOR = "text-base md:text-2xl font-bold leading-none md:leading-normal !mb-1";
const SUB = "text-[9px] md:text-xs text-gray-500 dark:text-gray-400 leading-none md:leading-normal mt-0.5 md:mt-1.5 truncate";

// Valores estimados de uma aplicação ativa, como se tudo fosse resgatado hoje
// (rendimento confirmado pelo BCB + projeção dos dias úteis ainda não
// publicados, com IR da tabela regressiva) — mesmo cálculo da aba Aplicações
// e do patrimônio na página Contas.
function estimar(a: Aplicacao, hoje: string) {
  const lotes: LoteEstado[] = (a.aportes ?? []).map((x) => ({
    id: x.id,
    data: x.data,
    aportado: Number(x.valor),
    principal: Number(x.principalRestante),
    valorAtual: Number(x.valorAtual),
  }));
  const proj = projetarLotes(
    lotes, Number(a.percentualIndexador), a.ultimaTaxa, hoje, a.rendeNoDiaAporte
  );
  return estimarLiquidoTotal(proj.lotes, hoje, a.tributacao);
}

export default function ResumoInvestimentos() {
  const { mask } = useHideValues();
  const { data, isLoading, isError } = useAplicacoes();

  const resumo = useMemo(() => {
    const hoje = hojeBrt();
    const ativas = (data ?? []).filter((a) => !a.resgatada);

    let aplicado = 0;
    let bruto = 0;
    let imposto = 0;
    let liquido = 0;
    for (const a of ativas) {
      const e = estimar(a, hoje);
      aplicado += e.principal;
      bruto += e.valorBruto;
      imposto += e.impostoRetido;
      liquido += e.valorLiquido;
    }

    const rendimentoLiquido = liquido - aplicado;
    return {
      quantidade: ativas.length,
      aplicado,
      rendimentoBruto: bruto - aplicado,
      imposto,
      liquido,
      rendimentoLiquido,
      rentabilidade: aplicado > 0 ? (rendimentoLiquido / aplicado) * 100 : 0,
    };
  }, [data]);

  const cor = (v: number) =>
    v >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400";

  const vazio = resumo.quantidade === 0;
  const sinal = resumo.rentabilidade >= 0 ? "+" : "";

  const Carregando = () => (
    <>
      <Skeleton className="h-4 w-20 md:h-6 md:w-32 mb-1.5" />
      <Skeleton className="h-2 w-12 md:h-3 md:w-20" />
    </>
  );
  const Erro = () => <p className="text-xs text-red-500">Erro ao carregar</p>;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
      {/* Total investido (líquido) */}
      <Card className={`${CARD} border-l-emerald-500 dark:border-l-emerald-600`}>
        <CardHeader className={HEADER}>
          <CardTitle className={TITLE}>Total investido</CardTitle>
          <PiggyBank className="h-3 w-3 md:h-4 md:w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
        </CardHeader>
        <CardContent className={CONTENT}>
          {isLoading ? <Carregando /> : isError ? <Erro /> : (
            <>
              <div className={`${VALOR} text-emerald-600 dark:text-emerald-400`}>
                {mask(formatarMoeda(resumo.liquido))}
              </div>
              <p className={SUB}>
                {vazio
                  ? "Nenhuma aplicação ativa"
                  : `${plural(resumo.quantidade, "ativa", "ativas")} · ${sinal}${resumo.rentabilidade.toFixed(2)}% líquido`}
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Valor aplicado */}
      <Card className={`${CARD} border-l-blue-500 dark:border-l-blue-600`}>
        <CardHeader className={HEADER}>
          <CardTitle className={TITLE}>Valor aplicado</CardTitle>
          <Banknote className="h-3 w-3 md:h-4 md:w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
        </CardHeader>
        <CardContent className={CONTENT}>
          {isLoading ? <Carregando /> : isError ? <Erro /> : (
            <>
              <div className={`${VALOR} text-gray-900 dark:text-white`}>
                {mask(formatarMoeda(resumo.aplicado))}
              </div>
              <p className={SUB}>principal ainda investido</p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Rendimento (bruto) */}
      <Card className={`${CARD} ${resumo.rendimentoBruto >= 0 ? "border-l-green-500 dark:border-l-green-600" : "border-l-red-500 dark:border-l-red-600"}`}>
        <CardHeader className={HEADER}>
          <CardTitle className={TITLE}>Rendimento (bruto)</CardTitle>
          <TrendingUp className={`h-3 w-3 md:h-4 md:w-4 flex-shrink-0 ${cor(resumo.rendimentoBruto)}`} />
        </CardHeader>
        <CardContent className={CONTENT}>
          {isLoading ? <Carregando /> : isError ? <Erro /> : (
            <>
              <div className={`${VALOR} ${cor(resumo.rendimentoBruto)}`}>
                {mask(formatarMoeda(resumo.rendimentoBruto))}
              </div>
              <p className={SUB}>
                {resumo.aplicado > 0
                  ? `${((resumo.rendimentoBruto / resumo.aplicado) * 100).toFixed(2)}% sobre o aplicado`
                  : "—"}
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* IR estimado */}
      <Card className={`${CARD} border-l-orange-500 dark:border-l-orange-600`}>
        <CardHeader className={HEADER}>
          <CardTitle className={TITLE}>IR estimado</CardTitle>
          <Receipt className="h-3 w-3 md:h-4 md:w-4 text-orange-600 dark:text-orange-400 flex-shrink-0" />
        </CardHeader>
        <CardContent className={CONTENT}>
          {isLoading ? <Carregando /> : isError ? <Erro /> : (
            <>
              <div className={`${VALOR} text-orange-600 dark:text-orange-400`}>
                {mask(formatarMoeda(resumo.imposto))}
              </div>
              <p className={SUB}>se resgatasse tudo hoje</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}