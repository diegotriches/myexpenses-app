// src/app/api/notificacoes/limpar-lidas/route.ts

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { notificacoes } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getUserId } from "@/lib/auth";

/**
 * DELETE /api/notificacoes/limpar-lidas
 * Remove todas as notificações lidas do usuário
 * 
 * Response: { message: string, count: number }
 */
export async function DELETE(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // Deletar todas as notificações lidas
    const deleted = await db
      .delete(notificacoes)
      .where(
        and(
          eq(notificacoes.userId, userId),
          eq(notificacoes.lida, true)
        )
      )
      .returning();

    console.log(`✅ ${deleted.length} notificações lidas removidas para userId: ${userId}`);

    return NextResponse.json({
      message: deleted.length > 0 
        ? "Notificações lidas removidas com sucesso" 
        : "Nenhuma notificação lida para remover",
      count: deleted.length,
    });
  } catch (error: any) {
    console.error("❌ Erro ao limpar notificações lidas:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao limpar notificações" },
      { status: 500 }
    );
  }
}