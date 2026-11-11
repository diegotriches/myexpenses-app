"use client";

import { useMemo } from "react";
import { Wallet, Landmark, PiggyBank, LineChart } from "lucide-react";
import { useHideValues } from "@/contexts/HideValuesContext";
import { useContas } from "@/hooks/useContas";
import { useAplicacoes } from "@/hooks/useAplicacoes";
import { useRendaVariavel } from "@/hooks/useRendaVariavel";
import { hojeBrt } from "@/utils/aplicacaoSimulacao";
import { liquidoAtualAplicacao } from "@/utils/patrimonioUtils";
import { resumirCarteira } from "@/utils/rendaVariavelUtils";
import { formatarMoeda } from "@/utils/formatadores";
import { KpiCard, type TomValorKpi } from "@/components/common/KpiCard";

const plural = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`;


export default function PatrimonioCard() {
  const { mask } = useHideValues();
  const contasQuery = useContas();
  const aplicacoesQuery = useAplicacoes();
  const rvQuery = useRendaVariavel();

  const carregando = contasQuery.isLoading || aplicacoesQuery.isLoading || rvQuery.isLoading;
  const erroContas = contasQuery.isError;
  const erroAplicacoes = aplicacoesQuery.isError;
  const erroRv = rvQuery.isError;

  const resumo = useMemo(() => {
    const ativas = (contasQuery.data ?? []).filter((c) => c.ativo);
    const emContas = ativas.reduce((soma, c) => soma + Number(c.saldoAtual), 0);

    const hoje = hojeBrt();
    const investidas = (aplicacoesQuery.data ?? []).filter((a) => !a.resgatada);
    const rendaFixa = investidas.reduce((soma, a) => soma + liquidoAtualAplicacao(a, hoje), 0);
    // Renda variável a valor de mercado (bruto, sem IR sobre o ganho)
    const carteiraRv = resumirCarteira(rvQuery.data?.operacoes ?? [], rvQuery.data?.cotacoes ?? []);
    const rendaVariavel = carteiraRv.valorMercado;

    const total = emContas + rendaFixa + rendaVariavel;
    const parte = (v: number) => (total > 0 ? Math.max(0, (v / total) * 100) : 0);

    return {
      qtdContas: ativas.length,
      qtdAplicacoes: investidas.length,
      qtdAtivosRv: carteiraRv.ativos.length,
      semCotacaoRv: carteiraRv.semCotacao,
      emContas,
      rendaFixa,
      rendaVariavel,
      total,
      pctContas: parte(emContas),
      pctRendaFixa: parte(rendaFixa),
      pctRendaVariavel: parte(rendaVariavel),
    };
  }, [contasQuery.data, aplicacoesQuery.data, rvQuery.data]);

  // Só saldo negativo ganha cor; o restante fica neutro
  const tomSaldo = (v: number): TomValorKpi => (v < 0 ? "negativo" : "neutro");

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
      <KpiCard
        titulo="Patrimônio total"
        valor={mask(formatarMoeda(resumo.total))}
        icone={Wallet}
        tom="azul"
        tomValor={tomSaldo(resumo.total)}
        detalhe={erroAplicacoes || erroRv ? "sem parte dos investimentos (indisponíveis)" : "contas + investimentos"}
        carregando={carregando}
        erro={erroContas}
      />
      <KpiCard
        titulo="Em contas"
        valor={mask(formatarMoeda(resumo.emContas))}
        icone={Landmark}
        tom="cinza"
        tomValor={tomSaldo(resumo.emContas)}
        detalhe={
          resumo.qtdContas === 0
            ? "Nenhuma conta ativa"
            : `${plural(resumo.qtdContas, "conta ativa", "contas ativas")} · ${resumo.pctContas.toFixed(0)}%`
        }
        carregando={carregando}
        erro={erroContas}
      />
      <KpiCard
        titulo="Renda fixa"
        valor={mask(formatarMoeda(resumo.rendaFixa))}
        icone={PiggyBank}
        tom="verde"
        detalhe={
          resumo.qtdAplicacoes === 0
            ? "Nenhuma aplicação ativa"
            : `${plural(resumo.qtdAplicacoes, "aplicação", "aplicações")} · líquido · ${resumo.pctRendaFixa.toFixed(0)}%`
        }
        carregando={carregando}
        erro={erroAplicacoes}
      />
      <KpiCard
        titulo="Renda variável"
        valor={mask(formatarMoeda(resumo.rendaVariavel))}
        icone={LineChart}
        tom="roxo"
        detalhe={
          resumo.qtdAtivosRv === 0
            ? "Nenhum ativo em carteira"
            : `${plural(resumo.qtdAtivosRv, "ativo", "ativos")} · a mercado · ${resumo.pctRendaVariavel.toFixed(0)}%`
        }
        carregando={carregando}
        erro={erroRv}
      />
    </div>
  );
}
