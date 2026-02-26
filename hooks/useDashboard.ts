// src/hooks/useDashboard.ts
"use client";

import { useQuery } from "@tanstack/react-query";
import { dashboardService } from "@/services/dashboardService";
import { usePeriodo } from "@/contexts/PeriodoContext";
import type { 
  FiltrosExtrato,
  DadosGraficoMeses,
} from "@/types/dashboard";

export const dashboardKeys = {
  all: ["dashboard"] as const,
  resumo: (mes: number, ano: number) => ["dashboard", "resumo", ano, mes] as const,
  resumoRapido: (mes: number, ano: number) => ["dashboard", "resumo-rapido", ano, mes] as const,
  grafico: (periodo?: string) => ["dashboard", "grafico", periodo || "6"] as const,
  extrato: (filters: FiltrosExtrato) => ["dashboard", "extrato", filters] as const,
  condicoesPagamento: (mes: number, ano: number) => ["dashboard", "condicoes", ano, mes] as const,
  formasPagamento: (mes: number, ano: number) => ["dashboard", "formas", ano, mes] as const,
  faturas: (mes: number, ano: number) => ["dashboard", "faturas", ano, mes] as const,
  recorrentes: (mes: number, ano: number) => ["dashboard", "recorrentes", ano, mes] as const,
  despesasFuturas: (mes: number, ano: number) => ["dashboard", "despesas-futuras", ano, mes] as const,
  valoresPeriodo: (mes: number, ano: number) => ["dashboard", "valores-periodo", ano, mes] as const,
  maioresGastos: (mes: number, ano: number, limit: number) => ["dashboard", "maiores-gastos", ano, mes, limit] as const,
  transacoesRecentes: (limit: number) => ["dashboard", "transacoes-recentes", limit] as const,
  saldoHistorico: (periodo: string) => ["dashboard", "saldo-historico", periodo] as const,
};

export function useDashboard() {
  const { mesSelecionado, anoSelecionado } = usePeriodo();
  return useQuery({
    queryKey: dashboardKeys.resumo(mesSelecionado + 1, anoSelecionado),
    queryFn: () => dashboardService.buscarResumo(mesSelecionado + 1, anoSelecionado),
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
    queryFn: () => dashboardService.buscarResumoRapido(mesSelecionado + 1, anoSelecionado),
    staleTime: 2 * 60 * 1000,
  });
}

export function useCondicoesPagamento() {
  const { mesSelecionado, anoSelecionado } = usePeriodo();
  return useQuery({
    queryKey: dashboardKeys.condicoesPagamento(mesSelecionado + 1, anoSelecionado),
    queryFn: () => dashboardService.buscarCondicoesPagamento(mesSelecionado + 1, anoSelecionado),
    staleTime: 3 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function useFormasPagamento() {
  const { mesSelecionado, anoSelecionado } = usePeriodo();
  return useQuery({
    queryKey: dashboardKeys.formasPagamento(mesSelecionado + 1, anoSelecionado),
    queryFn: () => dashboardService.buscarFormasPagamento(mesSelecionado + 1, anoSelecionado),
    staleTime: 3 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function useFaturasResumo() {
  const { mesSelecionado, anoSelecionado } = usePeriodo();
  return useQuery({
    queryKey: dashboardKeys.faturas(mesSelecionado + 1, anoSelecionado),
    queryFn: () => dashboardService.buscarFaturasResumo(mesSelecionado + 1, anoSelecionado),
    staleTime: 3 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function useRecorrentes() {
  const { mesSelecionado, anoSelecionado } = usePeriodo();
  return useQuery({
    queryKey: dashboardKeys.recorrentes(mesSelecionado + 1, anoSelecionado),
    queryFn: () => dashboardService.buscarRecorrentes(mesSelecionado + 1, anoSelecionado),
    staleTime: 3 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function useDespesasFuturas() {
  const { mesSelecionado, anoSelecionado } = usePeriodo();
  return useQuery({
    queryKey: dashboardKeys.despesasFuturas(mesSelecionado + 1, anoSelecionado),
    queryFn: () => dashboardService.buscarDespesasFuturas(mesSelecionado + 1, anoSelecionado),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function useValoresPeriodo() {
  const { mesSelecionado, anoSelecionado } = usePeriodo();
  return useQuery({
    queryKey: dashboardKeys.valoresPeriodo(mesSelecionado + 1, anoSelecionado),
    queryFn: () => dashboardService.buscarValoresPeriodo(mesSelecionado + 1, anoSelecionado),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function useMaioresGastos(limit = 5) {
  const { mesSelecionado, anoSelecionado } = usePeriodo();
  return useQuery({
    queryKey: dashboardKeys.maioresGastos(mesSelecionado + 1, anoSelecionado, limit),
    queryFn: () => dashboardService.buscarMaioresGastos(mesSelecionado + 1, anoSelecionado, limit),
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
      const res = await fetch(`/api/dashboard/saldo-historico?periodo=${periodo}`);
      if (!res.ok) throw new Error("Erro ao buscar histórico de saldo");
      return res.json() as Promise<{ mes: string; saldoTotal: number }[]>;
    },
    staleTime: 5 * 60 * 1000,
  });
}