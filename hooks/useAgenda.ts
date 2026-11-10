"use client";

import { useMemo } from "react";
import { useFaturasAbertas } from "@/hooks/useDashboard";
import { useCartoes } from "@/hooks/useCartoes";
import { useRecorrencias } from "@/hooks/useRecorrencias";
import { useContas } from "@/hooks/useContas";
import type { FaturaAgenda, RecorrenciaAgenda } from "@/utils/agendaUtils";

/**
 * Dados da agenda do dashboard (próximos vencimentos e fim do mês), montados
 * a partir de consultas que já existem: nenhuma query nova.
 */
export function useAgenda() {
  const faturasQuery = useFaturasAbertas();
  const cartoesQuery = useCartoes();
  const recorrenciasQuery = useRecorrencias();
  const contasQuery = useContas();

  const faturas = useMemo<FaturaAgenda[]>(() => {
    const nomes = new Map((cartoesQuery.data ?? []).map((c) => [c.id, c.nome]));
    return (faturasQuery.data ?? []).map((f) => ({
      cartaoId: f.cartaoId,
      nomeCartao: nomes.get(f.cartaoId) ?? "Cartão",
      mes: f.mes,
      ano: f.ano,
      total: f.total,
      dataVencimento: f.dataVencimento,
    }));
  }, [faturasQuery.data, cartoesQuery.data]);

  const recorrencias = useMemo<RecorrenciaAgenda[]>(() => recorrenciasQuery.data ?? [], [recorrenciasQuery.data]);

  const saldoContas = useMemo(
    () => (contasQuery.data ?? []).filter((c) => c.ativo).reduce((s, c) => s + Number(c.saldoAtual), 0),
    [contasQuery.data],
  );

  return {
    faturas,
    recorrencias,
    saldoContas,
    carregando: faturasQuery.isLoading || cartoesQuery.isLoading || recorrenciasQuery.isLoading || contasQuery.isLoading,
    erroRecorrencias: recorrenciasQuery.isError,
    erroContas: contasQuery.isError,
  };
}
