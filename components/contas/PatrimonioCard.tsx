"use client";

import { useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Wallet, Landmark, PiggyBank, LineChart } from "lucide-react";
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
  const proj = projetarLotes(
    lotes, Number(a.percentualIndexador), a.ultimaTaxa, hoje, a.rendeNoDiaAporte
  );
  return estimarLiquidoTotal(proj.lotes, hoje, a.tributacao).valorLiquido;
}

// Padrão compacto dos cards de resumo (mesmo das páginas Dashboard e Cartões)
const CARD = "!py-0 !gap-0 border-l-4 dark:bg-gray-900 dark:border-gray-800 hover:shadow-lg transition-shadow overflow-hidden";
const HEADER = "flex flex-row items-center justify-between -space-y-1 !px-3 !pt-3 !pb-1 md:!px-4 md:!pt-5 md:!pb-1.5";
const TITLE = "text-[11px] md:text-sm font-medium text-gray-900 dark:text-white leading-none md:leading-normal";
const CONTENT = "!px-3 !pt-0 !pb-3 md:!px-4 md:!pt-0 md:!pb-5";
const VALOR = "text-base md:text-2xl font-bold leading-none md:leading-normal !mb-1";
const SUB = "text-[9px] md:text-xs text-gray-500 dark:text-gray-400 leading-none md:leading-normal mt-0.5 md:mt-1.5 truncate";

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
    const rendaFixa = investidas.reduce((soma, a) => soma + liquidoEstimado(a, hoje), 0);
    // Renda variável ainda não implementada
    const rendaVariavel = 0;

    const total = emContas + rendaFixa + rendaVariavel;
    const parte = (v: number) => (total > 0 ? Math.max(0, (v / total) * 100) : 0);

    return {
      qtdContas: ativas.length,
      qtdAplicacoes: investidas.length,
      emContas,
      rendaFixa,
      rendaVariavel,
      total,
      pctContas: parte(emContas),
      pctRendaFixa: parte(rendaFixa),
    };
  }, [contasQuery.data, aplicacoesQuery.data]);

  const corSaldo = (v: number) =>
    v >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400";

  const Carregando = () => (
    <>
      <Skeleton className="h-4 w-20 md:h-6 md:w-32 mb-1.5" />
      <Skeleton className="h-2 w-12 md:h-3 md:w-20" />
    </>
  );
  const Erro = () => <p className="text-xs text-red-500">Erro ao carregar</p>;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
      {/* Patrimônio total */}
      <Card className={`${CARD} border-l-blue-500 dark:border-l-blue-600`}>
        <CardHeader className={HEADER}>
          <CardTitle className={TITLE}>Patrimônio total</CardTitle>
          <Wallet className="h-3 w-3 md:h-4 md:w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
        </CardHeader>
        <CardContent className={CONTENT}>
          {carregando ? <Carregando /> : erroContas ? <Erro /> : (
            <>
              <div className={`${VALOR} ${corSaldo(resumo.total)}`}>
                {mask(formatarMoeda(resumo.total))}
              </div>
              <p className={SUB}>
                {erroAplicacoes ? "sem investimentos (indisponíveis)" : "contas + investimentos"}
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Em contas */}
      <Card className={`${CARD} ${resumo.emContas >= 0 ? "border-l-green-500 dark:border-l-green-600" : "border-l-red-500 dark:border-l-red-600"}`}>
        <CardHeader className={HEADER}>
          <CardTitle className={TITLE}>Em contas</CardTitle>
          <Landmark className={`h-3 w-3 md:h-4 md:w-4 flex-shrink-0 ${corSaldo(resumo.emContas)}`} />
        </CardHeader>
        <CardContent className={CONTENT}>
          {carregando ? <Carregando /> : erroContas ? <Erro /> : (
            <>
              <div className={`${VALOR} ${corSaldo(resumo.emContas)}`}>
                {mask(formatarMoeda(resumo.emContas))}
              </div>
              <p className={SUB}>
                {resumo.qtdContas === 0
                  ? "Nenhuma conta ativa"
                  : `${plural(resumo.qtdContas, "conta ativa", "contas ativas")} · ${resumo.pctContas.toFixed(0)}%`}
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Renda fixa */}
      <Card className={`${CARD} border-l-emerald-500 dark:border-l-emerald-600`}>
        <CardHeader className={HEADER}>
          <CardTitle className={TITLE}>Renda fixa</CardTitle>
          <PiggyBank className="h-3 w-3 md:h-4 md:w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
        </CardHeader>
        <CardContent className={CONTENT}>
          {carregando ? <Carregando /> : erroAplicacoes ? (
            <p className="text-xs text-red-500">Indisponível</p>
          ) : (
            <>
              <div className={`${VALOR} text-emerald-600 dark:text-emerald-400`}>
                {mask(formatarMoeda(resumo.rendaFixa))}
              </div>
              <p className={SUB}>
                {resumo.qtdAplicacoes === 0
                  ? "Nenhuma aplicação ativa"
                  : `${plural(resumo.qtdAplicacoes, "aplicação", "aplicações")} · líquido · ${resumo.pctRendaFixa.toFixed(0)}%`}
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Renda variável (em desenvolvimento) */}
      <Card className={`${CARD} border-l-purple-400 dark:border-l-purple-600`}>
        <CardHeader className={HEADER}>
          <CardTitle className={TITLE}>Renda variável</CardTitle>
          <LineChart className="h-3 w-3 md:h-4 md:w-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
        </CardHeader>
        <CardContent className={CONTENT}>
          <div className={`${VALOR} text-purple-600 dark:text-purple-400`}>
            {mask(formatarMoeda(resumo.rendaVariavel))}
          </div>
          <p className={SUB}>Em breve · ações e FIIs</p>
        </CardContent>
      </Card>
    </div>
  );
}