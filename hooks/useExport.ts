// src/hooks/useExport.ts

/**
 * HOOKS: EXPORTAÇÃO DE DADOS
 * React Query hooks para gerenciar exportações
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { exportService } from "@/services/exportService";
import { toast } from "sonner";
import type {
  ExportCompletoDTO,
  ExportSeletivoDTO,
  ExportPeriodoDTO,
  ExportSuccessResponse,
  ExportHistoryItem
} from "@/types/export";

// ============================================================================
// QUERY KEYS
// ============================================================================

export const exportKeys = {
  all: ["export"] as const,
  historico: () => [...exportKeys.all, "historico"] as const,
  status: () => [...exportKeys.all, "status"] as const,
};

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Hook para obter histórico de exportações
 * 
 * @example
 * const { data: historico, isLoading } = useHistoricoExport();
 */
export function useHistoricoExport() {
  return useQuery({
    queryKey: exportKeys.historico(),
    queryFn: () => exportService.obterHistorico(),
    staleTime: 30 * 1000, // 30 segundos
    gcTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * Hook para verificar status do serviço
 * 
 * @example
 * const { data: status } = useStatusExport();
 * console.log(status.disponivel); // true/false
 */
export function useStatusExport() {
  return useQuery({
    queryKey: exportKeys.status(),
    queryFn: () => exportService.verificarStatus(),
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
    retry: 1,
  });
}

// ============================================================================
// MUTATIONS
// ============================================================================

interface UseMutationOptions {
  showToast?: boolean;
  onSuccessMessage?: string;
  onErrorMessage?: string;
}

/**
 * Hook para exportar todos os dados do usuário
 * 
 * @example
 * const { mutate: exportar, isPending } = useExportarCompleto();
 * 
 * exportar(
 *   { formato: "json" },
 *   {
 *     onSuccess: (data) => console.log("Exportado:", data.filename)
 *   }
 * );
 */
export function useExportarCompleto(options: UseMutationOptions = {}) {
  const queryClient = useQueryClient();
  const {
    showToast = true,
    onSuccessMessage = "Dados exportados com sucesso!",
    onErrorMessage = "Erro ao exportar dados",
  } = options;

  return useMutation({
    mutationFn: (dto: ExportCompletoDTO = {}) =>
      exportService.exportarCompleto(dto),

    onSuccess: (data) => {
      if (showToast) {
        toast.success(onSuccessMessage, {
          description: `Arquivo: ${data.filename}`,
          duration: 5000,
        });
      }

      // Invalida histórico para buscar atualizado
      queryClient.invalidateQueries({ queryKey: exportKeys.historico() });
    },

    onError: (error: Error) => {
      if (showToast) {
        toast.error(onErrorMessage, {
          description: error.message,
          duration: 7000,
        });
      }
      console.error("[useExportarCompleto] Erro:", error);
    },
  });
}

/**
 * Hook para exportar módulos específicos
 * 
 * @example
 * const { mutate: exportar } = useExportarSeletivo();
 * 
 * exportar({
 *   modulos: ["categorias", "transacoes"],
 *   formato: "json"
 * });
 */
export function useExportarSeletivo(options: UseMutationOptions = {}) {
  const queryClient = useQueryClient();
  const {
    showToast = true,
    onSuccessMessage = "Módulos exportados com sucesso!",
    onErrorMessage = "Erro ao exportar módulos",
  } = options;

  return useMutation({
    mutationFn: (dto: ExportSeletivoDTO) =>
      exportService.exportarSeletivo(dto),

    onSuccess: (data, variables) => {
      if (showToast) {
        toast.success(onSuccessMessage, {
          description: `${variables.modulos.length} módulo(s) exportado(s)`,
          duration: 5000,
        });
      }

      queryClient.invalidateQueries({ queryKey: exportKeys.historico() });
    },

    onError: (error: Error) => {
      if (showToast) {
        toast.error(onErrorMessage, {
          description: error.message,
          duration: 7000,
        });
      }
      console.error("[useExportarSeletivo] Erro:", error);
    },
  });
}

/**
 * Hook para exportar dados de um período específico
 * 
 * @example
 * const { mutate: exportar } = useExportarPeriodo();
 * 
 * exportar({
 *   inicio: "2026-01-01",
 *   fim: "2026-01-31",
 *   modulos: ["transacoes"]
 * });
 */
export function useExportarPeriodo(options: UseMutationOptions = {}) {
  const queryClient = useQueryClient();
  const {
    showToast = true,
    onSuccessMessage = "Período exportado com sucesso!",
    onErrorMessage = "Erro ao exportar período",
  } = options;

  return useMutation({
    mutationFn: (dto: ExportPeriodoDTO) =>
      exportService.exportarPeriodo(dto),

    onSuccess: (data, variables) => {
      if (showToast) {
        const periodo = `${variables.inicio} até ${variables.fim}`;
        toast.success(onSuccessMessage, {
          description: periodo,
          duration: 5000,
        });
      }

      queryClient.invalidateQueries({ queryKey: exportKeys.historico() });
    },

    onError: (error: Error) => {
      if (showToast) {
        toast.error(onErrorMessage, {
          description: error.message,
          duration: 7000,
        });
      }
      console.error("[useExportarPeriodo] Erro:", error);
    },
  });
}

/**
 * Hook para limpar histórico de exportações
 * 
 * @example
 * const { mutate: limpar } = useLimparHistoricoExport();
 * limpar();
 */
export function useLimparHistoricoExport(options: UseMutationOptions = {}) {
  const queryClient = useQueryClient();
  const {
    showToast = true,
    onSuccessMessage = "Histórico limpo com sucesso",
    onErrorMessage = "Erro ao limpar histórico",
  } = options;

  return useMutation({
    mutationFn: () => {
      exportService.limparHistorico();
      return Promise.resolve();
    },

    onSuccess: () => {
      if (showToast) {
        toast.success(onSuccessMessage);
      }

      // Atualizar cache local
      queryClient.setQueryData<ExportHistoryItem[]>(
        exportKeys.historico(),
        []
      );
    },

    onError: (error: Error) => {
      if (showToast) {
        toast.error(onErrorMessage, {
          description: error.message,
        });
      }
      console.error("[useLimparHistoricoExport] Erro:", error);
    },
  });
}

/**
 * Hook para remover item específico do histórico
 * 
 * @example
 * const { mutate: remover } = useRemoverDoHistoricoExport();
 * remover("export-id-123");
 */
export function useRemoverDoHistoricoExport(options: UseMutationOptions = {}) {
  const queryClient = useQueryClient();
  const {
    showToast = true,
    onSuccessMessage = "Item removido do histórico",
    onErrorMessage = "Erro ao remover item",
  } = options;

  return useMutation({
    mutationFn: (id: string) => {
      exportService.removerDoHistorico(id);
      return Promise.resolve();
    },

    onSuccess: (_, id) => {
      if (showToast) {
        toast.success(onSuccessMessage);
      }

      // Atualizar cache local (optimistic update)
      queryClient.setQueryData<ExportHistoryItem[]>(
        exportKeys.historico(),
        (old) => old?.filter((item) => item.id !== id) || []
      );
    },

    onError: (error: Error) => {
      if (showToast) {
        toast.error(onErrorMessage, {
          description: error.message,
        });
      }
      console.error("[useRemoverDoHistoricoExport] Erro:", error);
    },
  });
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Hook combinado para exportação com todas as opções
 * 
 * @example
 * const export = useExport();
 * 
 * // Exportar tudo
 * export.completo.mutate();
 * 
 * // Exportar seletivo
 * export.seletivo.mutate({ modulos: ["categorias"] });
 * 
 * // Histórico
 * const historico = export.historico.data;
 */
export function useExport() {
  return {
    // Queries
    historico: useHistoricoExport(),
    status: useStatusExport(),

    // Mutations
    completo: useExportarCompleto(),
    seletivo: useExportarSeletivo(),
    periodo: useExportarPeriodo(),
    limparHistorico: useLimparHistoricoExport(),
    removerDoHistorico: useRemoverDoHistoricoExport(),
  };
}