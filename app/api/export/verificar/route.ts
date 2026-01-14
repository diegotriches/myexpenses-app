// src/app/api/export/verificar/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * GET /api/export/verificar
 * Health check do serviço de exportação
 * Verifica se o usuário está autenticado e se o DB está acessível
 */
export async function GET(req: NextRequest) {
  const inicio = Date.now();
  
  try {
    // 1. Verifica autenticação (opcional para health check)
    let userId: string | null = null;
    let usuarioAutenticado = false;
    
    try {
      userId = await getUserId();
      usuarioAutenticado = !!userId;
    } catch (error) {
      // Ignora erro de autenticação no health check
    }

    // 2. Verifica conexão com banco de dados
    let dbConectado = false;
    let totalUsuarios = 0;
    
    try {
      const result = await db.select({ count: users.id }).from(users);
      dbConectado = true;
      totalUsuarios = result.length;
    } catch (error) {
      console.error("[Export Verificar] Erro ao conectar DB:", error);
      dbConectado = false;
    }

    // 3. Status geral
    const statusGeral = dbConectado && usuarioAutenticado;
    const duracao = Date.now() - inicio;

    // 4. Informações do sistema
    const info = {
      servico: "export",
      versao: "1.0.0",
      disponivel: statusGeral,
      timestamp: new Date().toISOString(),
      duracao: `${duracao}ms`,
      checks: {
        autenticacao: {
          status: usuarioAutenticado ? "ok" : "not_authenticated",
          userId: userId || null
        },
        database: {
          status: dbConectado ? "ok" : "error",
          totalUsuarios: dbConectado ? totalUsuarios : null
        }
      },
      endpoints: {
        completo: "/api/export/meus-dados",
        seletivo: "/api/export/seletivo",
        periodo: "/api/export/periodo",
        verificar: "/api/export/verificar"
      },
      limites: {
        tamanhoMaximo: "50MB",
        formatosSuportados: ["json", "csv", "zip"],
        modulosSuportados: [
          "categorias",
          "contas",
          "cartoes",
          "transacoes",
          "faturas",
          "extrato",
          "notificacoes",
          "preferencias"
        ]
      }
    };

    // 5. Retorna status
    return NextResponse.json(
      {
        message: statusGeral 
          ? "Serviço de exportação funcionando normalmente" 
          : "Serviço com restrições",
        ...info
      },
      { 
        status: statusGeral ? 200 : 503,
        headers: {
          "X-Health-Check": "true",
          "X-Response-Time": duracao.toString()
        }
      }
    );
    
  } catch (error: any) {
    const duracao = Date.now() - inicio;
    
    console.error("[Export Verificar] Erro no health check:", error);
    
    return NextResponse.json(
      {
        servico: "export",
        disponivel: false,
        message: "Erro no serviço de exportação",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
        timestamp: new Date().toISOString(),
        duracao: `${duracao}ms`
      },
      { 
        status: 503,
        headers: {
          "X-Health-Check": "true",
          "X-Response-Time": duracao.toString()
        }
      }
    );
  }
}

/**
 * HEAD /api/export/verificar
 * Ping rápido (sem body)
 */
export async function HEAD(req: NextRequest) {
  try {
    const userId = await getUserId();
    const disponivel = !!userId;
    
    return new NextResponse(null, {
      status: disponivel ? 200 : 503,
      headers: {
        "X-Health-Check": "true",
        "X-Service": "export",
        "X-Available": disponivel.toString()
      }
    });
    
  } catch (error) {
    return new NextResponse(null, {
      status: 503,
      headers: {
        "X-Health-Check": "true",
        "X-Service": "export",
        "X-Available": "false"
      }
    });
  }
}