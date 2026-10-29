// src/hooks/useExtrato.ts
"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePeriodo } from "@/contexts/PeriodoContext";
import { dashboardService } from "@/services/dashboardService";

export interface MovimentacaoExtrato {
  id: string;
  data: string;
  tipo: "entrada" | "saida";
  valor: number;
  descricao: string;
  saldoApos: number;
  origem: "TRANSACAO_MANUAL" | "PAGAMENTO_FATURA" | "TRANSFERENCIA" | "AJUSTE" | "ESTORNO" | "APLICACAO" | "RESGATE_APLICACAO";
  referenciaId?: string | null;
  
  // Campos extras para contexto
  contaId: string;
  contaNome?: string;
  categoria?: string | null;
  formaPagamento?: string | null;
}

export interface SaldoConta {
  contaId: string;
  contaNome: string;
  saldoInicial: number;
  saldoFinal: number;
  totalEntradas: number;
  totalSaidas: number;
}

interface FiltrosExtrato {
  contaId?: string | null;
  origem?: MovimentacaoExtrato["origem"] | "TODAS";
  tipo?: "entrada" | "saida" | "TODOS";
  dataInicio?: string;
  dataFim?: string;
}

/**
 * Query Keys para extrato
 */
const extratoKeys = {
  all: (ano: number, mes: number, filtros: FiltrosExtrato) => 
    ["extrato", ano, mes, filtros] as const,
};

/**
 * Hook para buscar extrato geral (dashboard) com filtros (com cache)
 * 
 * @example
 * const { 
 *   movimentacoes, 
 *   saldos, 
 *   isLoading, 
 *   filtros, 
 *   setFiltros 
 * } = useExtrato();
 */
export function useExtrato() {
  const { mesSelecionado, anoSelecionado } = usePeriodo();
  
  const [filtros, setFiltros] = useState<FiltrosExtrato>({
    contaId: null,
    origem: "TODAS",
    tipo: "TODOS",
  });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: extratoKeys.all(anoSelecionado, mesSelecionado + 1, filtros),
    queryFn: async () => {
      // Prepara parâmetros para o service
      const params: any = {
        ano: anoSelecionado,
        mes: mesSelecionado + 1,
      };

      // Adiciona filtros opcionais
      if (filtros.contaId) {
        params.contaId = filtros.contaId;
      }
      
      if (filtros.origem && filtros.origem !== "TODAS") {
        params.origem = filtros.origem;
      }
      
      if (filtros.tipo && filtros.tipo !== "TODOS") {
        params.tipo = filtros.tipo;
      }

      if (filtros.dataInicio) {
        params.dataInicio = filtros.dataInicio;
      }

      if (filtros.dataFim) {
        params.dataFim = filtros.dataFim;
      }

      return dashboardService.buscarExtrato(params);
    },
    // Extrato muda frequentemente, cache de 2 minutos
    staleTime: 2 * 60 * 1000,
  });

  // Exportar PDF
  const exportarPDF = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        ano: String(anoSelecionado),
        mes: String(mesSelecionado + 1),
        formato: "pdf",
      });

      if (filtros.contaId) {
        params.append("contaId", filtros.contaId);
      }

      const res = await fetch(`/api/extrato/exportar?${params.toString()}`);
      
      if (!res.ok) {
        throw new Error("Falha ao exportar PDF");
      }

      // Download do arquivo
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `extrato-${anoSelecionado}-${String(mesSelecionado + 1).padStart(2, "0")}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
    } catch (err: any) {
      console.error("Erro ao exportar PDF:", err);
      throw err;
    }
  }, [anoSelecionado, mesSelecionado, filtros]);

  // Exportar Excel
  const exportarExcel = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        ano: String(anoSelecionado),
        mes: String(mesSelecionado + 1),
        formato: "excel",
      });

      if (filtros.contaId) {
        params.append("contaId", filtros.contaId);
      }

      const res = await fetch(`/api/extrato/exportar?${params.toString()}`);
      
      if (!res.ok) {
        throw new Error("Falha ao exportar Excel");
      }

      // Download do arquivo
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `extrato-${anoSelecionado}-${String(mesSelecionado + 1).padStart(2, "0")}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
    } catch (err: any) {
      console.error("Erro ao exportar Excel:", err);
      throw err;
    }
  }, [anoSelecionado, mesSelecionado, filtros]);

  return {
    // ✅ CORRIGIDO: Alinhado com ExtratoResponse de @/types/dashboard
    movimentacoes: data?.movimentacoes || [],
    resumo: data?.resumo || {
      saldoInicial: 0,
      totalEntradas: 0,
      totalSaidas: 0,
      saldoFinal: 0,
    },
    
    // Estados
    isLoading,
    error: error?.message || null,
    
    // Filtros
    filtros,
    setFiltros,
    
    // Ações
    carregar: refetch, // Recarregar manualmente
    exportarPDF,
    exportarExcel,
  };
}