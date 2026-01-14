// src/app/api/import/validar/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { db } from "@/db";
import { categorias, contas, cartoes, transacoes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { validarArquivoImport } from "@/lib/validators/import";
import type { ExportFile } from "@/types/export";
import type { ImportValidarResponse } from "@/types/import";

/**
 * POST /api/import/validar
 * Valida arquivo de importação e gera preview com conflitos
 * 
 * Body:
 * {
 *   dados: ExportFile,
 *   estrategiaPadrao?: "skip" | "substituir" | "mesclar"
 * }
 */
export async function POST(req: NextRequest) {
  const inicio = Date.now();
  
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
    const { dados, estrategiaPadrao = "skip" } = body;

    if (!dados) {
      return NextResponse.json(
        { 
          error: "Campo 'dados' é obrigatório",
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    console.log("[Import Validar] Iniciando validação para userId:", userId);

    // 3. Buscar dados existentes para comparação
    console.log("[Import Validar] Buscando dados existentes...");
    
    const [
      categoriasExistentes,
      contasExistentes,
      cartoesExistentes,
      transacoesExistentes
    ] = await Promise.all([
      db.select().from(categorias).where(eq(categorias.userId, userId)),
      db.select().from(contas).where(eq(contas.userId, userId)),
      db.select().from(cartoes).where(eq(cartoes.userId, userId)),
      db.select().from(transacoes).where(eq(transacoes.userId, userId))
    ]);

    const dadosExistentes = {
      categorias: categoriasExistentes,
      contas: contasExistentes,
      cartoes: cartoesExistentes,
      transacoes: transacoesExistentes
    };

    console.log("[Import Validar] Dados existentes:", {
      categorias: categoriasExistentes.length,
      contas: contasExistentes.length,
      cartoes: cartoesExistentes.length,
      transacoes: transacoesExistentes.length
    });

    // 4. Executar validação completa
    console.log("[Import Validar] Executando validação...");
    
    const validacao = await validarArquivoImport(
      dados as ExportFile,
      dadosExistentes
    );

    // 5. Aplicar estratégia padrão ao preview
    if (validacao.preview) {
      validacao.preview.estrategiaPadrao = estrategiaPadrao as any;
    }

    // 6. Gerar sessionId para esta validação
    const sessionId = crypto.randomUUID();

    const duracao = Date.now() - inicio;

    console.log("[Import Validar] Validação concluída:", {
      sessionId,
      valido: validacao.valido,
      podeProsseguir: validacao.podeProsseguir,
      errosCriticos: validacao.errosCriticos.length,
      avisos: validacao.avisos.length,
      duracao: `${duracao}ms`
    });

    // 7. Preparar resposta
    const response: ImportValidarResponse = {
      validacao,
      sessionId,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        "X-Session-Id": sessionId,
        "X-Validation-Duration": duracao.toString()
      }
    });
    
  } catch (error: any) {
    const duracao = Date.now() - inicio;
    
    console.error("[Import Validar] Erro na validação:", {
      error: error.message,
      stack: error.stack,
      duracao: `${duracao}ms`
    });
    
    return NextResponse.json(
      {
        error: "Erro ao validar arquivo",
        details: process.env.NODE_ENV === "development" ? error.message : undefined,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS /api/import/validar
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