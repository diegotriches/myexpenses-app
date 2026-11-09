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
  grafico: (ano: number) => ["dashboard", "grafico", ano] as const,
  extrato: (filters: FiltrosExtrato) =>
    ["dashboard", "extrato", filters] as const,
  condicoesPagamento: (ano: number) =>
    ["dashboard", "condicoes", ano] as const,
  formasPagamento: (ano: number) =>
    ["dashboard", "formas", ano] as const,
  recorrentes: (ano: number) =>
    ["dashboard", "recorrentes", ano] as const,
  despesasFuturas: (mes: number, ano: number) =>
    ["dashboard", "despesas-futuras", ano, mes] as const,
  valoresPeriodo: (ano: number) =>
    ["dashboard", "valores-periodo", ano] as const,
  maioresGastos: (ano: number, limit: number) =>
    ["dashboard", "maiores-gastos", ano, limit] as const,
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

export function useGraficoMeses(ano: number) {
  return useQuery<DadosGraficoMeses[], Error>({
    queryKey: dashboardKeys.grafico(ano),
    queryFn: () => dashboardService.buscarGraficoMeses(ano),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCondicoesPagamento(ano: number) {
  return useQuery({
    queryKey: dashboardKeys.condicoesPagamento(ano),
    queryFn: () => dashboardService.buscarCondicoesPagamento(ano),
    staleTime: 3 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function useFormasPagamento(ano: number) {
  return useQuery({
    queryKey: dashboardKeys.formasPagamento(ano),
    queryFn: () => dashboardService.buscarFormasPagamento(ano),
    staleTime: 3 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function useRecorrentes(ano: number) {
  return useQuery({
    queryKey: dashboardKeys.recorrentes(ano),
    queryFn: () => dashboardService.buscarRecorrentes(ano),
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

export function useValoresPeriodo(ano: number) {
  return useQuery({
    queryKey: dashboardKeys.valoresPeriodo(ano),
    queryFn: () => dashboardService.buscarValoresPeriodo(ano),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function useMaioresGastos(ano: number, limit = 5) {
  return useQuery({
    queryKey: dashboardKeys.maioresGastos(ano, limit),
    queryFn: () => dashboardService.buscarMaioresGastos(ano, limit),
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