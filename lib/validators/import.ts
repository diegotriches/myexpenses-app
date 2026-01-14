// src/lib/validators/import.ts

/**
 * VALIDATORS: IMPORTAÇÃO DE DADOS
 * Validações robustas para arquivos de importação
 */

import type { 
  ExportFile,
  ModuloExport
} from "@/types/export";

import type {
  ImportError,
  ImportSchemaValidation,
  ImportIntegridadeValidation,
  ImportValidationResult,
  ImportPreview,
  ImportModuloPreview,
  ImportConflito,
  TipoConflito,
  EstrategiaConflito
} from "@/types/import";

// ============================================================================
// CONSTANTES
// ============================================================================

const VERSAO_ATUAL = "1.0.0";
const VERSOES_COMPATIVEIS = ["1.0.0", "1.0"];

const TAMANHO_MAX_ARQUIVO = 50 * 1024 * 1024; // 50MB
const MAX_REGISTROS_POR_MODULO = 10000;

const CAMPOS_OBRIGATORIOS_METADATA = [
  "version",
  "exportDate",
  "userId",
  "userName",
  "userEmail",
  "tipo",
  "formato",
  "appName"
];

// ============================================================================
// VALIDAÇÃO DE ARQUIVO
// ============================================================================

/**
 * Valida tamanho do arquivo
 */
export function validarTamanhoArquivo(tamanho: number): ImportError | null {
  if (tamanho > TAMANHO_MAX_ARQUIVO) {
    return {
      severidade: "erro",
      tipo: "valor_invalido",
      modulo: "categorias", // Genérico
      codigo: "ARQUIVO_GRANDE",
      mensagem: `Arquivo muito grande. Máximo permitido: ${formatBytes(TAMANHO_MAX_ARQUIVO)}`,
      valor: formatBytes(tamanho),
      sugestao: "Exporte apenas um período específico ou módulos selecionados"
    };
  }
  return null;
}

/**
 * Valida extensão do arquivo
 */
export function validarExtensaoArquivo(filename: string): ImportError | null {
  const ext = filename.split(".").pop()?.toLowerCase();
  
  if (!ext || !["json", "zip"].includes(ext)) {
    return {
      severidade: "erro",
      tipo: "schema_invalido",
      modulo: "categorias",
      codigo: "EXTENSAO_INVALIDA",
      mensagem: "Formato de arquivo inválido",
      valor: ext,
      sugestao: "Use arquivos .json ou .zip exportados pelo MyExpenses"
    };
  }
  return null;
}

// ============================================================================
// VALIDAÇÃO DE SCHEMA
// ============================================================================

/**
 * Valida estrutura básica do arquivo
 */
export function validarSchema(dados: any): ImportSchemaValidation {
  const erros: ImportError[] = [];
  
  // Verifica se é um objeto válido
  if (!dados || typeof dados !== "object") {
    erros.push({
      severidade: "erro",
      tipo: "schema_invalido",
      modulo: "categorias",
      codigo: "JSON_INVALIDO",
      mensagem: "Arquivo JSON inválido ou corrompido",
      sugestao: "Verifique se o arquivo foi exportado corretamente"
    });
    
    return {
      valido: false,
      compativel: false,
      camposFaltando: [],
      camposExtras: [],
      errosEstrutura: erros
    };
  }
  
  // Verifica campos obrigatórios
  const camposFaltando: string[] = [];
  
  if (!dados.metadata) {
    camposFaltando.push("metadata");
  } else {
    CAMPOS_OBRIGATORIOS_METADATA.forEach(campo => {
      if (!dados.metadata[campo]) {
        camposFaltando.push(`metadata.${campo}`);
      }
    });
  }
  
  if (!dados.statistics) {
    camposFaltando.push("statistics");
  }
  
  if (!dados.data) {
    camposFaltando.push("data");
  }
  
  // Adiciona erros para campos faltando
  camposFaltando.forEach(campo => {
    erros.push({
      severidade: "erro",
      tipo: "campo_obrigatorio",
      modulo: "categorias",
      codigo: "CAMPO_OBRIGATORIO",
      mensagem: `Campo obrigatório ausente: ${campo}`,
      campo,
      sugestao: "Arquivo pode estar corrompido ou incompleto"
    });
  });
  
  // Verifica versão
  const versao = dados.metadata?.version;
  const compativel = versao && VERSOES_COMPATIVEIS.includes(versao);
  
  if (!compativel && versao) {
    erros.push({
      severidade: "aviso",
      tipo: "schema_invalido",
      modulo: "categorias",
      codigo: "VERSAO_INCOMPATIVEL",
      mensagem: `Versão do arquivo (${versao}) pode ser incompatível com a atual (${VERSAO_ATUAL})`,
      valor: versao,
      sugestao: "Importação pode falhar ou ter resultados inesperados"
    });
  }
  
  return {
    valido: erros.filter(e => e.severidade === "erro").length === 0,
    versao,
    compativel: compativel || false,
    camposFaltando,
    camposExtras: [],
    errosEstrutura: erros
  };
}

// ============================================================================
// VALIDAÇÃO DE INTEGRIDADE
// ============================================================================

/**
 * Valida integridade dos dados
 */
export function validarIntegridade(dados: ExportFile): ImportIntegridadeValidation {
  const fksInvalidas: ImportError[] = [];
  const valoresInvalidos: ImportError[] = [];
  const tiposInvalidos: ImportError[] = [];
  
  // Valida cada módulo
  const modulos: ModuloExport[] = Object.keys(dados.data) as ModuloExport[];
  
  modulos.forEach(modulo => {
    const registros = dados.data[modulo as keyof typeof dados.data];
    if (!registros || !Array.isArray(registros)) return;
    
    // Valida quantidade de registros
    if (registros.length > MAX_REGISTROS_POR_MODULO) {
      valoresInvalidos.push({
        severidade: "erro",
        tipo: "valor_invalido",
        modulo,
        codigo: "MUITOS_REGISTROS",
        mensagem: `Muitos registros em ${modulo}: ${registros.length}`,
        valor: registros.length,
        sugestao: `Máximo permitido: ${MAX_REGISTROS_POR_MODULO} registros por módulo`
      });
    }
    
    // Valida cada registro
    registros.forEach((registro, index) => {
      // ✅ CORREÇÃO: Cast para permitir indexação dinâmica
      const registroAny = registro as Record<string, any>;
      
      // Valida campos obrigatórios por módulo
      const camposObrigatorios = getCamposObrigatorios(modulo);
      camposObrigatorios.forEach(campo => {
        if (!(campo in registroAny) || registroAny[campo] === null || registroAny[campo] === undefined) {
          valoresInvalidos.push({
            severidade: "erro",
            tipo: "campo_obrigatorio",
            modulo,
            codigo: "CAMPO_OBRIGATORIO",
            mensagem: `Campo obrigatório ausente em ${modulo}[${index}]: ${campo}`,
            campo,
            indice: index,
            // ✅ CORREÇÃO: Converter ID para string
            registroId: registroAny.id ? String(registroAny.id) : undefined
          });
        }
      });
      
      // Valida tipos de dados
      const errosTipo = validarTiposDados(modulo, registro, index);
      tiposInvalidos.push(...errosTipo);
    });
  });
  
  // Valida Foreign Keys
  const errosFk = validarForeignKeys(dados);
  fksInvalidas.push(...errosFk);
  
  return {
    valida: fksInvalidas.length === 0 && 
            valoresInvalidos.filter(e => e.severidade === "erro").length === 0 &&
            tiposInvalidos.filter(e => e.severidade === "erro").length === 0,
    fksInvalidas,
    valoresInvalidos,
    tiposInvalidos
  };
}

/**
 * Retorna campos obrigatórios por módulo
 */
function getCamposObrigatorios(modulo: ModuloExport): string[] {
  const campos: Record<ModuloExport, string[]> = {
    categorias: ["nome", "tipo", "icone"],
    contas: ["nome", "tipo", "saldo"],
    cartoes: ["nome", "bandeira", "limite"],
    transacoes: ["descricao", "valor", "data", "tipo"],
    faturas: ["cartaoId", "mesReferencia", "anoReferencia"],
    extrato: ["contaId", "data"],
    notificacoes: ["tipo", "titulo", "mensagem"],
    preferencias: ["userId"]
  };
  
  return campos[modulo] || [];
}

/**
 * Valida tipos de dados de um registro
 */
function validarTiposDados(
  modulo: ModuloExport, 
  registro: any, 
  index: number
): ImportError[] {
  const erros: ImportError[] = [];
  
  // ✅ CORREÇÃO: Cast para acesso seguro
  const reg = registro as Record<string, any>;
  
  // Validações específicas por módulo
  switch (modulo) {
    case "transacoes":
      if (typeof reg.valor !== "number") {
        erros.push({
          severidade: "erro",
          tipo: "tipo_invalido",
          modulo,
          codigo: "TIPO_INVALIDO",
          mensagem: `Valor deve ser número em ${modulo}[${index}]`,
          campo: "valor",
          valor: reg.valor,
          indice: index,
          // ✅ CORREÇÃO: Converter ID para string
          registroId: reg.id ? String(reg.id) : undefined
        });
      }
      
      if (!["receita", "despesa"].includes(reg.tipo)) {
        erros.push({
          severidade: "erro",
          tipo: "valor_invalido",
          modulo,
          codigo: "VALOR_INVALIDO",
          mensagem: `Tipo inválido em ${modulo}[${index}]: ${reg.tipo}`,
          campo: "tipo",
          valor: reg.tipo,
          indice: index,
          registroId: reg.id ? String(reg.id) : undefined,
          sugestao: "Tipo deve ser 'receita' ou 'despesa'"
        });
      }
      break;
      
    case "contas":
      if (typeof reg.saldo !== "number") {
        erros.push({
          severidade: "erro",
          tipo: "tipo_invalido",
          modulo,
          codigo: "TIPO_INVALIDO",
          mensagem: `Saldo deve ser número em ${modulo}[${index}]`,
          campo: "saldo",
          valor: reg.saldo,
          indice: index,
          registroId: reg.id ? String(reg.id) : undefined
        });
      }
      break;
      
    case "cartoes":
      if (typeof reg.limite !== "number") {
        erros.push({
          severidade: "erro",
          tipo: "tipo_invalido",
          modulo,
          codigo: "TIPO_INVALIDO",
          mensagem: `Limite deve ser número em ${modulo}[${index}]`,
          campo: "limite",
          valor: reg.limite,
          indice: index,
          registroId: reg.id ? String(reg.id) : undefined
        });
      }
      break;
  }
  
  return erros;
}

/**
 * Valida Foreign Keys entre módulos
 */
function validarForeignKeys(dados: ExportFile): ImportError[] {
  const erros: ImportError[] = [];
  
  // IDs válidos por módulo
  const idsValidos = {
    categorias: new Set(dados.data.categorias?.map(c => c.id) || []),
    contas: new Set(dados.data.contas?.map(c => c.id) || []),
    cartoes: new Set(dados.data.cartoes?.map(c => c.id) || [])
  };
  
  // Valida transações
  dados.data.transacoes?.forEach((transacao, index) => {
    // ✅ CORREÇÃO: Remover validação de categoriaId (campo não existe)
    // Transacao usa 'categoria' (string do nome), não 'categoriaId' (FK)
    
    if (transacao.contaId && !idsValidos.contas.has(transacao.contaId)) {
      erros.push({
        severidade: "erro",
        tipo: "fk_invalida",
        modulo: "transacoes",
        codigo: "FK_INVALIDA",
        mensagem: `Conta não encontrada em transacoes[${index}]`,
        campo: "contaId",
        valor: transacao.contaId,
        indice: index,
        // ✅ CORREÇÃO: Converter ID para string
        registroId: String(transacao.id),
        sugestao: "Conta referenciada não existe no arquivo"
      });
    }
    
    if (transacao.cartaoId && !idsValidos.cartoes.has(transacao.cartaoId)) {
      erros.push({
        severidade: "erro",
        tipo: "fk_invalida",
        modulo: "transacoes",
        codigo: "FK_INVALIDA",
        mensagem: `Cartão não encontrado em transacoes[${index}]`,
        campo: "cartaoId",
        // ✅ CORREÇÃO: cartaoId é number, converter para string
        valor: String(transacao.cartaoId),
        indice: index,
        registroId: String(transacao.id),
        sugestao: "Cartão referenciado não existe no arquivo"
      });
    }
  });
  
  // Valida faturas
  dados.data.faturas?.forEach((fatura, index) => {
    if (!idsValidos.cartoes.has(fatura.cartaoId)) {
      erros.push({
        severidade: "erro",
        tipo: "fk_invalida",
        modulo: "faturas",
        codigo: "FK_INVALIDA",
        mensagem: `Cartão não encontrado em faturas[${index}]`,
        campo: "cartaoId",
        // ✅ CORREÇÃO: cartaoId é number, converter para string
        valor: String(fatura.cartaoId),
        indice: index,
        registroId: String(fatura.id),
        sugestao: "Cartão referenciado não existe no arquivo"
      });
    }
  });
  
  return erros;
}

// ============================================================================
// VALIDAÇÃO COMPLETA
// ============================================================================

/**
 * Executa validação completa do arquivo
 */
export async function validarArquivoImport(
  dados: ExportFile,
  dadosExistentes?: {
    categorias: any[];
    contas: any[];
    cartoes: any[];
    transacoes: any[];
    // ✅ CORREÇÃO: Adicionar todos os módulos para evitar erro de indexação
    faturas?: any[];
    extrato?: any[];
    notificacoes?: any[];
    preferencias?: any[];
  }
): Promise<ImportValidationResult> {
  
  // 1. Valida schema
  const schema = validarSchema(dados);
  
  // 2. Valida integridade
  const integridade = validarIntegridade(dados);
  
  // 3. Gera preview (detecta conflitos)
  const preview = await gerarPreview(dados, dadosExistentes);
  
  // 4. Coleta erros críticos
  const errosCriticos: ImportError[] = [
    ...schema.errosEstrutura.filter(e => e.severidade === "erro"),
    ...integridade.fksInvalidas.filter(e => e.severidade === "erro"),
    ...integridade.valoresInvalidos.filter(e => e.severidade === "erro"),
    ...integridade.tiposInvalidos.filter(e => e.severidade === "erro")
  ];
  
  // 5. Coleta avisos
  const avisos: ImportError[] = [
    ...schema.errosEstrutura.filter(e => e.severidade === "aviso"),
    ...preview.erros.filter(e => e.severidade === "aviso")
  ];
  
  return {
    valido: schema.valido && integridade.valida,
    schema,
    integridade,
    preview,
    errosCriticos,
    avisos,
    podeProsseguir: errosCriticos.length === 0
  };
}

// ============================================================================
// PREVIEW E CONFLITOS
// ============================================================================

/**
 * Gera preview da importação detectando conflitos
 */
async function gerarPreview(
  dados: ExportFile,
  dadosExistentes?: {
    categorias: any[];
    contas: any[];
    cartoes: any[];
    transacoes: any[];
    faturas?: any[];
    extrato?: any[];
    notificacoes?: any[];
    preferencias?: any[];
  }
): Promise<ImportPreview> {
  
  const modulos: ModuloExport[] = Object.keys(dados.data) as ModuloExport[];
  const detalhes: Record<string, ImportModuloPreview> = {};
  
  let totalNovos = 0;
  let totalDuplicados = 0;
  let totalConflitos = 0;
  let totalInvalidos = 0;
  let totalRegistros = 0;
  
  for (const modulo of modulos) {
    const registros = dados.data[modulo as keyof typeof dados.data] || [];
    const existentes = dadosExistentes?.[modulo as keyof typeof dadosExistentes] || [];
    
    const preview = detectarConflitosModulo(
      modulo,
      registros,
      existentes
    );
    
    detalhes[modulo] = preview;
    
    totalNovos += preview.novos;
    totalDuplicados += preview.duplicados;
    totalConflitos += preview.conflitos;
    totalInvalidos += preview.invalidos;
    totalRegistros += preview.total;
  }
  
  return {
    valido: totalInvalidos === 0,
    modulos,
    detalhes: detalhes as Record<ModuloExport, ImportModuloPreview>,
    resumo: {
      totalRegistros,
      novos: totalNovos,
      duplicados: totalDuplicados,
      conflitos: totalConflitos,
      invalidos: totalInvalidos
    },
    erros: [],
    estrategiaPadrao: "skip",
    tempoEstimado: estimarTempo(totalRegistros)
  };
}

/**
 * Detecta conflitos em um módulo específico
 */
function detectarConflitosModulo(
  modulo: ModuloExport,
  registrosImport: any[],
  registrosExistentes: any[]
): ImportModuloPreview {
  
  const conflitos: ImportConflito[] = [];
  let novos = 0;
  let duplicados = 0;
  let invalidos = 0;
  
  // Cria índice de existentes por nome (simplificado)
  const indexExistentes = new Map(
    registrosExistentes.map(r => [r.nome?.toLowerCase(), r])
  );
  
  registrosImport.forEach(registro => {
    // Verifica duplicata por nome
    const existente = indexExistentes.get(registro.nome?.toLowerCase());
    
    if (existente) {
      duplicados++;
      conflitos.push({
        tipo: "duplicado",
        modulo,
        existente,
        importado: registro,
        campoConflito: "nome",
        estrategiaSugerida: "skip",
        resolucaoAutomatica: true
      });
    } else {
      novos++;
    }
  });
  
  return {
    modulo,
    total: registrosImport.length,
    novos,
    duplicados,
    conflitos: conflitos.length,
    invalidos,
    listaConflitos: conflitos,
    amostraNovos: registrosImport.slice(0, 5),
    amostraDuplicados: conflitos.slice(0, 5).map(c => c.existente)
  };
}

/**
 * Estima tempo de importação em segundos
 */
function estimarTempo(totalRegistros: number): number {
  // Aproximadamente 100 registros por segundo
  return Math.ceil(totalRegistros / 100);
}

// ============================================================================
// HELPERS
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