// src/types/export.ts

/**
 * TYPES: EXPORTAÇÃO DE DADOS
 * Tipos TypeScript para exportação completa e seletiva de dados do usuário
 */

import type { 
  Conta, 
  Cartao, 
  Categoria, 
  Fatura,
  ExtratoConta,
  Notificacao,
  Transacao, 
  PreferenciasNotificacao
} from "@/types";

// ============================================================================
// ENUMS E TIPOS AUXILIARES
// ============================================================================

/**
 * Tipos de exportação disponíveis
 */
export type TipoExport = "completo" | "seletivo" | "periodo";

/**
 * Módulos disponíveis para exportação seletiva
 * IMPORTANTE: Estes valores devem corresponder EXATAMENTE às chaves de ExportData
 */
export type ModuloExport = 
  | "categorias"
  | "contas"
  | "cartoes"
  | "transacoes"
  | "faturas"
  | "extrato"
  | "notificacoes"
  | "preferencias";

/**
 * Formatos de arquivo para exportação
 */
export type FormatoExport = "json" | "csv" | "zip";

/**
 * Status do processo de exportação
 */
export type StatusExport = 
  | "aguardando"
  | "processando"
  | "concluido"
  | "erro"
  | "cancelado";

// ============================================================================
// METADATA
// ============================================================================

/**
 * Metadados da exportação
 */
export interface ExportMetadata {
  /** Versão do formato de exportação */
  version: string;
  
  /** Data/hora da exportação (ISO 8601) */
  exportDate: string;
  
  /** ID do usuário */
  userId: string;
  
  /** Nome do usuário */
  userName: string;
  
  /** Email do usuário */
  userEmail: string;
  
  /** Tipo de exportação */
  tipo: TipoExport;
  
  /** Módulos incluídos (se seletivo) */
  modulos?: ModuloExport[];
  
  /** Período da exportação (se por período) */
  periodo?: {
    inicio: string; // ISO 8601
    fim: string;    // ISO 8601
  };
  
  /** Formato do arquivo */
  formato: FormatoExport;
  
  /** Criptografado? */
  encrypted: boolean;
  
  /** App info */
  appName: string;
  appVersion: string;
  appUrl: string;
}

// ============================================================================
// ESTATÍSTICAS
// ============================================================================

/**
 * Estatísticas dos dados exportados
 */
export interface ExportStatistics {
  /** Total de categorias */
  categorias: number;
  
  /** Total de contas */
  contas: number;
  
  /** Total de cartões */
  cartoes: number;
  
  /** Total de transações */
  transacoes: number;
  
  /** Total de faturas */
  faturas: number;
  
  /** Total de extratos */
  extrato: number;
  
  /** Total de notificações */
  notificacoes: number;
  
  /** Total de preferências */
  preferencias: number;
  
  /** Tamanho total (bytes) */
  tamanhoBytes: number;
  
  /** Tamanho formatado (ex: "2.5 MB") */
  tamanhoFormatado: string;
}

// ============================================================================
// DADOS EXPORTADOS
// ============================================================================

/**
 * Estrutura de dados exportados
 * IMPORTANTE: As chaves devem corresponder EXATAMENTE aos valores de ModuloExport
 */
export interface ExportData {
  /** Categorias do usuário */
  categorias?: Categoria[];
  
  /** Contas do usuário */
  contas?: Conta[];
  
  /** Cartões do usuário */
  cartoes?: Cartao[];
  
  /** Transações do usuário */
  transacoes?: Transacao[];
  
  /** Faturas dos cartões */
  faturas?: Fatura[];
  
  /** Extratos das contas (nome alinhado com ModuloExport: "extrato") */
  extrato?: ExtratoConta[];
  
  /** Notificações do usuário */
  notificacoes?: Notificacao[];
  
  /** Preferências de notificação (nome alinhado com ModuloExport: "preferencias") */
  preferencias?: PreferenciasNotificacao[];
}

/**
 * Type helper para garantir que ModuloExport pode indexar ExportData
 * Isso força o TypeScript a aceitar a indexação: dados.data[modulo]
 */
export type ExportDataKey = keyof ExportData;

/**
 * Valida em compile-time que ModuloExport e ExportData estão alinhados
 * Se houver erro de compilação aqui, significa que há inconsistência entre os tipos
 */
type _ValidateModuloExportAlignment = {
  [K in ModuloExport]: K extends ExportDataKey ? true : never;
};

// ============================================================================
// ESTRUTURA COMPLETA DO EXPORT
// ============================================================================

/**
 * Estrutura completa do arquivo de exportação
 */
export interface ExportFile {
  /** Metadados da exportação */
  metadata: ExportMetadata;
  
  /** Estatísticas dos dados */
  statistics: ExportStatistics;
  
  /** Dados exportados */
  data: ExportData;
  
  /** Checksum para validação de integridade (opcional) */
  checksum?: string;
}

// ============================================================================
// DTOs - REQUISIÇÕES
// ============================================================================

/**
 * DTO para solicitar exportação completa
 */
export interface ExportCompletoDTO {
  /** Formato desejado */
  formato?: FormatoExport;
  
  /** Criptografar arquivo? */
  encrypted?: boolean;
  
  /** Senha para criptografia (se encrypted=true) */
  senha?: string;
}

/**
 * DTO para solicitar exportação seletiva
 */
export interface ExportSeletivoDTO {
  /** Módulos a exportar */
  modulos: ModuloExport[];
  
  /** Formato desejado */
  formato?: FormatoExport;
  
  /** Criptografar arquivo? */
  encrypted?: boolean;
  
  /** Senha para criptografia (se encrypted=true) */
  senha?: string;
}

/**
 * DTO para solicitar exportação por período
 */
export interface ExportPeriodoDTO {
  /** Data de início (ISO 8601) */
  inicio: string;
  
  /** Data de fim (ISO 8601) */
  fim: string;
  
  /** Módulos a exportar (opcional, padrão: todos) */
  modulos?: ModuloExport[];
  
  /** Formato desejado */
  formato?: FormatoExport;
  
  /** Criptografar arquivo? */
  encrypted?: boolean;
  
  /** Senha para criptografia (se encrypted=true) */
  senha?: string;
}

// ============================================================================
// DTOs - RESPOSTAS
// ============================================================================

/**
 * Resposta de sucesso na exportação
 */
export interface ExportSuccessResponse {
  /** Mensagem de sucesso */
  message: string;
  
  /** URL para download (se disponível) */
  downloadUrl?: string;
  
  /** Nome do arquivo gerado */
  filename: string;
  
  /** Estatísticas da exportação */
  statistics: ExportStatistics;
  
  /** Timestamp da exportação */
  timestamp: string;
}

/**
 * Resposta de erro na exportação
 */
export interface ExportErrorResponse {
  /** Mensagem de erro */
  error: string;
  
  /** Detalhes técnicos (desenvolvimento) */
  details?: string;
  
  /** Timestamp do erro */
  timestamp: string;
}

// ============================================================================
// HISTÓRICO DE EXPORTAÇÕES
// ============================================================================

/**
 * Registro de exportação no histórico
 */
export interface ExportHistoryItem {
  /** ID único da exportação */
  id: string;
  
  /** ID do usuário */
  userId: string;
  
  /** Tipo de exportação */
  tipo: TipoExport;
  
  /** Módulos exportados */
  modulos?: ModuloExport[];
  
  /** Período exportado */
  periodo?: {
    inicio: string;
    fim: string;
  };
  
  /** Formato do arquivo */
  formato: FormatoExport;
  
  /** Status da exportação */
  status: StatusExport;
  
  /** Nome do arquivo gerado */
  filename?: string;
  
  /** Tamanho do arquivo (bytes) */
  tamanho?: number;
  
  /** Estatísticas */
  statistics?: ExportStatistics;
  
  /** Erro (se houver) */
  error?: string;
  
  /** Data/hora da criação */
  createdAt: string;
  
  /** Data/hora da conclusão */
  completedAt?: string;
  
  /** Duração (ms) */
  duracao?: number;
}

// ============================================================================
// CONFIGURAÇÕES DE EXPORTAÇÃO
// ============================================================================

/**
 * Configurações padrão de exportação
 */
export interface ExportConfig {
  /** Formato padrão */
  formatoPadrao: FormatoExport;
  
  /** Máximo de exportações por dia */
  maxExportsPorDia: number;
  
  /** Tamanho máximo do arquivo (bytes) */
  tamanhoMaximo: number;
  
  /** Retenção do histórico (dias) */
  retencaoHistorico: number;
  
  /** Permitir criptografia? */
  permitirCriptografia: boolean;
  
  /** Incluir metadados sempre? */
  incluirMetadata: boolean;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Valida se um módulo é válido para exportação
 */
export function isModuloExportValido(modulo: string): modulo is ModuloExport {
  const modulos: ModuloExport[] = [
    "categorias",
    "contas",
    "cartoes",
    "transacoes",
    "faturas",
    "extrato",
    "notificacoes",
    "preferencias"
  ];
  return modulos.includes(modulo as ModuloExport);
}

/**
 * Valida se um formato é válido para exportação
 */
export function isFormatoExportValido(formato: string): formato is FormatoExport {
  const formatos: FormatoExport[] = ["json", "csv", "zip"];
  return formatos.includes(formato as FormatoExport);
}

/**
 * Valida se um tipo de export é válido
 */
export function isTipoExportValido(tipo: string): tipo is TipoExport {
  const tipos: TipoExport[] = ["completo", "seletivo", "periodo"];
  return tipos.includes(tipo as TipoExport);
}

/**
 * Formata tamanho em bytes para string legível
 */
export function formatarTamanho(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Gera nome de arquivo para exportação
 */
export function gerarNomeArquivo(
  tipo: TipoExport,
  formato: FormatoExport,
  timestamp?: string
): string {
  const date = timestamp ? new Date(timestamp) : new Date();
  const dateStr = date.toISOString().split("T")[0];
  const timeStr = date.toTimeString().split(" ")[0].replace(/:/g, "-");
  
  return `myexpenses-${tipo}-${dateStr}-${timeStr}.${formato}`;
}

/**
 * Helper para acessar dados de módulo com type safety
 * Resolve o problema de indexação: dados.data[modulo]
 */
export function getModuloData(dados: ExportFile, modulo: ModuloExport): any[] {
  const data = dados.data[modulo as keyof ExportData];
  return Array.isArray(data) ? data : [];
}