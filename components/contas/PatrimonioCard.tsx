"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Wallet, Landmark, TrendingUp } from "lucide-react";
import { useHideValues } from "@/contexts/HideValuesContext";
import { useContas } from "@/hooks/useContas";
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

// Valor LÍQUIDO estimado de uma aplicação ativa: rendimento confirmado pelo
// BCB + projeção dos dias úteis ainda não publicados, já descontado o IR que
// seria retido se tudo fosse resgatado hoje (mesmo cálculo da aba Aplicações).
function liquidoEstimado(a: Aplicacao, hoje: string): number {
  const lotes: LoteEstado[] = (a.aportes ?? []).map((x) => ({
    id: x.id,
    data: x.data,
    aportado: Number(x.valor),
    principal: Number(x.principalRestante),
    valorAtual: Number(x.valorAtual),
  }));
  const proj = projetarLotes(lotes, Number(a.percentualIndexador), a.ultimaTaxa, hoje);
  return estimarLiquidoTotal(proj.lotes, hoje, a.tributacao).valorLiquido;
}

export default function PatrimonioCard() {
  const { mask } = useHideValues();
  const contasQuery = useContas();
  const aplicacoesQuery = useAplicacoes();

  const carregando = contasQuery.isLoading || aplicacoesQuery.isLoading;
  const erroContas = contasQuery.isError;
  const erroAplicacoes = aplicacoesQuery.isError;

  const resumo = useMemo(() => {
    const ativas = (contasQuery.data ?? []).filter((c) => c.ativo);
    const emContas = ativas.reduce((soma, c) => soma + Number(c.saldoAtual), 0);

    const hoje = hojeBrt();
    const investidas = (aplicacoesQuery.data ?? []).filter((a) => !a.resgatada);
    const investido = investidas.reduce((soma, a) => soma + liquidoEstimado(a, hoje), 0);

    return {
      qtdContas: ativas.length,
      qtdAplicacoes: investidas.length,
      emContas,
      investido,
      total: emContas + investido,
    };
  }, [contasQuery.data, aplicacoesQuery.data]);

  const semNada = resumo.qtdContas === 0 && resumo.qtdAplicacoes === 0;
  const cor = (v: number) =>
    v >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400";

  return (
    <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
      <CardContent className="p-5 space-y-4">
        {/* Total geral */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center flex-shrink-0">
            <Wallet size={20} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-0.5">
              Patrimônio Total
            </p>
            {carregando ? (
              <div className="h-9 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            ) : erroContas ? (
              <p className="text-red-500 text-sm">Erro ao carregar</p>
            ) : semNada ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Nenhuma conta ativa ou investimento no momento.
              </p>
            ) : (
              <span className={`text-3xl font-bold ${cor(resumo.total)}`}>
                {mask(formatarMoeda(resumo.total))}
              </span>
            )}
          </div>
        </div>

        {/* Detalhamento: contas x investido */}
        {!carregando && !erroContas && !semNada && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 p-3">
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide mb-1">
                <Landmark size={14} />
                Em contas
              </div>
              <p className={`text-lg font-semibold ${cor(resumo.emContas)}`}>
                {mask(formatarMoeda(resumo.emContas))}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {resumo.qtdContas === 0
                  ? "Nenhuma conta ativa"
                  : plural(resumo.qtdContas, "conta ativa", "contas ativas")}
              </p>
            </div>

            <div className="rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 p-3">
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide mb-1">
                <TrendingUp size={14} />
                Investido (líquido)
              </div>
              {erroAplicacoes ? (
                <p className="text-sm text-red-500">Investimentos indisponíveis</p>
              ) : (
                <>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {mask(formatarMoeda(resumo.investido))}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {resumo.qtdAplicacoes === 0
                      ? "Nenhuma aplicação ativa"
                      : `${plural(resumo.qtdAplicacoes, "aplicação ativa", "aplicações ativas")} · estimado, após IR`}
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}