// src/services/exportService.ts

/**
 * SERVICE: EXPORTAÇÃO DE DADOS
 * Gerencia todas as operações de exportação de dados do usuário
 */

import type {
  ExportCompletoDTO,
  ExportSeletivoDTO,
  ExportPeriodoDTO,
  ExportSuccessResponse,
  ExportErrorResponse,
  ExportHistoryItem,
  ModuloExport,
  FormatoExport
} from "@/types/export";

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================

const API_BASE_URL = "/api/export";

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Trata resposta da API
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error: ExportErrorResponse = await response.json();
    throw new Error(error.error || "Erro ao processar exportação");
  }
  
  // Para downloads, retorna o blob
  if (response.headers.get("content-disposition")) {
    const blob = await response.blob();
    const filename = extractFilename(response.headers.get("content-disposition") || "");
    return { blob, filename } as any;
  }
  
  return response.json();
}

/**
 * Extrai nome do arquivo do header Content-Disposition
 */
function extractFilename(contentDisposition: string): string {
  const matches = /filename="(.+)"/.exec(contentDisposition);
  return matches?.[1] || `myexpenses-export-${Date.now()}.json`;
}

/**
 * Faz download do blob no navegador
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Salva histórico no localStorage
 */
function salvarHistorico(item: ExportHistoryItem): void {
  try {
    const historico = obterHistorico();
    historico.unshift(item);
    
    // Mantém apenas últimos 20 registros
    const historicoLimitado = historico.slice(0, 20);
    
    localStorage.setItem("myexpenses:export:history", JSON.stringify(historicoLimitado));
  } catch (error) {
    console.warn("Erro ao salvar histórico de exportação:", error);
  }
}

/**
 * Obtém histórico do localStorage
 */
function obterHistorico(): ExportHistoryItem[] {
  try {
    const json = localStorage.getItem("myexpenses:export:history");
    return json ? JSON.parse(json) : [];
  } catch (error) {
    console.warn("Erro ao obter histórico de exportação:", error);
    return [];
  }
}

// ============================================================================
// SERVICE
// ============================================================================

export const exportService = {
  
  /**
   * Exporta todos os dados do usuário
   * 
   * @example
   * const response = await exportService.exportarCompleto();
   * // Arquivo baixado automaticamente
   */
  async exportarCompleto(
    dto: ExportCompletoDTO = {}
  ): Promise<ExportSuccessResponse> {
    const inicio = Date.now();
    
    try {
      console.log("[ExportService] Exportando dados completos...");
      
      const queryParams = new URLSearchParams();
      if (dto.formato) queryParams.set("formato", dto.formato);
      if (dto.encrypted) queryParams.set("encrypted", "true");
      
      const url = `${API_BASE_URL}/meus-dados${queryParams.toString() ? `?${queryParams}` : ""}`;
      
      const response = await fetch(url, {
        method: "GET",
        headers: dto.senha ? {
          "X-Encryption-Password": dto.senha
        } : {}
      });
      
      const result = await handleResponse<{ blob: Blob; filename: string }>(response);
      
      // Faz download automático
      downloadBlob(result.blob, result.filename);
      
      const duracao = Date.now() - inicio;
      
      // Salva no histórico
      const historicoItem: ExportHistoryItem = {
        id: crypto.randomUUID(),
        userId: "", // Será preenchido pela API
        tipo: "completo",
        formato: dto.formato || "json",
        status: "concluido",
        filename: result.filename,
        tamanho: result.blob.size,
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        duracao
      };
      
      salvarHistorico(historicoItem);
      
      console.log("[ExportService] Exportação completa concluída:", result.filename);
      
      return {
        message: "Dados exportados com sucesso",
        filename: result.filename,
        statistics: {
          categorias: 0,
          contas: 0,
          cartoes: 0,
          transacoes: 0,
          faturas: 0,
          extrato: 0,
          notificacoes: 0,
          preferencias: 0,
          tamanhoBytes: result.blob.size,
          tamanhoFormatado: formatBytes(result.blob.size)
        },
        timestamp: new Date().toISOString()
      };
      
    } catch (error: any) {
      console.error("[ExportService] Erro ao exportar dados completos:", error);
      
      // Salva erro no histórico
      const historicoItem: ExportHistoryItem = {
        id: crypto.randomUUID(),
        userId: "",
        tipo: "completo",
        formato: dto.formato || "json",
        status: "erro",
        error: error.message,
        createdAt: new Date().toISOString(),
        duracao: Date.now() - inicio
      };
      
      salvarHistorico(historicoItem);
      
      throw error;
    }
  },
  
  /**
   * Exporta módulos específicos
   * 
   * @example
   * const response = await exportService.exportarSeletivo({
   *   modulos: ["categorias", "transacoes"],
   *   formato: "json"
   * });
   */
  async exportarSeletivo(
    dto: ExportSeletivoDTO
  ): Promise<ExportSuccessResponse> {
    const inicio = Date.now();
    
    try {
      console.log("[ExportService] Exportando módulos selecionados:", dto.modulos);
      
      const queryParams = new URLSearchParams({
        modulos: dto.modulos.join(","),
        formato: dto.formato || "json"
      });
      
      if (dto.encrypted) queryParams.set("encrypted", "true");
      
      const url = `${API_BASE_URL}/seletivo?${queryParams}`;
      
      const response = await fetch(url, {
        method: "GET",
        headers: dto.senha ? {
          "X-Encryption-Password": dto.senha
        } : {}
      });
      
      const result = await handleResponse<{ blob: Blob; filename: string }>(response);
      
      // Faz download automático
      downloadBlob(result.blob, result.filename);
      
      const duracao = Date.now() - inicio;
      
      // Salva no histórico
      const historicoItem: ExportHistoryItem = {
        id: crypto.randomUUID(),
        userId: "",
        tipo: "seletivo",
        modulos: dto.modulos,
        formato: dto.formato || "json",
        status: "concluido",
        filename: result.filename,
        tamanho: result.blob.size,
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        duracao
      };
      
      salvarHistorico(historicoItem);
      
      console.log("[ExportService] Exportação seletiva concluída:", result.filename);
      
      return {
        message: "Módulos exportados com sucesso",
        filename: result.filename,
        statistics: {
          categorias: 0,
          contas: 0,
          cartoes: 0,
          transacoes: 0,
          faturas: 0,
          extrato: 0,
          notificacoes: 0,
          preferencias: 0,
          tamanhoBytes: result.blob.size,
          tamanhoFormatado: formatBytes(result.blob.size)
        },
        timestamp: new Date().toISOString()
      };
      
    } catch (error: any) {
      console.error("[ExportService] Erro ao exportar módulos selecionados:", error);
      
      // Salva erro no histórico
      const historicoItem: ExportHistoryItem = {
        id: crypto.randomUUID(),
        userId: "",
        tipo: "seletivo",
        modulos: dto.modulos,
        formato: dto.formato || "json",
        status: "erro",
        error: error.message,
        createdAt: new Date().toISOString(),
        duracao: Date.now() - inicio
      };
      
      salvarHistorico(historicoItem);
      
      throw error;
    }
  },
  
  /**
   * Exporta dados de um período específico
   * 
   * @example
   * const response = await exportService.exportarPeriodo({
   *   inicio: "2026-01-01",
   *   fim: "2026-01-31",
   *   modulos: ["transacoes"]
   * });
   */
  async exportarPeriodo(
    dto: ExportPeriodoDTO
  ): Promise<ExportSuccessResponse> {
    const inicio = Date.now();
    
    try {
      console.log("[ExportService] Exportando período:", dto.inicio, "até", dto.fim);
      
      const queryParams = new URLSearchParams({
        inicio: dto.inicio,
        fim: dto.fim,
        formato: dto.formato || "json"
      });
      
      if (dto.modulos) queryParams.set("modulos", dto.modulos.join(","));
      if (dto.encrypted) queryParams.set("encrypted", "true");
      
      const url = `${API_BASE_URL}/periodo?${queryParams}`;
      
      const response = await fetch(url, {
        method: "GET",
        headers: dto.senha ? {
          "X-Encryption-Password": dto.senha
        } : {}
      });
      
      const result = await handleResponse<{ blob: Blob; filename: string }>(response);
      
      // Faz download automático
      downloadBlob(result.blob, result.filename);
      
      const duracao = Date.now() - inicio;
      
      // Salva no histórico
      const historicoItem: ExportHistoryItem = {
        id: crypto.randomUUID(),
        userId: "",
        tipo: "periodo",
        modulos: dto.modulos,
        periodo: {
          inicio: dto.inicio,
          fim: dto.fim
        },
        formato: dto.formato || "json",
        status: "concluido",
        filename: result.filename,
        tamanho: result.blob.size,
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        duracao
      };
      
      salvarHistorico(historicoItem);
      
      console.log("[ExportService] Exportação por período concluída:", result.filename);
      
      return {
        message: "Período exportado com sucesso",
        filename: result.filename,
        statistics: {
          categorias: 0,
          contas: 0,
          cartoes: 0,
          transacoes: 0,
          faturas: 0,
          extrato: 0,
          notificacoes: 0,
          preferencias: 0,
          tamanhoBytes: result.blob.size,
          tamanhoFormatado: formatBytes(result.blob.size)
        },
        timestamp: new Date().toISOString()
      };
      
    } catch (error: any) {
      console.error("[ExportService] Erro ao exportar período:", error);
      
      // Salva erro no histórico
      const historicoItem: ExportHistoryItem = {
        id: crypto.randomUUID(),
        userId: "",
        tipo: "periodo",
        periodo: {
          inicio: dto.inicio,
          fim: dto.fim
        },
        formato: dto.formato || "json",
        status: "erro",
        error: error.message,
        createdAt: new Date().toISOString(),
        duracao: Date.now() - inicio
      };
      
      salvarHistorico(historicoItem);
      
      throw error;
    }
  },
  
  /**
   * Verifica saúde do serviço de exportação
   * 
   * @example
   * const status = await exportService.verificarStatus();
   * console.log(status.disponivel); // true/false
   */
  async verificarStatus(): Promise<{
    disponivel: boolean;
    mensagem: string;
    timestamp: string;
  }> {
    try {
      console.log("[ExportService] Verificando status...");
      
      const response = await fetch(`${API_BASE_URL}/verificar`);
      
      if (!response.ok) {
        return {
          disponivel: false,
          mensagem: "Serviço de exportação indisponível",
          timestamp: new Date().toISOString()
        };
      }
      
      const data = await response.json();
      
      console.log("[ExportService] Status OK");
      
      return {
        disponivel: true,
        mensagem: data.message || "Serviço funcionando normalmente",
        timestamp: new Date().toISOString()
      };
      
    } catch (error: any) {
      console.error("[ExportService] Erro ao verificar status:", error);
      
      return {
        disponivel: false,
        mensagem: error.message || "Erro ao conectar com serviço",
        timestamp: new Date().toISOString()
      };
    }
  },
  
  /**
   * Obtém histórico de exportações do localStorage
   * 
   * @example
   * const historico = exportService.obterHistorico();
   * console.log(historico.length); // Últimas 20 exportações
   */
  obterHistorico(): ExportHistoryItem[] {
    return obterHistorico();
  },
  
  /**
   * Limpa histórico de exportações
   * 
   * @example
   * exportService.limparHistorico();
   */
  limparHistorico(): void {
    try {
      localStorage.removeItem("myexpenses:export:history");
      console.log("[ExportService] Histórico limpo");
    } catch (error) {
      console.warn("[ExportService] Erro ao limpar histórico:", error);
    }
  },
  
  /**
   * Remove item específico do histórico
   * 
   * @example
   * exportService.removerDoHistorico("export-id-123");
   */
  removerDoHistorico(id: string): void {
    try {
      const historico = obterHistorico();
      const novoHistorico = historico.filter(item => item.id !== id);
      
      localStorage.setItem("myexpenses:export:history", JSON.stringify(novoHistorico));
      
      console.log("[ExportService] Item removido do histórico:", id);
    } catch (error) {
      console.warn("[ExportService] Erro ao remover do histórico:", error);
    }
  }
};

// ============================================================================
// HELPER PÚBLICO
// ============================================================================

/**
 * Formata bytes para string legível
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}