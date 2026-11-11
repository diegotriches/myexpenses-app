"use client";

import { useMemo } from "react";
import { LineChart, Banknote, TrendingUp, TrendingDown, Coins } from "lucide-react";
import { useHideValues } from "@/contexts/HideValuesContext";
import { useRendaVariavel } from "@/hooks/useRendaVariavel";
import { resumirCarteira } from "@/utils/rendaVariavelUtils";
import { formatarMoeda } from "@/utils/formatadores";
import { KpiCard, type TomValorKpi } from "@/components/common/KpiCard";

const plural = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`;

export default function ResumoRendaVariavel() {
  const { mask } = useHideValues();
  const { data, isLoading, isError } = useRendaVariavel();

  const r = useMemo(
    () => resumirCarteira(data?.operacoes ?? [], data?.cotacoes ?? []),
    [data],
  );

  const vazio = r.ativos.length === 0;
  const sinal = r.resultadoNaoRealizadoPct >= 0 ? "+" : "";
  const NaoRealizadoIcon = r.resultadoNaoRealizado >= 0 ? TrendingUp : TrendingDown;
  const tomResultado = (v: number): TomValorKpi => (v >= 0 ? "positivo" : "negativo");

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
      <KpiCard
        titulo="Valor de mercado"
        valor={mask(formatarMoeda(r.valorMercado))}
        icone={LineChart}
        tom="roxo"
        detalhe={
          vazio
            ? "Nenhum ativo em carteira"
            : r.semCotacao > 0
              ? plural(r.semCotacao, "ativo sem cotação", "ativos sem cotação")
              : plural(r.ativos.length, "ativo", "ativos")
        }
        carregando={isLoading}
        erro={isError}
      />
      <KpiCard
        titulo="Total investido"
        valor={mask(formatarMoeda(r.custoTotal))}
        icone={Banknote}
        tom="azul"
        detalhe="custo das posições abertas"
        carregando={isLoading}
        erro={isError}
      />
      <KpiCard
        titulo="Resultado (não realizado)"
        valor={mask(formatarMoeda(r.resultadoNaoRealizado))}
        icone={NaoRealizadoIcon}
        tom={r.resultadoNaoRealizado >= 0 ? "verde" : "vermelho"}
        tomValor={tomResultado(r.resultadoNaoRealizado)}
        detalhe={r.custoTotal > 0 ? `${sinal}${r.resultadoNaoRealizadoPct.toFixed(2)}% sobre o investido` : "—"}
        carregando={isLoading}
        erro={isError}
      />
      <KpiCard
        titulo="Resultado (realizado)"
        valor={mask(formatarMoeda(r.resultadoRealizado))}
        icone={Coins}
        tom="laranja"
        tomValor={tomResultado(r.resultadoRealizado)}
        detalhe="nas vendas, antes do IR"
        carregando={isLoading}
        erro={isError}
      />
    </div>
  );
}
