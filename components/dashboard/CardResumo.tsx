"use client";

import { TrendingUp, TrendingDown, Wallet, CalendarClock } from 'lucide-react';
import type { DashboardResumo } from '@/types/dashboard';
import { useMoeda } from "@/hooks/useMoeda";
import { taxaDePoupanca } from "@/utils/gastosUtils";
import { KpiCard } from "@/components/common/KpiCard";

interface Props {
  resumo: DashboardResumo;
  saldoContas?: number;
  quantidadeContas?: number;
  despesasFuturas?: {
    total: number;
    quantidade: number;
  };
}

const plural = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`;

export function CardResumo({ resumo, despesasFuturas }: Props) {
  const fmt = useMoeda();
  // Quanto da receita do mês sobrou (null quando não houve receita)
  const taxa = taxaDePoupanca(resumo.receitas, resumo.despesas);
  const qtdFuturas = despesasFuturas?.quantidade || 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
      <KpiCard
        titulo="Receitas"
        valor={fmt(resumo.receitas)}
        icone={TrendingUp}
        tom="verde"
        detalhe={plural(resumo.quantidadeReceitas || 0, "lançamento", "lançamentos")}
      />
      <KpiCard
        titulo="Despesas"
        valor={fmt(resumo.despesas)}
        icone={TrendingDown}
        tom="vermelho"
        detalhe={plural(resumo.quantidadeDespesas || 0, "lançamento", "lançamentos")}
      />
      <KpiCard
        titulo="Saldo do mês"
        valor={fmt(resumo.saldo)}
        icone={Wallet}
        tom="azul"
        tomValor={resumo.saldo >= 0 ? "positivo" : "negativo"}
        detalhe={
          taxa === null
            ? (resumo.saldo >= 0 ? "Positivo" : "Negativo")
            : taxa >= 0
              ? `Poupou ${taxa}% da receita`
              : `Gastou ${-taxa}% além da receita`
        }
      />
      <KpiCard
        titulo="Despesas futuras"
        valor={fmt(despesasFuturas?.total || 0)}
        icone={CalendarClock}
        tom="laranja"
        detalhe={`${plural(qtdFuturas, "despesa", "despesas")} ${qtdFuturas === 1 ? "pendente" : "pendentes"}`}
      />
    </div>
  );
}
