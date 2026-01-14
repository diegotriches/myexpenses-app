// src/app/api/export/seletivo/route.ts

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  users,
  contas,
  cartoes,
  transacoes,
  categorias,
  faturas,
  extratoConta,
  notificacoes,
  preferenciasNotificacao,
  preferences
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import type { 
  ExportFile, 
  ExportMetadata, 
  ExportStatistics, 
  ExportData,
  ModuloExport 
} from "@/types/export";

/**
 * GET /api/export/seletivo
 * Exporta MÓDULOS ESPECÍFICOS selecionados pelo usuário
 * 
 * Query params:
 * - modulos: "categorias,contas,transacoes" (obrigatório)
 * - formato: "json" | "csv" | "zip" (padrão: json)
 * - encrypted: "true" | "false" (padrão: false)
 * 
 * Headers:
 * - X-Encryption-Password: senha para criptografia (se encrypted=true)
 */
export async function GET(req: NextRequest) {
  const inicio = Date.now();
  
  try {
    // 1. Autenticação
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    // 2. Query params
    const searchParams = req.nextUrl.searchParams;
    const modulosParam = searchParams.get("modulos");
    const formato = searchParams.get("formato") || "json";
    const encrypted = searchParams.get("encrypted") === "true";

    // Validação de módulos
    if (!modulosParam) {
      return NextResponse.json(
        { error: "Parâmetro 'modulos' é obrigatório" },
        { status: 400 }
      );
    }

    const modulosSelecionados = modulosParam.split(",") as ModuloExport[];
    
    // Validar módulos
    const modulosValidos: ModuloExport[] = [
      "categorias",
      "contas",
      "cartoes",
      "transacoes",
      "faturas",
      "extrato",
      "notificacoes",
      "preferencias"
    ];
    
    const modulosInvalidos = modulosSelecionados.filter(
      m => !modulosValidos.includes(m)
    );
    
    if (modulosInvalidos.length > 0) {
      return NextResponse.json(
        { 
          error: "Módulos inválidos",
          modulosInvalidos,
          modulosValidos
        },
        { status: 400 }
      );
    }

    console.log(`[Export Seletivo] Exportando módulos:`, modulosSelecionados);

    // 3. Buscar dados do usuário
    const [userData] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!userData) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    // 4. Buscar apenas módulos selecionados
    const data: ExportData = {};
    const statistics: Partial<ExportStatistics> = {
      categorias: 0,
      contas: 0,
      cartoes: 0,
      transacoes: 0,
      faturas: 0,
      extrato: 0,
      notificacoes: 0,
      preferencias: 0,
      tamanhoBytes: 0,
      tamanhoFormatado: ""
    };

    // Buscar cada módulo selecionado
    for (const modulo of modulosSelecionados) {
      switch (modulo) {
        case "categorias":
          data.categorias = await db.select().from(categorias).where(eq(categorias.userId, userId));
          statistics.categorias = data.categorias.length;
          break;
          
        case "contas":
          data.contas = await db.select().from(contas).where(eq(contas.userId, userId));
          statistics.contas = data.contas.length;
          break;
          
        case "cartoes":
          data.cartoes = await db.select().from(cartoes).where(eq(cartoes.userId, userId));
          statistics.cartoes = data.cartoes.length;
          break;
          
        case "transacoes":
          data.transacoes = await db.select().from(transacoes).where(eq(transacoes.userId, userId));
          statistics.transacoes = data.transacoes.length;
          break;
          
        case "faturas":
          // ✅ ERRO 1: Adicionar mesReferencia e anoReferencia
          const faturasData = await db.select().from(faturas).where(eq(faturas.userId, userId));
          data.faturas = faturasData.map(fatura => ({
            ...fatura,
            mesReferencia: fatura.mes,
            anoReferencia: fatura.ano
          }));
          statistics.faturas = data.faturas.length;
          break;
          
        case "extrato":
          data.extrato = await db.select().from(extratoConta).where(eq(extratoConta.userId, userId));
          statistics.extrato = data.extrato.length;
          break;
          
        case "notificacoes":
          data.notificacoes = await db.select().from(notificacoes).where(eq(notificacoes.userId, userId));
          
          // ✅ ERRO 2: Usar 'preferencias' ao invés de 'preferenciasNotificacao'
          data.preferencias = await db.select().from(preferenciasNotificacao).where(eq(preferenciasNotificacao.userId, userId));
          statistics.notificacoes = data.notificacoes.length;
          break;
          
        case "preferencias":
          const prefsData = await db.select().from(preferences).where(eq(preferences.userId, userId));
          if (prefsData.length > 0) {
            (data as any).preferences = prefsData[0];
            statistics.preferencias = 1;
          }
          break;
      }
    }

    // 5. Montar metadata
    const metadata: ExportMetadata = {
      version: "1.0.0",
      exportDate: new Date().toISOString(),
      userId: userData.id,
      userName: userData.name || "Usuário",
      userEmail: userData.email,
      tipo: "seletivo",
      modulos: modulosSelecionados,
      formato: formato as any,
      encrypted,
      appName: "MyExpenses",
      appVersion: "1.0.0",
      appUrl: process.env.NEXT_PUBLIC_APP_URL || "https://myexpenses-app-ten.vercel.app"
    };

    // 6. Montar objeto final
    const exportData: ExportFile = {
      metadata,
      statistics: statistics as ExportStatistics,
      data
    };

    // 7. Converter para JSON
    const json = JSON.stringify(exportData, null, 2);
    const buffer = Buffer.from(json, "utf-8");

    // Atualizar estatísticas
    exportData.statistics.tamanhoBytes = buffer.length;
    exportData.statistics.tamanhoFormatado = formatBytes(buffer.length);

    // 8. Gerar nome do arquivo
    const timestamp = new Date().toISOString().split("T")[0];
    const modulosStr = modulosSelecionados.join("-");
    const filename = `myexpenses-${modulosStr}-${timestamp}.json`;

    // 9. Logs
    const duracao = Date.now() - inicio;
    console.log(`[Export Seletivo] Concluído em ${duracao}ms:`, {
      filename,
      tamanho: exportData.statistics.tamanhoFormatado,
      modulos: modulosSelecionados
    });

    // 10. Retornar
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": buffer.length.toString(),
        "X-Export-Duration": duracao.toString(),
        "X-Export-Modules": modulosSelecionados.join(",")
      },
    });
    
  } catch (error: any) {
    const duracao = Date.now() - inicio;
    
    console.error("[Export Seletivo] Erro:", {
      error: error.message,
      stack: error.stack,
      duracao
    });
    
    return NextResponse.json(
      {
        error: "Erro ao exportar módulos",
        details: process.env.NODE_ENV === "development" ? error.message : undefined,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}