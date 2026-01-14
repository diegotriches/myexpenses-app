// src/services/importService.ts

/**
 * SERVICE: IMPORTAÇÃO DE DADOS
 * Gerencia validação, preview e processamento de importação
 */

import type { ExportFile } from "@/types/export";
import type {
  ImportUploadDTO,
  ImportValidarDTO,
  ImportProcessarDTO,
  ImportValidationResult,
  ImportResult,
  ImportUploadResponse,
  ImportValidarResponse,
  ImportProcessarResponse,
  ImportErrorResponse,
  EstrategiaConflito
} from "@/types/import";

import {
  validarArquivoImport,
  validarTamanhoArquivo,
  validarExtensaoArquivo
} from "@/lib/validators/import";

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================

const API_BASE_URL = "/api/import";
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Trata resposta da API
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error: ImportErrorResponse = await response.json();
    throw new Error(error.error || "Erro ao processar importação");
  }

  return response.json();
}

/**
 * Lê arquivo como texto
 */
async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Erro ao ler arquivo"));
      }
    };

    reader.onerror = () => reject(new Error("Erro ao ler arquivo"));

    reader.readAsText(file);
  });
}

/**
 * Parseia JSON com tratamento de erro
 */
function parseJSON<T = any>(json: string): T {
  try {
    return JSON.parse(json);
  } catch (error) {
    throw new Error("Arquivo JSON inválido ou corrompido");
  }
}

// ============================================================================
// SERVICE
// ============================================================================

export const importService = {

  /**
   * Faz upload e validação inicial do arquivo
   * 
   * @example
   * const file = event.target.files[0];
   * const response = await importService.uploadArquivo({ file });
   * console.log(response.dados); // Dados parseados
   */
  async uploadArquivo(
    dto: ImportUploadDTO
  ): Promise<ImportUploadResponse> {
    try {
      console.log("[ImportService] Upload de arquivo:", dto.file.name);

      // Valida tamanho
      const erroTamanho = validarTamanhoArquivo(dto.file.size);
      if (erroTamanho) {
        throw new Error(erroTamanho.mensagem);
      }

      // Valida extensão
      const erroExtensao = validarExtensaoArquivo(dto.file.name);
      if (erroExtensao) {
        throw new Error(erroExtensao.mensagem);
      }

      // Lê arquivo
      const conteudo = await readFileAsText(dto.file);

      // Parseia JSON
      const dados: ExportFile = parseJSON(conteudo);

      console.log("[ImportService] Arquivo parseado com sucesso");

      return {
        message: "Arquivo carregado com sucesso",
        fileId: crypto.randomUUID(),
        dados,
        tamanho: dto.file.size,
        timestamp: new Date().toISOString()
      };

    } catch (error: any) {
      console.error("[ImportService] Erro no upload:", error);
      throw error;
    }
  },

  /**
   * Valida arquivo e gera preview da importação
   * 
   * @example
   * const response = await importService.validarArquivo({
   *   dados: exportFile,
   *   estrategiaPadrao: "skip"
   * });
   * console.log(response.validacao.preview);
   */
  async validarArquivo(
    dto: ImportValidarDTO
  ): Promise<ImportValidarResponse> {
    try {
      console.log("[ImportService] Validando arquivo...");

      // Busca dados existentes para comparação (preview)
      const dadosExistentes = await buscarDadosExistentes();

      // Executa validação completa
      const validacao = await validarArquivoImport(
        dto.dados,
        dadosExistentes
      );

      console.log("[ImportService] Validação concluída:", {
        valido: validacao.valido,
        errosCriticos: validacao.errosCriticos.length,
        avisos: validacao.avisos.length
      });

      return {
        validacao,
        sessionId: crypto.randomUUID(),
        timestamp: new Date().toISOString()
      };

    } catch (error: any) {
      console.error("[ImportService] Erro na validação:", error);
      throw error;
    }
  },

  /**
   * Processa importação dos dados
   * 
   * @example
   * const response = await importService.processarImportacao({
   *   dados: exportFile,
   *   estrategiaConflito: "skip",
   *   criarBackup: true
   * });
   * console.log(response.resultado.resumo);
   */
  async processarImportacao(
    dto: ImportProcessarDTO
  ): Promise<ImportProcessarResponse> {
    try {
      console.log("[ImportService] Processando importação...");

      const response = await fetch(`${API_BASE_URL}/processar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(dto)
      });

      const result = await handleResponse<ImportProcessarResponse>(response);

      console.log("[ImportService] Importação concluída:", {
        sucesso: result.resultado.sucesso,
        importados: result.resultado.resumo.importados,
        erros: result.resultado.resumo.erros
      });

      return result;

    } catch (error: any) {
      console.error("[ImportService] Erro no processamento:", error);
      throw error;
    }
  },

  /**
   * Busca preview rápido sem validação completa
   * 
   * @example
   * const preview = await importService.gerarPreview(exportFile);
   * console.log(preview.resumo);
   */
  async gerarPreview(
    dados: ExportFile
  ): Promise<ImportValidationResult["preview"]> {
    try {
      console.log("[ImportService] Gerando preview...");

      const response = await fetch(`${API_BASE_URL}/preview`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ dados })
      });

      const result = await handleResponse<{ preview: ImportValidationResult["preview"] }>(response);

      console.log("[ImportService] Preview gerado");

      return result.preview;

    } catch (error: any) {
      console.error("[ImportService] Erro ao gerar preview:", error);
      throw error;
    }
  },

  /**
   * Valida dados localmente (sem API)
   * Útil para feedback rápido antes de enviar para servidor
   * 
   * @example
   * const validacao = await importService.validarLocal(exportFile);
   * if (!validacao.podeProsseguir) {
   *   console.error(validacao.errosCriticos);
   * }
   */
  async validarLocal(
    dados: ExportFile,
    dadosExistentes?: any
  ): Promise<ImportValidationResult> {
    try {
      console.log("[ImportService] Validação local...");

      const validacao = await validarArquivoImport(dados, dadosExistentes);

      console.log("[ImportService] Validação local concluída");

      return validacao;

    } catch (error: any) {
      console.error("[ImportService] Erro na validação local:", error);
      throw error;
    }
  },

  /**
   * Cancela importação em andamento
   * 
   * @example
   * await importService.cancelarImportacao(sessionId);
   */
  async cancelarImportacao(sessionId: string): Promise<void> {
    try {
      console.log("[ImportService] Cancelando importação:", sessionId);

      await fetch(`${API_BASE_URL}/cancelar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ sessionId })
      });

      console.log("[ImportService] Importação cancelada");

    } catch (error: any) {
      console.error("[ImportService] Erro ao cancelar:", error);
      throw error;
    }
  },

  /**
   * Busca status de importação em andamento
   * 
   * @example
   * const status = await importService.buscarStatus(sessionId);
   * console.log(status.progresso); // 0-100
   */
  async buscarStatus(sessionId: string): Promise<{
    status: string;
    progresso: number;
    mensagem: string;
  }> {
    try {
      const response = await fetch(`${API_BASE_URL}/status/${sessionId}`);

      const result = await handleResponse<{
        status: string;
        progresso: number;
        mensagem: string;
      }>(response);

      return result;

    } catch (error: any) {
      console.error("[ImportService] Erro ao buscar status:", error);
      throw error;
    }
  },

  /**
   * Cria backup antes de importar
   * 
   * @example
   * const backup = await importService.criarBackup();
   * console.log(backup.downloadUrl);
   */
  async criarBackup(): Promise<{
    backupId: string;
    downloadUrl: string;
    timestamp: string;
  }> {
    try {
      console.log("[ImportService] Criando backup...");

      const response = await fetch(`${API_BASE_URL}/backup`, {
        method: "POST"
      });

      const result = await handleResponse<{
        backupId: string;
        downloadUrl: string;
        timestamp: string;
      }>(response);

      console.log("[ImportService] Backup criado:", result.backupId);

      return result;

    } catch (error: any) {
      console.error("[ImportService] Erro ao criar backup:", error);
      throw error;
    }
  }
};

// ============================================================================
// HELPERS PRIVADOS
// ============================================================================

/**
 * Busca dados existentes do usuário para comparação no preview
 */
async function buscarDadosExistentes(): Promise<{
  categorias: any[];
  contas: any[];
  cartoes: any[];
  transacoes: any[];
  faturas?: any[];
  extrato?: any[];
  notificacoes?: any[];
  preferencias?: any[];
}> {
  try {
    const [categorias, contas, cartoes, transacoes] = await Promise.all([
      fetch("/api/categorias").then(r => r.ok ? r.json() : []),
      fetch("/api/contas").then(r => r.ok ? r.json() : []),
      fetch("/api/cartoes").then(r => r.ok ? r.json() : []),
      fetch("/api/transacoes").then(r => r.ok ? r.json() : [])
    ]);

    return {
      categorias,
      contas,
      cartoes,
      transacoes,
      // ✅ Adicionar campos opcionais para evitar erro de indexação
      faturas: [],
      extrato: [],
      notificacoes: [],
      preferencias: []
    };
  } catch (error) {
    console.warn("[ImportService] Erro ao buscar dados existentes:", error);

    return {
      categorias: [],
      contas: [],
      cartoes: [],
      transacoes: [],
      faturas: [],
      extrato: [],
      notificacoes: [],
      preferencias: []
    };
  }
}

// ============================================================================
// EXPORTS ADICIONAIS
// ============================================================================

/**
 * Estratégias disponíveis para conflitos
 */
export const ESTRATEGIAS_CONFLITO: {
  value: EstrategiaConflito;
  label: string;
  description: string;
}[] = [
    {
      value: "skip",
      label: "Pular Duplicados",
      description: "Mantém dados existentes, adiciona apenas novos"
    },
    {
      value: "substituir",
      label: "Substituir Existentes",
      description: "Sobrescreve dados existentes com os importados"
    },
    {
      value: "mesclar",
      label: "Mesclar Dados",
      description: "Adiciona novos e atualiza existentes"
    },
    {
      value: "perguntar",
      label: "Perguntar Sempre",
      description: "Pergunta para cada conflito individualmente"
    }
  ];

/**
 * Mensagens amigáveis para status
 */
export const STATUS_MESSAGES: Record<string, string> = {
  aguardando: "Aguardando arquivo...",
  validando: "Validando dados...",
  preview: "Analisando conflitos...",
  processando: "Importando dados...",
  concluido: "Importação concluída!",
  concluido_parcial: "Importação concluída com avisos",
  erro: "Erro na importação",
  cancelado: "Importação cancelada"
};