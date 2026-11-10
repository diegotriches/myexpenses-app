"use client";

import { useMemo } from "react";
import { useContas } from "@/hooks/useContas";
import { useAplicacoes } from "@/hooks/useAplicacoes";
import { useIrRv, useProventosRv, useRendaVariavel } from "@/hooks/useRendaVariavel";
import { hojeBrt } from "@/utils/aplicacaoSimulacao";
import { resumirRendaFixa } from "@/utils/patrimonioUtils";
import { resumirCarteira } from "@/utils/rendaVariavelUtils";
import { resumirProventos } from "@/utils/proventosUtils";
import { apurarMeses, apurarVendas, CONFIG_IR_PADRAO } from "@/utils/irRendaVariavelUtils";

/**
 * Resumo dos investimentos para a aba do dashboard, com os mesmos cálculos das
 * páginas Contas e Aplicações (nenhuma consulta nova à API).
 */
export function useInvestimentos() {
  const contasQuery = useContas();
  const aplicacoesQuery = useAplicacoes();
  const rvQuery = useRendaVariavel();
  const proventosQuery = useProventosRv();
  const irQuery = useIrRv();
  const hoje = hojeBrt();

  const resumo = useMemo(() => {
    const contas = (contasQuery.data ?? []).filter((c) => c.ativo).reduce((s, c) => s + Number(c.saldoAtual), 0);
    const rendaFixa = resumirRendaFixa(aplicacoesQuery.data ?? [], hoje);
    const operacoes = rvQuery.data?.operacoes ?? [];
    const carteira = resumirCarteira(operacoes, rvQuery.data?.cotacoes ?? []);
    const proventos = resumirProventos(proventosQuery.data ?? [], hoje);

    const pagos = new Set(irQuery.data?.darfsPagos ?? []);
    const darfsAbertos = apurarMeses(apurarVendas(operacoes), irQuery.data?.config ?? CONFIG_IR_PADRAO)
      .filter((m) => m.darf && !pagos.has(m.competencia))
      .map((m) => ({ competencia: m.competencia, valor: m.darf!.valor, vencimento: m.darf!.vencimento }));

    return { contas, rendaFixa, carteira, proventos, darfsAbertos };
  }, [contasQuery.data, aplicacoesQuery.data, rvQuery.data, proventosQuery.data, irQuery.data, hoje]);

  return {
    ...resumo,
    carregando:
      contasQuery.isLoading || aplicacoesQuery.isLoading || rvQuery.isLoading || proventosQuery.isLoading || irQuery.isLoading,
    erro: {
      contas: contasQuery.isError,
      rendaFixa: aplicacoesQuery.isError,
      rendaVariavel: rvQuery.isError,
      proventos: proventosQuery.isError,
      ir: irQuery.isError,
    },
  };
}
