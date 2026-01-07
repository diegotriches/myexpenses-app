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
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { getUserId } from "@/lib/auth";

/**
 * GET /api/export/meus-dados
 * Exporta todos os dados do usuário em formato JSON
 */
export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // Buscar dados do usuário (sem senha!)
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

    // Buscar todos os dados relacionados
    const [
      contasData,
      cartoesData,
      transacoesData,
      categoriasData,
      faturasData,
      extratoData,
      notificacoesData,
      preferenciasData,
    ] = await Promise.all([
      db.select().from(contas).where(eq(contas.userId, userId)),
      db.select().from(cartoes).where(eq(cartoes.userId, userId)),
      db.select().from(transacoes).where(eq(transacoes.userId, userId)),
      db.select().from(categorias).where(eq(categorias.userId, userId)),
      // ✅ CORRIGIDO: Faturas tem userId, buscar direto
      db.select().from(faturas).where(eq(faturas.userId, userId)),
      // ✅ CORRIGIDO: ExtratoConta tem userId, buscar direto
      db.select().from(extratoConta).where(eq(extratoConta.userId, userId)),
      db.select().from(notificacoes).where(eq(notificacoes.userId, userId)),
      db.select().from(preferenciasNotificacao).where(eq(preferenciasNotificacao.userId, userId)),
    ]);

    // Montar objeto de exportação
    const exportData = {
      metadata: {
        exportDate: new Date().toISOString(),
        version: "1.0.0",
        appName: "MyExpenses",
        appUrl: "https://myexpenses-app-ten.vercel.app",
      },
      user: userData,
      statistics: {
        contas: contasData.length,
        cartoes: cartoesData.length,
        transacoes: transacoesData.length,
        categorias: categoriasData.length,
        faturas: faturasData.length,
        extrato: extratoData.length,
        notificacoes: notificacoesData.length,
      },
      data: {
        contas: contasData,
        cartoes: cartoesData,
        transacoes: transacoesData,
        categorias: categoriasData,
        faturas: faturasData,
        extratoConta: extratoData,
        notificacoes: notificacoesData,
        preferenciasNotificacao: preferenciasData,
      },
    };

    // Converter para JSON formatado
    const json = JSON.stringify(exportData, null, 2);
    const buffer = Buffer.from(json, "utf-8");

    // Gerar nome do arquivo
    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `myexpenses-backup-${timestamp}.json`;

    // Retornar como download
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error("Erro ao exportar dados:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao exportar dados" },
      { status: 500 }
    );
  }
}