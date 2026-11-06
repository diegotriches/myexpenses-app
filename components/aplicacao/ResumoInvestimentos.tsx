"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
  const proj = projetarLotes(lotes, Number(a.percentualIndexador), a.ultimaTaxa, hoje);
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

  const blocos = [
    {
      icon: Banknote,
      titulo: "Valor aplicado",
      valor: mask(formatarMoeda(resumo.aplicado)),
      classe: "text-gray-900 dark:text-white",
      detalhe: "principal ainda investido",
    },
    {
      icon: TrendingUp,
      titulo: "Rendimento (bruto)",
      valor: mask(formatarMoeda(resumo.rendimentoBruto)),
      classe: cor(resumo.rendimentoBruto),
      detalhe:
        resumo.aplicado > 0
          ? `${((resumo.rendimentoBruto / resumo.aplicado) * 100).toFixed(2)}% sobre o aplicado`
          : "—",
    },
    {
      icon: Receipt,
      titulo: "IR estimado",
      valor: mask(formatarMoeda(resumo.imposto)),
      classe: "text-orange-600 dark:text-orange-400",
      detalhe: "se resgatasse tudo hoje",
    },
  ];

  return (
    <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
      <CardContent className="p-5 space-y-4">
        {/* Total */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center flex-shrink-0">
            <PiggyBank size={20} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-0.5">
              Total Investido (líquido)
            </p>
            {isLoading ? (
              <div className="h-9 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            ) : isError ? (
              <p className="text-red-500 text-sm">Erro ao carregar</p>
            ) : resumo.quantidade === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Nenhuma aplicação ativa no momento.
              </p>
            ) : (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-3xl font-bold text-gray-900 dark:text-white">
                  {mask(formatarMoeda(resumo.liquido))}
                </span>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    resumo.rentabilidade >= 0
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  }`}
                >
                  {resumo.rentabilidade >= 0 ? "+" : ""}
                  {resumo.rentabilidade.toFixed(2)}% líquido
                </span>
              </div>
            )}
            {!isLoading && !isError && resumo.quantidade > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {plural(resumo.quantidade, "aplicação ativa", "aplicações ativas")} · estimado, após IR
              </p>
            )}
          </div>
        </div>

        {/* Detalhamento */}
        {!isLoading && !isError && resumo.quantidade > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {blocos.map(({ icon: Icon, titulo, valor, classe, detalhe }) => (
              <div
                key={titulo}
                className="rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 p-3"
              >
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide mb-1">
                  <Icon size={14} />
                  {titulo}
                </div>
                <p className={`text-lg font-semibold ${classe}`}>{valor}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{detalhe}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}