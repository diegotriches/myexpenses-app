// src/app/api/export/periodo/route.ts

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
  notificacoes
} from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import type { 
  ExportFile, 
  ExportMetadata, 
  ExportStatistics, 
  ExportData,
  ModuloExport 
} from "@/types/export";

/**
 * GET /api/export/periodo
 * Exporta dados de um PERÍODO ESPECÍFICO (principalmente transações)
 * 
 * Query params:
 * - inicio: "2026-01-01" (obrigatório)
 * - fim: "2026-01-31" (obrigatório)
 * - modulos: "transacoes,faturas" (opcional, padrão: todos)
 * - formato: "json" | "csv" | "zip" (padrão: json)
 * - encrypted: "true" | "false" (padrão: false)
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
    const dataInicio = searchParams.get("inicio");
    const dataFim = searchParams.get("fim");
    const modulosParam = searchParams.get("modulos");
    const formato = searchParams.get("formato") || "json";
    const encrypted = searchParams.get("encrypted") === "true";

    // Validação de datas
    if (!dataInicio || !dataFim) {
      return NextResponse.json(
        { error: "Parâmetros 'inicio' e 'fim' são obrigatórios" },
        { status: 400 }
      );
    }

    // Validar formato de data (ISO 8601)
    const regexData = /^\d{4}-\d{2}-\d{2}$/;
    if (!regexData.test(dataInicio) || !regexData.test(dataFim)) {
      return NextResponse.json(
        { error: "Formato de data inválido. Use YYYY-MM-DD" },
        { status: 400 }
      );
    }

    // Validar que início <= fim
    if (new Date(dataInicio) > new Date(dataFim)) {
      return NextResponse.json(
        { error: "Data de início deve ser anterior à data de fim" },
        { status: 400 }
      );
    }

    // Módulos (padrão: todos os que suportam período)
    const modulosSelecionados: ModuloExport[] = modulosParam
      ? (modulosParam.split(",") as ModuloExport[])
      : ["categorias", "contas", "cartoes", "transacoes", "faturas", "extrato"];

    console.log(`[Export Período] Exportando de ${dataInicio} até ${dataFim}`);

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

    // 4. Buscar dados do período
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
          // Categorias: todas (sem filtro de período)
          data.categorias = await db
            .select()
            .from(categorias)
            .where(eq(categorias.userId, userId));
          statistics.categorias = data.categorias.length;
          break;
          
        case "contas":
          // Contas: todas (sem filtro de período)
          data.contas = await db
            .select()
            .from(contas)
            .where(eq(contas.userId, userId));
          statistics.contas = data.contas.length;
          break;
          
        case "cartoes":
          // Cartões: todos (sem filtro de período)
          data.cartoes = await db
            .select()
            .from(cartoes)
            .where(eq(cartoes.userId, userId));
          statistics.cartoes = data.cartoes.length;
          break;
          
        case "transacoes":
          // ✅ ERRO 1 & 2: Converter string para Date
          data.transacoes = await db
            .select()
            .from(transacoes)
            .where(
              and(
                eq(transacoes.userId, userId),
                gte(transacoes.data, new Date(dataInicio)), // ✅ new Date()
                lte(transacoes.data, new Date(dataFim))     // ✅ new Date()
              )
            );
          statistics.transacoes = data.transacoes.length;
          break;
          
        case "faturas":
          // ✅ ERRO 3: Faturas têm campos mes/ano, não mesReferencia/anoReferencia
          // Buscar todas e filtrar manualmente
          const [anoInicio, mesInicio] = dataInicio.split("-").map(Number);
          const [anoFim, mesFim] = dataFim.split("-").map(Number);
          
          const todasFaturas = await db
            .select()
            .from(faturas)
            .where(eq(faturas.userId, userId));
          
          // Filtrar por período manualmente
          data.faturas = todasFaturas.filter(fatura => {
            const ano = fatura.ano;
            const mes = fatura.mes;
            
            const dataFatura = ano * 100 + mes;
            const dataInicioPeriodo = anoInicio * 100 + mesInicio;
            const dataFimPeriodo = anoFim * 100 + mesFim;
            
            return dataFatura >= dataInicioPeriodo && dataFatura <= dataFimPeriodo;
          }).map(fatura => ({
            ...fatura,
            // ✅ ERRO 3: Adicionar campos que estão no type Fatura mas não no schema
            mesReferencia: fatura.mes,
            anoReferencia: fatura.ano
          }));
          
          statistics.faturas = data.faturas.length;
          break;
          
        case "extrato":
          // Extrato: FILTRADO por data
          data.extrato = await db
            .select()
            .from(extratoConta)
            .where(
              and(
                eq(extratoConta.userId, userId),
                gte(extratoConta.data, dataInicio),
                lte(extratoConta.data, dataFim)
              )
            );
          statistics.extrato = data.extrato.length;
          break;
          
        case "notificacoes":
          // Notificações: FILTRADAS por createdAt
          data.notificacoes = await db
            .select()
            .from(notificacoes)
            .where(
              and(
                eq(notificacoes.userId, userId),
                gte(notificacoes.createdAt, new Date(dataInicio)),
                lte(notificacoes.createdAt, new Date(dataFim + "T23:59:59.999Z"))
              )
            );
          statistics.notificacoes = data.notificacoes.length;
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
      tipo: "periodo",
      modulos: modulosSelecionados,
      periodo: {
        inicio: dataInicio,
        fim: dataFim
      },
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
    const filename = `myexpenses-periodo-${dataInicio}-${dataFim}.json`;

    // 9. Logs
    const duracao = Date.now() - inicio;
    console.log(`[Export Período] Concluído em ${duracao}ms:`, {
      filename,
      tamanho: exportData.statistics.tamanhoFormatado,
      periodo: `${dataInicio} até ${dataFim}`,
      transacoes: statistics.transacoes
    });

    // 10. Retornar
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": buffer.length.toString(),
        "X-Export-Duration": duracao.toString(),
        "X-Export-Period": `${dataInicio}:${dataFim}`
      },
    });
    
  } catch (error: any) {
    const duracao = Date.now() - inicio;
    
    console.error("[Export Período] Erro:", {
      error: error.message,
      stack: error.stack,
      duracao
    });
    
    return NextResponse.json(
      {
        error: "Erro ao exportar período",
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