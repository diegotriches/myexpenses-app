"use client";

import { useQuery } from "@tanstack/react-query";

// ── Tipos ──────────────────────────────────────────────────────────────────

export interface MesResumo {
  mes:      number;
  receitas: number;
  despesas: number;
  saldo:    number;
}

export interface CategoriaResumo {
  categoria:     string;
  total:         number;
  percentual:    number;
  totalAnterior: number;        // mesmo período do ano anterior
  variacao:      number | null; // % sobre totalAnterior; null = não havia gasto
}

export interface MetodoPagamentoResumo {
  metodo:     string;
  quantidade: number;
  total:      number;
  percentual: number;
}

export interface TransacaoDestaque {
  id:          string;
  descricao:   string | null;
  valor:       string;
  data:        string;
  categoria:   string | null;
  tipo:        string;
}

export interface ResumoAnualData {
  ano:              number;
  anoAnterior:      number;
  // No ano corrente: até o mês atual (a comparação usa o mesmo intervalo); 12 nos anos passados
  periodoComparado: { ateMes: number };
  // Ano atual
  totais:           { receitas: number; despesas: number; saldo: number };
  meses:            MesResumo[];
  categorias:       CategoriaResumo[];
  metodosPagamento: MetodoPagamentoResumo[];
  maiorReceita:     TransacaoDestaque | null;
  maiorDespesa:     TransacaoDestaque | null;
  mediaMensal:      { receitas: number; despesas: number };
  melhorMes:        { mes: number; saldo: number } | null;
  piorMes:          { mes: number; saldo: number } | null;
  // Ano anterior: totais no mesmo período; meses do ano inteiro (gráfico comparativo)
  totaisAnteriores: { receitas: number; despesas: number; saldo: number };
  mesesAnteriores:  MesResumo[];
}

// ── Query Keys ─────────────────────────────────────────────────────────────

export const resumoAnualKeys = {
  byAno: (ano: number) => ["resumo-anual", ano] as const,
};

// ── Hook ───────────────────────────────────────────────────────────────────

export function useResumoAnual(ano: number) {
  return useQuery({
    queryKey: resumoAnualKeys.byAno(ano),
    queryFn: async (): Promise<ResumoAnualData> => {
      const res = await fetch(`/api/resumo-anual?ano=${ano}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erro desconhecido" }));
        throw new Error(err.error || "Erro ao carregar resumo anual");
      }
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 min — dados anuais mudam pouco
    enabled: !!ano,
  });
}