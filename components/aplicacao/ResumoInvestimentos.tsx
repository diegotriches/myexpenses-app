"use client";

import { useMemo } from "react";
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
import { formatarMoeda } from "@/utils/formatadores";
import { KpiCard } from "@/components/common/KpiCard";

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

  const vazio = resumo.quantidade === 0;
  const sinal = resumo.rentabilidade >= 0 ? "+" : "";

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
      <KpiCard
        titulo="Total investido"
        valor={mask(formatarMoeda(resumo.liquido))}
        icone={PiggyBank}
        tom="verde"
        detalhe={vazio ? "Nenhuma aplicação ativa" : `${plural(resumo.quantidade, "ativa", "ativas")} · ${sinal}${resumo.rentabilidade.toFixed(2)}% líquido`}
        carregando={isLoading}
        erro={isError}
      />
      <KpiCard
        titulo="Valor aplicado"
        valor={mask(formatarMoeda(resumo.aplicado))}
        icone={Banknote}
        tom="azul"
        detalhe="principal ainda investido"
        carregando={isLoading}
        erro={isError}
      />
      <KpiCard
        titulo="Rendimento (bruto)"
        valor={mask(formatarMoeda(resumo.rendimentoBruto))}
        icone={TrendingUp}
        tom="verde"
        tomValor={resumo.rendimentoBruto >= 0 ? "positivo" : "negativo"}
        detalhe={resumo.aplicado > 0 ? `${((resumo.rendimentoBruto / resumo.aplicado) * 100).toFixed(2)}% sobre o aplicado` : "—"}
        carregando={isLoading}
        erro={isError}
      />
      <KpiCard
        titulo="IR estimado"
        valor={mask(formatarMoeda(resumo.imposto))}
        icone={Receipt}
        tom="laranja"
        detalhe="se resgatasse tudo hoje"
        carregando={isLoading}
        erro={isError}
      />
    </div>
  );
}
