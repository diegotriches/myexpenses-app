// src/hooks/useDashboard.ts
"use client";

import { useQuery } from "@tanstack/react-query";
import { dashboardService } from "@/services/dashboardService";
import { usePeriodo } from "@/contexts/PeriodoContext";
import type { FiltrosExtrato } from "@/types/dashboard";

/**
 * Query Keys para dashboard
 * ✅ EXPORTADO para permitir invalidação em outros módulos
 */
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
};

/**
 * Hook para carregar dados completos do dashboard
 * Usa automaticamente o período selecionado do PeriodoContext
 * 
 * @example
 * const { data, isLoading, error, refetch } = useDashboard();
 * 
 * // Dados disponíveis:
 * data?.periodo // { mes: 1, ano: 2026 }
 * data?.resumo  // { receitas, despesas, saldo }
 * data?.cartoes // [{ cartaoId, nome, totalFatura, paga }]
 */
export function useDashboard() {
  const { mesSelecionado, anoSelecionado } = usePeriodo();

  return useQuery({
    queryKey: dashboardKeys.resumo(mesSelecionado + 1, anoSelecionado),
    queryFn: () => dashboardService.buscarResumo(mesSelecionado + 1, anoSelecionado),
    // Dashboard muda frequentemente, cache por 2 minutos
    staleTime: 2 * 60 * 1000,
    // Refetch ao focar janela (para sempre ter dados atualizados)
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook para buscar gráfico de meses
 * 
 * @param periodo - Número de meses como string (opcional, padrão: "6")
 * @returns Array com dados de receitas/despesas por mês
 * 
 * @example
 * const { data: graficoData, isLoading } = useGraficoMeses();
 * const { data: grafico12m, isLoading } = useGraficoMeses("12");
 * 
 * // Dados disponíveis:
 * graficoData // [{ mes: "2026-01", receitas: 1000, despesas: 500, balanco: 500 }]
 */
export function useGraficoMeses(periodo?: string) {
  return useQuery({
    queryKey: dashboardKeys.grafico(periodo),
    queryFn: () => dashboardService.buscarGraficoMeses(periodo || "6"),
    // Gráficos mudam menos, cache de 5 minutos
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para buscar extrato consolidado do dashboard
 * 
 * @param filters - Filtros obrigatórios (ano, mes) e opcionais
 * @returns Movimentações e resumo do extrato
 * 
 * @example
 * const { data: extrato, isLoading } = useExtratoDashboard({ 
 *   ano: 2026,
 *   mes: 1,
 *   contaId: "123",
 *   tipo: "entrada" 
 * });
 * 
 * // Dados disponíveis:
 * extrato?.movimentacoes // [{ id, data, tipo, valor, descricao, ... }]
 * extrato?.resumo        // { saldoInicial, totalEntradas, totalSaidas, saldoFinal }
 */
export function useExtratoDashboard(filters: FiltrosExtrato) {
  return useQuery({
    queryKey: dashboardKeys.extrato(filters),
    queryFn: () => dashboardService.buscarExtrato(filters),
    // Só executa se ano e mes estiverem presentes
    enabled: !!(filters.ano && filters.mes),
    staleTime: 3 * 60 * 1000,
  });
}

/**
 * Hook para resumo rápido (sem detalhes de cartões)
 * Útil para componentes que só precisam de receitas/despesas/saldo
 * 
 * @example
 * const { data: resumo, isLoading } = useDashboardResumoRapido();
 * 
 * // Dados disponíveis:
 * resumo // { receitas: 1000, despesas: 500, saldo: 500 }
 */
export function useDashboardResumoRapido() {
  const { mesSelecionado, anoSelecionado } = usePeriodo();

  return useQuery({
    queryKey: dashboardKeys.resumoRapido(mesSelecionado + 1, anoSelecionado),
    queryFn: () => dashboardService.buscarResumoRapido(mesSelecionado + 1, anoSelecionado),
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * ✨ NOVO: Hook para buscar condições de pagamento (Dinheiro/PIX/Cartão)
 * Usa automaticamente o período do contexto
 * 
 * @example
 * const { data: condicoes, isLoading } = useCondicoesPagamento();
 * 
 * // Dados disponíveis:
 * condicoes // { dinheiro: 10, pix: 15, cartao: 25 }
 */
export function useCondicoesPagamento() {
  const { mesSelecionado, anoSelecionado } = usePeriodo();

  return useQuery({
    queryKey: dashboardKeys.condicoesPagamento(mesSelecionado + 1, anoSelecionado),
    queryFn: () => dashboardService.buscarCondicoesPagamento(mesSelecionado + 1, anoSelecionado),
    staleTime: 3 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

/**
 * ✨ NOVO: Hook para buscar formas de pagamento (À Vista/Parcelado/Recorrente)
 * Usa automaticamente o período do contexto
 * 
 * @example
 * const { data: formas, isLoading } = useFormasPagamento();
 * 
 * // Dados disponíveis:
 * formas // { aVista: 20, parcelado: 10, recorrente: 5 }
 */
export function useFormasPagamento() {
  const { mesSelecionado, anoSelecionado } = usePeriodo();

  return useQuery({
    queryKey: dashboardKeys.formasPagamento(mesSelecionado + 1, anoSelecionado),
    queryFn: () => dashboardService.buscarFormasPagamento(mesSelecionado + 1, anoSelecionado),
    staleTime: 3 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

/**
 * ✨ NOVO: Hook para buscar resumo de faturas
 * Usa automaticamente o período do contexto
 * 
 * @example
 * const { data: faturas, isLoading } = useFaturasResumo();
 * 
 * // Dados disponíveis:
 * faturas // { totalFaturas: 5000, totalPago: 3000, totalAberto: 2000 }
 */
export function useFaturasResumo() {
  const { mesSelecionado, anoSelecionado } = usePeriodo();

  return useQuery({
    queryKey: dashboardKeys.faturas(mesSelecionado + 1, anoSelecionado),
    queryFn: () => dashboardService.buscarFaturasResumo(mesSelecionado + 1, anoSelecionado),
    staleTime: 3 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

/**
 * ✨ NOVO: Hook para buscar transações recorrentes
 * Usa automaticamente o período do contexto
 * 
 * @example
 * const { data: recorrentes, isLoading } = useRecorrentes();
 * 
 * // Dados disponíveis:
 * recorrentes // [{ id, descricao, valor, categoria, tipo, recorrente: true }]
 */
export function useRecorrentes() {
  const { mesSelecionado, anoSelecionado } = usePeriodo();

  return useQuery({
    queryKey: dashboardKeys.recorrentes(mesSelecionado + 1, anoSelecionado),
    queryFn: () => dashboardService.buscarRecorrentes(mesSelecionado + 1, anoSelecionado),
    staleTime: 3 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

/**
 * ✨ NOVO: Hook para buscar despesas futuras
 * Retorna o total de despesas em cartões que cairão em faturas posteriores ao mês atual
 * 
 * @example
 * const { data, isLoading } = useDespesasFuturas();
 * 
 * // Dados disponíveis:
 * data?.total      // 2450.00
 * data?.quantidade // 8
 */
export function useDespesasFuturas() {
  const { mesSelecionado, anoSelecionado } = usePeriodo();

  return useQuery({
    queryKey: dashboardKeys.despesasFuturas(mesSelecionado + 1, anoSelecionado),
    queryFn: () => dashboardService.buscarDespesasFuturas(mesSelecionado + 1, anoSelecionado),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}