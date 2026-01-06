import { useCallback, useState, useEffect } from "react";
import { dashboardService } from "@/services/dashboardService";
import { usePeriodo } from "@/contexts/PeriodoContext";
import { DashboardResponse } from "@/types/dashboard";

/**
 * Hook para carregar dados do dashboard
 * Usa automaticamente o período selecionado do PeriodoContext
 */
export function useDashboard() {
  const { mesSelecionado, anoSelecionado } = usePeriodo();
  
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // mesSelecionado é 0-indexed, então somamos 1 para a API
      const response = await dashboardService.buscarResumo(
        mesSelecionado + 1,
        anoSelecionado
      );
      setData(response);
    } catch (err: any) {
      console.error("Erro ao carregar dashboard:", err);
      setError(err?.message || "Erro ao carregar dashboard");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [mesSelecionado, anoSelecionado]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  return { 
    data, 
    loading, 
    error,
    carregar // Permite recarregar manualmente se necessário
  };
}