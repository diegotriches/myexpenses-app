// src/hooks/useImport.ts

/**
 * HOOKS: IMPORTAÇÃO DE DADOS
 * React Query hooks para gerenciar importações
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { importService } from "@/services/importService";
import { toast } from "sonner";
import type {
  ImportUploadDTO,
  ImportValidarDTO,
  ImportProcessarDTO,
  ImportValidationResult,
  ImportResult,
  ImportUploadResponse,
  EstrategiaConflito
} from "@/types/import";
import type { ExportFile } from "@/types/export";

// ============================================================================
// QUERY KEYS
// ============================================================================

export const importKeys = {
  all: ["import"] as const,
  validacao: (fileId: string) => [...importKeys.all, "validacao", fileId] as const,
  status: (sessionId: string) => [...importKeys.all, "status", sessionId] as const,
};

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Hook para buscar status de importação em andamento
 * 
 * @example
 * const { data: status } = useStatusImport(sessionId, {
 *   enabled: isImporting,
 *   refetchInterval: 1000 // Poll a cada 1 segundo
 * });
 */
export function useStatusImport(
  sessionId: string | null,
  options?: {
    enabled?: boolean;
    refetchInterval?: number;
  }
) {
  return useQuery({
    queryKey: importKeys.status(sessionId || ""),
    queryFn: () => importService.buscarStatus(sessionId!),
    enabled: !!sessionId && (options?.enabled ?? true),
    refetchInterval: options?.refetchInterval ?? 2000, // 2 segundos
    staleTime: 0, // Sempre buscar atualização
    gcTime: 1000, // 1 segundo
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
 * Hook para upload e parse do arquivo
 * 
 * @example
 * const { mutate: upload, isPending, data } = useUploadArquivo();
 * 
 * const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
 *   const file = e.target.files?.[0];
 *   if (file) {
 *     upload({ file });
 *   }
 * };
 */
export function useUploadArquivo(options: UseMutationOptions = {}) {
  const {
    showToast = true,
    onSuccessMessage = "Arquivo carregado com sucesso!",
    onErrorMessage = "Erro ao carregar arquivo",
  } = options;

  return useMutation({
    mutationFn: (dto: ImportUploadDTO) =>
      importService.uploadArquivo(dto),

    onSuccess: (data) => {
      if (showToast) {
        const tamanho = (data.tamanho / 1024 / 1024).toFixed(2);
        toast.success(onSuccessMessage, {
          description: `Tamanho: ${tamanho} MB`,
          duration: 3000,
        });
      }
    },

    onError: (error: Error) => {
      if (showToast) {
        toast.error(onErrorMessage, {
          description: error.message,
          duration: 7000,
        });
      }
      console.error("[useUploadArquivo] Erro:", error);
    },
  });
}

/**
 * Hook para validar arquivo de importação
 * 
 * @example
 * const { mutate: validar, isPending, data } = useValidarArquivo();
 * 
 * validar({
 *   dados: exportFile,
 *   estrategiaPadrao: "skip"
 * });
 */
export function useValidarArquivo(options: UseMutationOptions = {}) {
  const queryClient = useQueryClient();
  const {
    showToast = true,
    onSuccessMessage = "Arquivo validado com sucesso!",
    onErrorMessage = "Erro na validação do arquivo",
  } = options;

  return useMutation({
    mutationFn: (dto: ImportValidarDTO) =>
      importService.validarArquivo(dto),

    onSuccess: (data) => {
      const { validacao } = data;

      if (showToast) {
        if (validacao.podeProsseguir) {
          toast.success(onSuccessMessage, {
            description: `${validacao.preview.resumo.novos} novos registros`,
            duration: 5000,
          });
        } else {
          toast.warning("Arquivo com problemas", {
            description: `${validacao.errosCriticos.length} erro(s) crítico(s)`,
            duration: 7000,
          });
        }
      }

      // Cache da validação
      queryClient.setQueryData(
        importKeys.validacao(data.sessionId),
        data.validacao
      );
    },

    onError: (error: Error) => {
      if (showToast) {
        toast.error(onErrorMessage, {
          description: error.message,
          duration: 7000,
        });
      }
      console.error("[useValidarArquivo] Erro:", error);
    },
  });
}

/**
 * Hook para gerar preview rápido
 * 
 * @example
 * const { mutate: preview, isPending } = useGerarPreview();
 * 
 * preview(exportFile, {
 *   onSuccess: (preview) => console.log(preview.resumo)
 * });
 */
export function useGerarPreview(options: UseMutationOptions = {}) {
  const {
    showToast = false, // Preview não mostra toast por padrão
    onErrorMessage = "Erro ao gerar preview",
  } = options;

  return useMutation({
    mutationFn: (dados: ExportFile) =>
      importService.gerarPreview(dados),

    onError: (error: Error) => {
      if (showToast) {
        toast.error(onErrorMessage, {
          description: error.message,
        });
      }
      console.error("[useGerarPreview] Erro:", error);
    },
  });
}

/**
 * Hook para processar importação
 * 
 * @example
 * const { mutate: processar, isPending } = useProcessarImportacao({
 *   onSuccess: (result) => {
 *     console.log(`Importados: ${result.resultado.resumo.importados}`);
 *   }
 * });
 * 
 * processar({
 *   dados: exportFile,
 *   estrategiaConflito: "skip",
 *   criarBackup: true
 * });
 */
export function useProcessarImportacao(options: UseMutationOptions = {}) {
  const queryClient = useQueryClient();
  const {
    showToast = true,
    onSuccessMessage = "Importação concluída com sucesso!",
    onErrorMessage = "Erro ao processar importação",
  } = options;

  return useMutation({
    mutationFn: (dto: ImportProcessarDTO) =>
      importService.processarImportacao(dto),

    onSuccess: (data) => {
      const { resultado } = data;

      if (showToast) {
        if (resultado.sucesso) {
          toast.success(onSuccessMessage, {
            description: `${resultado.resumo.importados} registros importados`,
            duration: 5000,
          });
        } else if (resultado.status === "concluido_parcial") {
          toast.warning("Importação concluída com avisos", {
            description: `${resultado.resumo.erros} erro(s) encontrado(s)`,
            duration: 7000,
          });
        } else {
          toast.error("Importação falhou", {
            description: `${resultado.resumo.erros} erro(s)`,
            duration: 7000,
          });
        }
      }

      // Invalidar todas as queries relacionadas aos módulos importados
      resultado.modulos.forEach((modulo) => {
        queryClient.invalidateQueries({ queryKey: [modulo] });
      });

      // Invalidar queries gerais
      queryClient.invalidateQueries({ queryKey: ["categorias"] });
      queryClient.invalidateQueries({ queryKey: ["contas"] });
      queryClient.invalidateQueries({ queryKey: ["transacoes"] });
    },

    onError: (error: Error) => {
      if (showToast) {
        toast.error(onErrorMessage, {
          description: error.message,
          duration: 7000,
        });
      }
      console.error("[useProcessarImportacao] Erro:", error);
    },
  });
}

/**
 * Hook para cancelar importação em andamento
 * 
 * @example
 * const { mutate: cancelar } = useCancelarImportacao();
 * cancelar(sessionId);
 */
export function useCancelarImportacao(options: UseMutationOptions = {}) {
  const queryClient = useQueryClient();
  const {
    showToast = true,
    onSuccessMessage = "Importação cancelada",
    onErrorMessage = "Erro ao cancelar importação",
  } = options;

  return useMutation({
    mutationFn: (sessionId: string) =>
      importService.cancelarImportacao(sessionId),

    onSuccess: (_, sessionId) => {
      if (showToast) {
        toast.info(onSuccessMessage);
      }

      // Invalidar status
      queryClient.invalidateQueries({
        queryKey: importKeys.status(sessionId),
      });
    },

    onError: (error: Error) => {
      if (showToast) {
        toast.error(onErrorMessage, {
          description: error.message,
        });
      }
      console.error("[useCancelarImportacao] Erro:", error);
    },
  });
}

/**
 * Hook para validação local (sem API)
 * 
 * @example
 * const { mutate: validarLocal } = useValidarLocal();
 * 
 * validarLocal(exportFile, {
 *   onSuccess: (result) => {
 *     if (!result.podeProsseguir) {
 *       console.error("Arquivo inválido:", result.errosCriticos);
 *     }
 *   }
 * });
 */
export function useValidarLocal(options: UseMutationOptions = {}) {
  const {
    showToast = false, // Validação local não mostra toast
    onErrorMessage = "Erro na validação local",
  } = options;

  return useMutation({
    mutationFn: (dados: ExportFile) =>
      importService.validarLocal(dados),

    onError: (error: Error) => {
      if (showToast) {
        toast.error(onErrorMessage, {
          description: error.message,
        });
      }
      console.error("[useValidarLocal] Erro:", error);
    },
  });
}

/**
 * Hook para criar backup antes de importar
 * 
 * @example
 * const { mutate: criarBackup, isPending } = useCriarBackup();
 * 
 * criarBackup(undefined, {
 *   onSuccess: (backup) => console.log("Backup:", backup.downloadUrl)
 * });
 */
export function useCriarBackup(options: UseMutationOptions = {}) {
  const {
    showToast = true,
    onSuccessMessage = "Backup criado com sucesso",
    onErrorMessage = "Erro ao criar backup",
  } = options;

  return useMutation({
    mutationFn: () => importService.criarBackup(),

    onSuccess: (data) => {
      if (showToast) {
        toast.success(onSuccessMessage, {
          description: "Seus dados estão protegidos",
          duration: 3000,
        });
      }
    },

    onError: (error: Error) => {
      if (showToast) {
        toast.error(onErrorMessage, {
          description: error.message,
        });
      }
      console.error("[useCriarBackup] Erro:", error);
    },
  });
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Hook combinado para importação com todas as opções
 * 
 * @example
 * const importacao = useImport();
 * 
 * // Upload
 * importacao.upload.mutate({ file });
 * 
 * // Validar
 * importacao.validar.mutate({ dados: exportFile });
 * 
 * // Processar
 * importacao.processar.mutate({
 *   dados: exportFile,
 *   estrategiaConflito: "skip"
 * });
 * 
 * // Status (polling)
 * const status = importacao.status(sessionId);
 */
export function useImport() {
  return {
    // Mutations
    upload: useUploadArquivo(),
    validar: useValidarArquivo(),
    preview: useGerarPreview(),
    processar: useProcessarImportacao(),
    cancelar: useCancelarImportacao(),
    validarLocal: useValidarLocal(),
    criarBackup: useCriarBackup(),

    // Query (função para criar)
    status: (sessionId: string | null, options?: any) =>
      useStatusImport(sessionId, options),
  };
}

// ============================================================================
// CONSTANTS - Helpers para UI
// ============================================================================

/**
 * Cores dos status para UI
 */
export const STATUS_COLORS: Record<string, string> = {
  aguardando: "gray",
  validando: "blue",
  preview: "yellow",
  processando: "blue",
  concluido: "green",
  concluido_parcial: "yellow",
  erro: "red",
  cancelado: "gray",
};

/**
 * Ícones dos status (Lucide React)
 */
export const STATUS_ICONS: Record<string, string> = {
  aguardando: "Clock",
  validando: "Search",
  preview: "Eye",
  processando: "Loader2",
  concluido: "CheckCircle2",
  concluido_parcial: "AlertCircle",
  erro: "XCircle",
  cancelado: "X",
};