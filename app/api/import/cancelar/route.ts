// src/app/api/import/cancelar/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";

/**
 * Armazena importações em andamento (em produção, usar Redis ou DB)
 */
const importacoesEmAndamento = new Map<string, {
  userId: string;
  sessionId: string;
  status: "processando" | "cancelando" | "cancelado";
  inicio: number;
}>();

/**
 * POST /api/import/cancelar
 * Cancela importação em andamento
 * 
 * Body:
 * {
 *   sessionId: string
 * }
 */
export async function POST(req: NextRequest) {
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
    const body = await req.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        {
          error: "Campo 'sessionId' é obrigatório",
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    console.log("[Import Cancelar] Solicitação de cancelamento:", {
      userId,
      sessionId
    });

    // 3. Verificar se importação existe
    const importacao = importacoesEmAndamento.get(sessionId);

    if (!importacao) {
      return NextResponse.json(
        {
          error: "Importação não encontrada ou já concluída",
          timestamp: new Date().toISOString()
        },
        { status: 404 }
      );
    }

    // 4. Verificar ownership
    if (importacao.userId !== userId) {
      return NextResponse.json(
        {
          error: "Não autorizado a cancelar esta importação",
          timestamp: new Date().toISOString()
        },
        { status: 403 }
      );
    }

    // 5. Marcar como cancelando
    importacao.status = "cancelando";
    importacoesEmAndamento.set(sessionId, importacao);

    console.log("[Import Cancelar] Importação marcada para cancelamento:", sessionId);

    // 6. Em um sistema real, aqui você:
    // - Interromperia workers/jobs em andamento
    // - Executaria rollback de transações parciais
    // - Limparia recursos temporários

    // Simular delay de cancelamento
    await new Promise(resolve => setTimeout(resolve, 500));

    // 7. Marcar como cancelado
    importacao.status = "cancelado";
    importacoesEmAndamento.set(sessionId, importacao);

    // 8. Agendar limpeza (remover após 5 minutos)
    setTimeout(() => {
      importacoesEmAndamento.delete(sessionId);
      console.log("[Import Cancelar] Sessão removida da memória:", sessionId);
    }, 5 * 60 * 1000);

    console.log("[Import Cancelar] Importação cancelada com sucesso:", sessionId);

    return NextResponse.json(
      {
        message: "Importação cancelada com sucesso",
        sessionId,
        status: "cancelado",
        timestamp: new Date().toISOString()
      },
      { status: 200 }
    );
    
  } catch (error: any) {
    console.error("[Import Cancelar] Erro ao cancelar importação:", {
      error: error.message,
      stack: error.stack
    });
    
    return NextResponse.json(
      {
        error: "Erro ao cancelar importação",
        details: process.env.NODE_ENV === "development" ? error.message : undefined,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/import/cancelar/status/:sessionId
 * Verifica status de importação
 */
export async function GET(req: NextRequest) {
  try {
    // 1. Autenticação
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json(
        { error: "Não autenticado", timestamp: new Date().toISOString() },
        { status: 401 }
      );
    }

    // 2. Extrair sessionId da URL
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const sessionId = pathParts[pathParts.length - 1];

    if (!sessionId) {
      return NextResponse.json(
        {
          error: "sessionId não fornecido",
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    // 3. Buscar importação
    const importacao = importacoesEmAndamento.get(sessionId);

    if (!importacao) {
      return NextResponse.json(
        {
          error: "Importação não encontrada",
          timestamp: new Date().toISOString()
        },
        { status: 404 }
      );
    }

    // 4. Verificar ownership
    if (importacao.userId !== userId) {
      return NextResponse.json(
        {
          error: "Não autorizado",
          timestamp: new Date().toISOString()
        },
        { status: 403 }
      );
    }

    // 5. Calcular progresso (simulado)
    const tempoDecorrido = Date.now() - importacao.inicio;
    const progresso = Math.min(
      95,
      Math.floor((tempoDecorrido / 10000) * 100)
    );

    // 6. Retornar status
    return NextResponse.json(
      {
        sessionId,
        status: importacao.status,
        progresso,
        mensagem: getMensagemStatus(importacao.status, progresso),
        timestamp: new Date().toISOString()
      },
      { status: 200 }
    );
    
  } catch (error: any) {
    console.error("[Import Cancelar] Erro ao buscar status:", {
      error: error.message,
      stack: error.stack
    });
    
    return NextResponse.json(
      {
        error: "Erro ao buscar status",
        details: process.env.NODE_ENV === "development" ? error.message : undefined,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS /api/import/cancelar
 * CORS preflight
 */
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Allow": "POST, GET, OPTIONS",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    }
  });
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Retorna mensagem amigável baseada no status
 */
function getMensagemStatus(
  status: "processando" | "cancelando" | "cancelado",
  progresso: number
): string {
  switch (status) {
    case "processando":
      return `Importando dados... ${progresso}%`;
    case "cancelando":
      return "Cancelando importação...";
    case "cancelado":
      return "Importação cancelada";
    default:
      return "Status desconhecido";
  }
}

/**
 * Registra importação em andamento
 * Chamado pela rota /api/import/processar
 */
export function registrarImportacao(sessionId: string, userId: string): void {
  importacoesEmAndamento.set(sessionId, {
    userId,
    sessionId,
    status: "processando",
    inicio: Date.now()
  });
  
  console.log("[Import] Importação registrada:", sessionId);
}

/**
 * Remove importação após conclusão
 * Chamado pela rota /api/import/processar
 */
export function finalizarImportacao(sessionId: string): void {
  importacoesEmAndamento.delete(sessionId);
  console.log("[Import] Importação finalizada e removida:", sessionId);
}