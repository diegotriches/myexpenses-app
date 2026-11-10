"use client";

import { useMemo } from "react";
import { useAplicacoes } from "@/hooks/useAplicacoes";
import { useIrRv, useProventosRv, useRendaVariavel } from "@/hooks/useRendaVariavel";
import { hojeBrt } from "@/utils/aplicacaoSimulacao";
import { CONFIG_IR_PADRAO } from "@/utils/irRendaVariavelUtils";
import { resumirInvestimentosDoAno, type ContaNoPeriodo, type InvestimentosAno } from "@/utils/resumoInvestimentosUtils";

/**
 * Investimentos do ano e dados para a declaração (Resumo Anual), a partir das
 * consultas que já existem; o saldo das contas nas datas vem da rota do resumo.
 */
export function useResumoInvestimentos(ano: number, contas: ContaNoPeriodo[] | undefined) {
  const aplicacoesQuery = useAplicacoes();
  const rvQuery = useRendaVariavel();
  const proventosQuery = useProventosRv();
  const irQuery = useIrRv();

  const dados = useMemo<InvestimentosAno | null>(() => {
    if (!contas) return null;
    return resumirInvestimentosDoAno({
      ano,
      hoje: hojeBrt(),
      contas,
      aplicacoes: aplicacoesQuery.data ?? [],
      operacoes: rvQuery.data?.operacoes ?? [],
      cotacoes: rvQuery.data?.cotacoes ?? [],
      proventos: proventosQuery.data ?? [],
      configIr: irQuery.data?.config ?? CONFIG_IR_PADRAO,
      darfsPagos: irQuery.data?.darfsPagos ?? [],
    });
  }, [ano, contas, aplicacoesQuery.data, rvQuery.data, proventosQuery.data, irQuery.data]);

  return {
    dados,
    carregando: aplicacoesQuery.isLoading || rvQuery.isLoading || proventosQuery.isLoading || irQuery.isLoading,
    incompleto: aplicacoesQuery.isError || rvQuery.isError || proventosQuery.isError || irQuery.isError,
  };
}
