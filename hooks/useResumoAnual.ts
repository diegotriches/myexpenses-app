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
  categoria:  string;
  total:      number;
  percentual: number;
  [key: string]: string | number;
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
  // Ano atual
  totais:           { receitas: number; despesas: number; saldo: number };
  meses:            MesResumo[];
  categorias:       CategoriaResumo[];
  maiorReceita:     TransacaoDestaque | null;
  maiorDespesa:     TransacaoDestaque | null;
  mediaMensal:      { receitas: number; despesas: number };
  melhorMes:        { mes: number; saldo: number } | null;
  piorMes:          { mes: number; saldo: number } | null;
  // Ano anterior
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