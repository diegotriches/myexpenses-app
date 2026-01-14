// src/types/import.ts

/**
 * TYPES: IMPORTAÇÃO DE DADOS
 * Tipos TypeScript para validação, preview e processamento de importação
 */

import type { ExportFile, ModuloExport } from "@/types/export";

// ============================================================================
// ENUMS E TIPOS AUXILIARES
// ============================================================================

/**
 * Estratégias de resolução de conflitos na importação
 */
export type EstrategiaConflito = 
  | "skip"         // Pula duplicados, mantém existentes
  | "substituir"   // Substitui existentes por importados
  | "mesclar"      // Adiciona novos, mantém existentes
  | "perguntar";   // Usuário decide caso a caso

/**
 * Status do processo de importação
 */
export type StatusImport = 
  | "aguardando"      // Aguardando upload
  | "validando"       // Validando arquivo
  | "preview"         // Mostrando preview
  | "processando"     // Importando dados
  | "concluido"       // Concluído com sucesso
  | "concluido_parcial" // Concluído com erros/avisos
  | "erro"            // Erro fatal
  | "cancelado";      // Cancelado pelo usuário

/**
 * Severidade de erros/avisos
 */
export type SeveridadeErro = "erro" | "aviso" | "info";

/**
 * Tipo de conflito detectado
 */
export type TipoConflito = 
  | "duplicado"       // Registro já existe (nome/ID igual)
  | "fk_invalida"     // Foreign Key inválida
  | "tipo_invalido"   // Tipo de dado inválido
  | "valor_invalido"  // Valor fora dos limites
  | "campo_obrigatorio" // Campo obrigatório faltando
  | "schema_invalido";  // Estrutura JSON inválida

// ============================================================================
// ERROS E AVISOS
// ============================================================================

/**
 * Erro ou aviso de validação
 */
export interface ImportError {
  /** Severidade do problema */
  severidade: SeveridadeErro;
  
  /** Tipo de conflito */
  tipo: TipoConflito;
  
  /** Módulo afetado */
  modulo: ModuloExport;
  
  /** Código do erro (para i18n) */
  codigo: string;
  
  /** Mensagem descritiva */
  mensagem: string;
  
  /** Campo afetado (se aplicável) */
  campo?: string;
  
  /** Valor problemático (se aplicável) */
  valor?: any;
  
  /** Index do registro no array (se aplicável) */
  indice?: number;
  
  /** ID do registro (se aplicável) */
  registroId?: string;
  
  /** Sugestão de correção */
  sugestao?: string;
}

// ============================================================================
// CONFLITOS DETECTADOS
// ============================================================================

/**
 * Conflito detectado entre dados importados e existentes
 */
export interface ImportConflito {
  /** Tipo de conflito */
  tipo: TipoConflito;
  
  /** Módulo afetado */
  modulo: ModuloExport;
  
  /** Registro existente no banco */
  existente: any;
  
  /** Registro importado do arquivo */
  importado: any;
  
  /** Campo usado para detectar duplicata (ex: "nome", "id") */
  campoConflito: string;
  
  /** Estratégia sugerida */
  estrategiaSugerida: EstrategiaConflito;
  
  /** Pode ser resolvido automaticamente? */
  resolucaoAutomatica: boolean;
}

// ============================================================================
// PREVIEW DA IMPORTAÇÃO
// ============================================================================

/**
 * Preview de um módulo específico
 */
export interface ImportModuloPreview {
  /** Nome do módulo */
  modulo: ModuloExport;
  
  /** Total de registros no arquivo */
  total: number;
  
  /** Registros novos (serão adicionados) */
  novos: number;
  
  /** Registros duplicados (já existem) */
  duplicados: number;
  
  /** Registros com conflitos */
  conflitos: number;
  
  /** Registros inválidos (erros) */
  invalidos: number;
  
  /** Lista de conflitos detectados */
  listaConflitos: ImportConflito[];
  
  /** Amostra de registros novos (primeiros 5) */
  amostraNovos: any[];
  
  /** Amostra de duplicados (primeiros 5) */
  amostraDuplicados: any[];
}

/**
 * Preview completo da importação
 */
export interface ImportPreview {
  /** Válido para importar? */
  valido: boolean;
  
  /** Módulos incluídos no arquivo */
  modulos: ModuloExport[];
  
  /** Preview por módulo */
  detalhes: Record<ModuloExport, ImportModuloPreview>;
  
  /** Resumo geral */
  resumo: {
    totalRegistros: number;
    novos: number;
    duplicados: number;
    conflitos: number;
    invalidos: number;
  };
  
  /** Erros e avisos gerais */
  erros: ImportError[];
  
  /** Estratégia padrão para conflitos */
  estrategiaPadrao: EstrategiaConflito;
  
  /** Tempo estimado de importação (segundos) */
  tempoEstimado: number;
}

// ============================================================================
// VALIDAÇÃO DO ARQUIVO
// ============================================================================

/**
 * Resultado da validação de schema
 */
export interface ImportSchemaValidation {
  /** Schema válido? */
  valido: boolean;
  
  /** Versão do formato detectada */
  versao?: string;
  
  /** Compatível com a versão atual? */
  compativel: boolean;
  
  /** Campos obrigatórios faltando */
  camposFaltando: string[];
  
  /** Campos desconhecidos (extras) */
  camposExtras: string[];
  
  /** Erros de estrutura */
  errosEstrutura: ImportError[];
}

/**
 * Resultado da validação de integridade
 */
export interface ImportIntegridadeValidation {
  /** Integridade válida? */
  valida: boolean;
  
  /** Foreign Keys inválidas */
  fksInvalidas: ImportError[];
  
  /** Valores fora dos limites */
  valoresInvalidos: ImportError[];
  
  /** Tipos incompatíveis */
  tiposInvalidos: ImportError[];
  
  /** Checksum válido? (se disponível) */
  checksumValido?: boolean;
}

/**
 * Resultado completo da validação
 */
export interface ImportValidationResult {
  /** Validação passou? */
  valido: boolean;
  
  /** Validação de schema */
  schema: ImportSchemaValidation;
  
  /** Validação de integridade */
  integridade: ImportIntegridadeValidation;
  
  /** Preview da importação */
  preview: ImportPreview;
  
  /** Erros críticos (bloqueiam importação) */
  errosCriticos: ImportError[];
  
  /** Avisos (não bloqueiam) */
  avisos: ImportError[];
  
  /** Pode prosseguir com importação? */
  podeProsseguir: boolean;
}

// ============================================================================
// PROCESSAMENTO DA IMPORTAÇÃO
// ============================================================================

/**
 * Resultado da importação de um módulo
 */
export interface ImportModuloResult {
  /** Módulo processado */
  modulo: ModuloExport;
  
  /** Sucesso total? */
  sucesso: boolean;
  
  /** Total de registros processados */
  total: number;
  
  /** Registros importados com sucesso */
  importados: number;
  
  /** Registros pulados (skip) */
  pulados: number;
  
  /** Registros com erro */
  erros: number;
  
  /** Lista de erros */
  listaErros: ImportError[];
  
  /** IDs dos registros criados */
  idsCriados: string[];
  
  /** IDs dos registros atualizados */
  idsAtualizados: string[];
  
  /** IDs dos registros pulados */
  idsPulados: string[];
  
  /** Duração do processamento (ms) */
  duracao: number;
}

/**
 * Resultado completo da importação
 */
export interface ImportResult {
  /** Sucesso total? */
  sucesso: boolean;
  
  /** Status final */
  status: StatusImport;
  
  /** Módulos processados */
  modulos: ModuloExport[];
  
  /** Resultado por módulo */
  detalhes: Record<ModuloExport, ImportModuloResult>;
  
  /** Resumo geral */
  resumo: {
    totalRegistros: number;
    importados: number;
    pulados: number;
    erros: number;
  };
  
  /** Erros fatais (causaram rollback) */
  errosFatais: ImportError[];
  
  /** Rollback executado? */
  rollback: boolean;
  
  /** Módulos com rollback */
  modulosRollback: ModuloExport[];
  
  /** Timestamp de início */
  iniciadoEm: string;
  
  /** Timestamp de conclusão */
  concluidoEm: string;
  
  /** Duração total (ms) */
  duracaoTotal: number;
}

// ============================================================================
// DTOs - REQUISIÇÕES
// ============================================================================

/**
 * DTO para upload do arquivo
 */
export interface ImportUploadDTO {
  /** Arquivo (FormData) */
  file: File;
  
  /** Criptografado? */
  encrypted?: boolean;
  
  /** Senha para descriptografar (se encrypted) */
  senha?: string;
}

/**
 * DTO para validar arquivo
 */
export interface ImportValidarDTO {
  /** Dados do arquivo já parseados */
  dados: ExportFile;
  
  /** Estratégia padrão para conflitos */
  estrategiaPadrao?: EstrategiaConflito;
  
  /** Modo dry-run? (não salva, apenas simula) */
  dryRun?: boolean;
}

/**
 * DTO para processar importação
 */
export interface ImportProcessarDTO {
  /** Dados validados para importar */
  dados: ExportFile;
  
  /** Estratégia para conflitos */
  estrategiaConflito: EstrategiaConflito;
  
  /** Módulos específicos para importar (opcional) */
  modulosSelecionados?: ModuloExport[];
  
  /** Resoluções manuais de conflitos (se estratégia = "perguntar") */
  resolucoesConflitos?: Record<string, EstrategiaConflito>;
  
  /** Criar backup antes de importar? */
  criarBackup?: boolean;
}

// ============================================================================
// DTOs - RESPOSTAS
// ============================================================================

/**
 * Resposta de upload bem-sucedido
 */
export interface ImportUploadResponse {
  /** Mensagem de sucesso */
  message: string;
  
  /** ID temporário do arquivo (para próximas requisições) */
  fileId: string;
  
  /** Dados parseados do arquivo */
  dados: ExportFile;
  
  /** Tamanho do arquivo (bytes) */
  tamanho: number;
  
  /** Timestamp do upload */
  timestamp: string;
}

/**
 * Resposta de validação
 */
export interface ImportValidarResponse {
  /** Resultado da validação */
  validacao: ImportValidationResult;
  
  /** ID da sessão de importação */
  sessionId: string;
  
  /** Timestamp da validação */
  timestamp: string;
}

/**
 * Resposta de processamento
 */
export interface ImportProcessarResponse {
  /** Resultado da importação */
  resultado: ImportResult;
  
  /** URL do backup criado (se criarBackup=true) */
  backupUrl?: string;
  
  /** Timestamp do processamento */
  timestamp: string;
}

/**
 * Resposta de erro
 */
export interface ImportErrorResponse {
  /** Mensagem de erro */
  error: string;
  
  /** Detalhes técnicos */
  details?: string;
  
  /** Erros específicos */
  erros?: ImportError[];
  
  /** Timestamp do erro */
  timestamp: string;
}

// ============================================================================
// CONFIGURAÇÕES DE IMPORTAÇÃO
// ============================================================================

/**
 * Configurações padrão de importação
 */
export interface ImportConfig {
  /** Estratégia padrão para conflitos */
  estrategiaPadrao: EstrategiaConflito;
  
  /** Tamanho máximo do arquivo (bytes) */
  tamanhoMaximo: number;
  
  /** Timeout de processamento (ms) */
  timeout: number;
  
  /** Permitir importação de arquivos criptografados? */
  permitirCriptografia: boolean;
  
  /** Validar checksum? */
  validarChecksum: boolean;
  
  /** Criar backup automático antes de importar? */
  backupAutomatico: boolean;
  
  /** Rollback automático em caso de erro? */
  rollbackAutomatico: boolean;
  
  /** Preview obrigatório? */
  previewObrigatorio: boolean;
  
  /** Máximo de registros por módulo */
  maxRegistrosPorModulo: number;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Valida se uma estratégia é válida
 */
export function isEstrategiaConflito(estrategia: string): estrategia is EstrategiaConflito {
  const estrategias: EstrategiaConflito[] = ["skip", "substituir", "mesclar", "perguntar"];
  return estrategias.includes(estrategia as EstrategiaConflito);
}

/**
 * Valida se um status é válido
 */
export function isStatusImport(status: string): status is StatusImport {
  const statuses: StatusImport[] = [
    "aguardando",
    "validando",
    "preview",
    "processando",
    "concluido",
    "concluido_parcial",
    "erro",
    "cancelado"
  ];
  return statuses.includes(status as StatusImport);
}

/**
 * Obtém cor do status para UI
 */
export function getStatusColor(status: StatusImport): string {
  const colors: Record<StatusImport, string> = {
    aguardando: "gray",
    validando: "blue",
    preview: "yellow",
    processando: "blue",
    concluido: "green",
    concluido_parcial: "yellow",
    erro: "red",
    cancelado: "gray"
  };
  return colors[status];
}

/**
 * Obtém ícone do status para UI
 */
export function getStatusIcon(status: StatusImport): string {
  const icons: Record<StatusImport, string> = {
    aguardando: "clock",
    validando: "search",
    preview: "eye",
    processando: "loader",
    concluido: "check-circle",
    concluido_parcial: "alert-circle",
    erro: "x-circle",
    cancelado: "x"
  };
  return icons[status];
}

/**
 * Calcula porcentagem de sucesso
 */
export function calcularTaxaSucesso(resultado: ImportResult): number {
  const { totalRegistros, importados } = resultado.resumo;
  if (totalRegistros === 0) return 0;
  return Math.round((importados / totalRegistros) * 100);
}

/**
 * Verifica se há erros críticos
 */
export function hasErrosCriticos(validacao: ImportValidationResult): boolean {
  return validacao.errosCriticos.length > 0;
}

/**
 * Conta total de conflitos
 */
export function contarConflitos(preview: ImportPreview): number {
  return Object.values(preview.detalhes).reduce(
    (sum, modulo) => sum + modulo.conflitos,
    0
  );
}