// src/app/api/export/meus-dados/route.ts

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
import type { ExportFile, ExportMetadata, ExportStatistics, ExportData } from "@/types/export";

/**
 * GET /api/export/meus-dados
 * Exporta TODOS os dados do usuário em formato JSON
 * 
 * Query params:
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

    console.log(`[Export] Iniciando exportação completa para userId: ${userId}`);

    // 2. Query params
    const searchParams = req.nextUrl.searchParams;
    const formato = searchParams.get("formato") || "json";
    const encrypted = searchParams.get("encrypted") === "true";

    // 3. Buscar dados do usuário (sem senha!)
    const [userData] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
        emailVerified: users.emailVerified,
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

    // 4. Buscar todos os dados relacionados em paralelo
    const [
      contasData,
      cartoesData,
      transacoesData,
      categoriasData,
      faturasData,
      extratoData,
      notificacoesData,
      preferenciasNotifData,
      preferencesData
    ] = await Promise.all([
      db.select().from(contas).where(eq(contas.userId, userId)),
      db.select().from(cartoes).where(eq(cartoes.userId, userId)),
      db.select().from(transacoes).where(eq(transacoes.userId, userId)),
      db.select().from(categorias).where(eq(categorias.userId, userId)),
      db.select().from(faturas).where(eq(faturas.userId, userId)),
      db.select().from(extratoConta).where(eq(extratoConta.userId, userId)),
      db.select().from(notificacoes).where(eq(notificacoes.userId, userId)),
      db.select().from(preferenciasNotificacao).where(eq(preferenciasNotificacao.userId, userId)),
      db.select().from(preferences).where(eq(preferences.userId, userId))
    ]);

    // 5. Montar metadata
    const metadata: ExportMetadata = {
      version: "1.0.0",
      exportDate: new Date().toISOString(),
      userId: userData.id,
      userName: userData.name || "Usuário",
      userEmail: userData.email,
      tipo: "completo",
      formato: formato as any,
      encrypted,
      appName: "MyExpenses",
      appVersion: "1.0.0",
      appUrl: process.env.NEXT_PUBLIC_APP_URL || "https://myexpenses-app-ten.vercel.app"
    };

    // 6. Calcular estatísticas
    const statistics: ExportStatistics = {
      categorias: categoriasData.length,
      contas: contasData.length,
      cartoes: cartoesData.length,
      transacoes: transacoesData.length,
      faturas: faturasData.length,
      extrato: extratoData.length,
      notificacoes: notificacoesData.length,
      preferencias: preferencesData.length,
      tamanhoBytes: 0, // Será calculado após stringify
      tamanhoFormatado: ""
    };

    // 7. Montar dados exportados
    const data: ExportData = {
      categorias: categoriasData,
      contas: contasData,
      cartoes: cartoesData,
      transacoes: transacoesData,
      // ✅ CORREÇÃO: Mapear faturas para adicionar mesReferencia e anoReferencia
      faturas: faturasData.map(fatura => ({
        ...fatura,
        mesReferencia: fatura.mes,
        anoReferencia: fatura.ano
      })),
      extrato: extratoData,
      notificacoes: notificacoesData,
      // ✅ CORREÇÃO: Usar 'preferencias' ao invés de 'preferenciasNotificacao'
      preferencias: preferenciasNotifData
    };

    // 8. Adicionar preferências se existir
    if (preferencesData.length > 0) {
      (data as any).preferences = preferencesData[0];
    }

    // 9. Montar objeto final
    const exportData: ExportFile = {
      metadata,
      statistics,
      data
    };

    // 10. Converter para JSON formatado
    const json = JSON.stringify(exportData, null, 2);
    const buffer = Buffer.from(json, "utf-8");

    // Atualizar estatísticas com tamanho real
    exportData.statistics.tamanhoBytes = buffer.length;
    exportData.statistics.tamanhoFormatado = formatBytes(buffer.length);

    // 11. Gerar nome do arquivo
    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `myexpenses-backup-${timestamp}.json`;

    // 12. Logs
    const duracao = Date.now() - inicio;
    console.log(`[Export] Exportação concluída em ${duracao}ms:`, {
      filename,
      tamanho: exportData.statistics.tamanhoFormatado,
      categorias: statistics.categorias,
      contas: statistics.contas,
      transacoes: statistics.transacoes
    });

    // 13. Retornar como download
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": buffer.length.toString(),
        "X-Export-Duration": duracao.toString(),
        "X-Export-Records": statistics.transacoes.toString()
      },
    });
    
  } catch (error: any) {
    const duracao = Date.now() - inicio;
    
    console.error("[Export] Erro ao exportar dados:", {
      error: error.message,
      stack: error.stack,
      duracao
    });
    
    return NextResponse.json(
      {
        error: "Erro ao exportar dados",
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