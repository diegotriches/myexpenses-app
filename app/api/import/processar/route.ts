// src/app/api/import/processar/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { db } from "@/db";
import {
  categorias,
  contas,
  cartoes,
  transacoes,
  faturas,
  extratoConta,
  notificacoes,
  preferenciasNotificacao,
  preferences
} from "@/db/schema";
import { eq } from "drizzle-orm";
import type { ExportFile, ModuloExport } from "@/types/export";
import type {
  ImportProcessarDTO,
  ImportProcessarResponse,
  ImportResult,
  ImportModuloResult,
  EstrategiaConflito
} from "@/types/import";

/**
 * POST /api/import/processar
 * Processa importação dos dados com estratégia de conflito
 * 
 * Body:
 * {
 *   dados: ExportFile,
 *   estrategiaConflito: "skip" | "substituir" | "mesclar",
 *   modulosSelecionados?: ModuloExport[],
 *   criarBackup?: boolean
 * }
 */
export async function POST(req: NextRequest) {
  const inicioTotal = Date.now();
  
  try {
    // 1. Autenticação
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json(
        { error: "Não autenticado", timestamp: new Date().toISOString() },
        { status: 401 }
      );
    }

    // 2. Parse body
    const body: ImportProcessarDTO = await req.json();
    const {
      dados,
      estrategiaConflito = "skip",
      modulosSelecionados,
      criarBackup = false
    } = body;

    if (!dados) {
      return NextResponse.json(
        {
          error: "Campo 'dados' é obrigatório",
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    console.log("[Import Processar] Iniciando importação:", {
      userId,
      estrategia: estrategiaConflito,
      modulos: modulosSelecionados || "todos",
      backup: criarBackup
    });

    // 3. Criar backup se solicitado
    let backupUrl: string | undefined;
    if (criarBackup) {
      console.log("[Import Processar] Criando backup antes de importar...");
      // TODO: Implementar backup
      // backupUrl = await criarBackupUsuario(userId);
    }

    // 4. Determinar módulos a importar
    const exportData = dados as ExportFile;
    const modulosDisponiveis = Object.keys(exportData.data) as ModuloExport[];
    const modulosAImportar = modulosSelecionados || modulosDisponiveis;

    console.log("[Import Processar] Módulos a importar:", modulosAImportar);

    // 5. Processar cada módulo
    const detalhes: Record<string, ImportModuloResult> = {};
    const modulosRollback: ModuloExport[] = [];
    let sucessoTotal = true;

    for (const modulo of modulosAImportar) {
      const inicioModulo = Date.now();
      
      try {
        console.log(`[Import Processar] Processando módulo: ${modulo}`);
        
        const resultado = await processarModulo(
          modulo,
          exportData.data[modulo as keyof typeof exportData.data] || [],
          userId,
          estrategiaConflito
        );
        
        detalhes[modulo] = resultado;
        
        if (!resultado.sucesso) {
          sucessoTotal = false;
        }
        
        console.log(`[Import Processar] Módulo ${modulo} concluído:`, {
          importados: resultado.importados,
          pulados: resultado.pulados,
          erros: resultado.erros,
          duracao: `${resultado.duracao}ms`
        });
        
      } catch (error: any) {
        console.error(`[Import Processar] Erro no módulo ${modulo}:`, error);
        
        // Registrar erro
        detalhes[modulo] = {
          modulo,
          sucesso: false,
          total: 0,
          importados: 0,
          pulados: 0,
          erros: 1,
          listaErros: [{
            severidade: "erro",
            tipo: "schema_invalido",
            modulo,
            codigo: "ERRO_PROCESSAMENTO",
            mensagem: error.message
          }],
          idsCriados: [],
          idsAtualizados: [],
          idsPulados: [],
          duracao: Date.now() - inicioModulo
        };
        
        modulosRollback.push(modulo);
        sucessoTotal = false;
      }
    }

    // 6. Calcular resumo
    const resumo = {
      totalRegistros: 0,
      importados: 0,
      pulados: 0,
      erros: 0
    };

    Object.values(detalhes).forEach(resultado => {
      resumo.totalRegistros += resultado.total;
      resumo.importados += resultado.importados;
      resumo.pulados += resultado.pulados;
      resumo.erros += resultado.erros;
    });

    // 7. Montar resultado
    const duracaoTotal = Date.now() - inicioTotal;
    
    const resultado: ImportResult = {
      sucesso: sucessoTotal,
      status: sucessoTotal ? "concluido" : (resumo.importados > 0 ? "concluido_parcial" : "erro"),
      modulos: modulosAImportar,
      detalhes: detalhes as Record<ModuloExport, ImportModuloResult>,
      resumo,
      errosFatais: [],
      rollback: modulosRollback.length > 0,
      modulosRollback,
      iniciadoEm: new Date(inicioTotal).toISOString(),
      concluidoEm: new Date().toISOString(),
      duracaoTotal
    };

    console.log("[Import Processar] Importação concluída:", {
      status: resultado.status,
      importados: resumo.importados,
      pulados: resumo.pulados,
      erros: resumo.erros,
      duracao: `${duracaoTotal}ms`
    });

    // 8. Preparar resposta
    const response: ImportProcessarResponse = {
      resultado,
      backupUrl,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        "X-Import-Duration": duracaoTotal.toString(),
        "X-Import-Records": resumo.importados.toString()
      }
    });
    
  } catch (error: any) {
    const duracao = Date.now() - inicioTotal;
    
    console.error("[Import Processar] Erro fatal na importação:", {
      error: error.message,
      stack: error.stack,
      duracao: `${duracao}ms`
    });
    
    return NextResponse.json(
      {
        error: "Erro ao processar importação",
        details: process.env.NODE_ENV === "development" ? error.message : undefined,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// HELPERS - PROCESSAMENTO POR MÓDULO
// ============================================================================

/**
 * Processa importação de um módulo específico
 */
async function processarModulo(
  modulo: ModuloExport,
  registros: any[],
  userId: string,
  estrategia: EstrategiaConflito
): Promise<ImportModuloResult> {
  const inicio = Date.now();
  
  const resultado: ImportModuloResult = {
    modulo,
    sucesso: true,
    total: Array.isArray(registros) ? registros.length : 0,
    importados: 0,
    pulados: 0,
    erros: 0,
    listaErros: [],
    idsCriados: [],
    idsAtualizados: [],
    idsPulados: [],
    duracao: 0
  };

  if (!Array.isArray(registros) || registros.length === 0) {
    resultado.duracao = Date.now() - inicio;
    return resultado;
  }

  // Processar cada registro
  for (const registro of registros) {
    try {
      // Adicionar userId ao registro
      const registroComUserId = {
        ...registro,
        userId,
        // Gerar novo ID para evitar conflitos
        id: crypto.randomUUID()
      };

      // Verificar duplicata por nome (para categorias, contas, cartões)
      let isDuplicado = false;
      
      if (["categorias", "contas", "cartoes"].includes(modulo) && registro.nome) {
        isDuplicado = await verificarDuplicata(modulo, registro.nome, userId);
      }

      // Aplicar estratégia
      if (isDuplicado) {
        if (estrategia === "skip") {
          resultado.pulados++;
          resultado.idsPulados.push(registro.id);
          continue;
        } else if (estrategia === "substituir") {
          // TODO: Implementar atualização
          resultado.pulados++;
          resultado.idsPulados.push(registro.id);
          continue;
        }
      }

      // Inserir registro
      await inserirRegistro(modulo, registroComUserId);
      
      resultado.importados++;
      resultado.idsCriados.push(registroComUserId.id);
      
    } catch (error: any) {
      console.error(`[Import] Erro ao importar registro em ${modulo}:`, error);
      
      resultado.erros++;
      resultado.listaErros.push({
        severidade: "erro",
        tipo: "schema_invalido",
        modulo,
        codigo: "ERRO_INSERCAO",
        mensagem: error.message,
        registroId: registro.id
      });
    }
  }

  resultado.sucesso = resultado.erros === 0;
  resultado.duracao = Date.now() - inicio;
  
  return resultado;
}

/**
 * Verifica se registro é duplicado por nome
 */
async function verificarDuplicata(
  modulo: ModuloExport,
  nome: string,
  userId: string
): Promise<boolean> {
  try {
    switch (modulo) {
      case "categorias":
        const cats = await db
          .select({ id: categorias.id, nome: categorias.nome })
          .from(categorias)
          .where(eq(categorias.userId, userId))
          .limit(100);
        
        // ✅ CORRETO: Comparar nomes (case-insensitive)
        return cats.some(c => c.nome?.toLowerCase() === nome.toLowerCase());
        
      case "contas":
        const cts = await db
          .select({ id: contas.id, nome: contas.nome })
          .from(contas)
          .where(eq(contas.userId, userId))
          .limit(100);
        
        // ✅ CORRETO: Comparar nomes (case-insensitive)
        return cts.some(c => c.nome?.toLowerCase() === nome.toLowerCase());
        
      case "cartoes":
        const cards = await db
          .select({ id: cartoes.id, nome: cartoes.nome })
          .from(cartoes)
          .where(eq(cartoes.userId, userId))
          .limit(100);
        
        // ✅ CORRETO: Comparar nomes (case-insensitive)
        return cards.some(c => c.nome?.toLowerCase() === nome.toLowerCase());
        
      default:
        return false;
    }
  } catch (error) {
    console.warn("[Import] Erro ao verificar duplicata:", error);
    return false;
  }
}

/**
 * Insere registro no módulo específico
 */
async function inserirRegistro(modulo: ModuloExport, registro: any): Promise<void> {
  switch (modulo) {
    case "categorias":
      await db.insert(categorias).values(registro);
      break;
      
    case "contas":
      await db.insert(contas).values(registro);
      break;
      
    case "cartoes":
      await db.insert(cartoes).values(registro);
      break;
      
    case "transacoes":
      await db.insert(transacoes).values(registro);
      break;
      
    case "faturas":
      await db.insert(faturas).values(registro);
      break;
      
    case "extrato":
      await db.insert(extratoConta).values(registro);
      break;
      
    case "notificacoes":
      await db.insert(notificacoes).values(registro);
      break;
      
    case "preferencias":
      // Preferences é objeto único, não array
      await db.insert(preferences).values(registro).onConflictDoUpdate({
        target: preferences.userId,
        set: registro
      });
      break;
      
    default:
      throw new Error(`Módulo não suportado: ${modulo}`);
  }
}

/**
 * OPTIONS /api/import/processar
 * CORS preflight
 */
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Allow": "POST, OPTIONS",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    }
  });
}