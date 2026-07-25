// src/hooks/useDashboard.ts
"use client";

import { useQuery } from "@tanstack/react-query";
import { dashboardService } from "@/services/dashboardService";
import { usePeriodo } from "@/contexts/PeriodoContext";
import type { FiltrosExtrato, DadosGraficoMeses } from "@/types/dashboard";

export const dashboardKeys = {
  all: ["dashboard"] as const,
  resumo: (mes: number, ano: number) =>
    ["dashboard", "resumo", ano, mes] as const,
  resumoRapido: (mes: number, ano: number) =>
    ["dashboard", "resumo-rapido", ano, mes] as const,
  grafico: (periodo?: string) =>
    ["dashboard", "grafico", periodo || "6"] as const,
  extrato: (filters: FiltrosExtrato) =>
    ["dashboard", "extrato", filters] as const,
  condicoesPagamento: (periodoMeses: number) =>
    ["dashboard", "condicoes", periodoMeses] as const,
  formasPagamento: (periodoMeses: number) =>
    ["dashboard", "formas", periodoMeses] as const,
  faturas: (periodoMeses: number) =>
    ["dashboard", "faturas", periodoMeses] as const,
  recorrentes: (periodoMeses: number) =>
    ["dashboard", "recorrentes", periodoMeses] as const,
  despesasFuturas: (mes: number, ano: number) =>
    ["dashboard", "despesas-futuras", ano, mes] as const,
  valoresPeriodo: (periodoMeses: number) =>
    ["dashboard", "valores-periodo", periodoMeses] as const,
  maioresGastos: (periodoMeses: number, limit: number) =>
    ["dashboard", "maiores-gastos", periodoMeses, limit] as const,
  transacoesRecentes: (limit: number) =>
    ["dashboard", "transacoes-recentes", limit] as const,
  saldoHistorico: (periodo: string) =>
    ["dashboard", "saldo-historico", periodo] as const,
};

export function useDashboard() {
  const { mesSelecionado, anoSelecionado } = usePeriodo();
  return useQuery({
    queryKey: dashboardKeys.resumo(mesSelecionado + 1, anoSelecionado),
    queryFn: () =>
      dashboardService.buscarResumo(mesSelecionado + 1, anoSelecionado),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function useGraficoMeses(periodo?: string) {
  return useQuery<DadosGraficoMeses[], Error>({
    queryKey: dashboardKeys.grafico(periodo),
    queryFn: () => dashboardService.buscarGraficoMeses(periodo || "6"),
    staleTime: 5 * 60 * 1000,
  });
}

export function useExtratoDashboard(filters: FiltrosExtrato) {
  return useQuery({
    queryKey: dashboardKeys.extrato(filters),
    queryFn: () => dashboardService.buscarExtrato(filters),
    enabled: !!(filters.ano && filters.mes),
    staleTime: 3 * 60 * 1000,
  });
}

export function useDashboardResumoRapido() {
  const { mesSelecionado, anoSelecionado } = usePeriodo();
  return useQuery({
    queryKey: dashboardKeys.resumoRapido(mesSelecionado + 1, anoSelecionado),
    queryFn: () =>
      dashboardService.buscarResumoRapido(mesSelecionado + 1, anoSelecionado),
    staleTime: 2 * 60 * 1000,
  });
}

export function useCondicoesPagamento(periodoMeses: 3 | 6 | 12) {
  return useQuery({
    queryKey: dashboardKeys.condicoesPagamento(periodoMeses),
    queryFn: () => dashboardService.buscarCondicoesPagamento(periodoMeses),
    staleTime: 3 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function useFormasPagamento(periodoMeses: 3 | 6 | 12) {
  return useQuery({
    queryKey: dashboardKeys.formasPagamento(periodoMeses),
    queryFn: () => dashboardService.buscarFormasPagamento(periodoMeses),
    staleTime: 3 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function useFaturasResumo(periodoMeses: 3 | 6 | 12) {
  return useQuery({
    queryKey: dashboardKeys.faturas(periodoMeses),
    queryFn: () => dashboardService.buscarFaturasResumo(periodoMeses),
    staleTime: 3 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function useRecorrentes(periodoMeses: 3 | 6 | 12) {
  return useQuery({
    queryKey: dashboardKeys.recorrentes(periodoMeses),
    queryFn: () => dashboardService.buscarRecorrentes(periodoMeses),
    staleTime: 3 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function useDespesasFuturas() {
  const { mesSelecionado, anoSelecionado } = usePeriodo();
  return useQuery({
    queryKey: dashboardKeys.despesasFuturas(mesSelecionado + 1, anoSelecionado),
    queryFn: () =>
      dashboardService.buscarDespesasFuturas(
        mesSelecionado + 1,
        anoSelecionado,
      ),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function useValoresPeriodo(periodoMeses: 3 | 6 | 12) {
  return useQuery({
    queryKey: dashboardKeys.valoresPeriodo(periodoMeses),
    queryFn: () => dashboardService.buscarValoresPeriodo(periodoMeses),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function useMaioresGastos(periodoMeses: 3 | 6 | 12, limit = 5) {
  return useQuery({
    queryKey: dashboardKeys.maioresGastos(periodoMeses, limit),
    queryFn: () => dashboardService.buscarMaioresGastos(periodoMeses, limit),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function useTransacoesRecentes(limit = 5) {
  return useQuery({
    queryKey: dashboardKeys.transacoesRecentes(limit),
    queryFn: () => dashboardService.buscarTransacoesRecentes(limit),
    staleTime: 1 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function useSaldoHistorico(periodo: string) {
  return useQuery({
    queryKey: dashboardKeys.saldoHistorico(periodo),
    queryFn: async () => {
      const res = await fetch(
        `/api/dashboard/saldo-historico?periodo=${periodo}`,
      );
      if (!res.ok) throw new Error("Erro ao buscar histórico de saldo");
      return res.json() as Promise<{ mes: string; saldoTotal: number }[]>;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useFaturasAbertas() {
  return useQuery({
    queryKey: ["dashboard", "faturas-abertas"] as const,
    queryFn: async () => {
      const res = await fetch("/api/dashboard/faturas-abertas");
      if (!res.ok) throw new Error("Erro ao buscar faturas abertas");
      return res.json() as Promise<
        {
          cartaoId: number;
          mes: number;
          ano: number;
          total: number;
          status: string;
          dataVencimento: string;
        }[]
      >;
    },
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}
