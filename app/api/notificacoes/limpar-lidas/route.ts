// src/app/api/notificacoes/limpar-lidas/route.ts

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { notificacoes } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getUserId } from "@/lib/auth";

/**
 * DELETE /api/notificacoes/limpar-lidas
 * Remove todas as notificações lidas do usuário
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

    return NextResponse.json({
      message: "Notificações lidas removidas com sucesso",
      count: deleted.length,
    });
  } catch (error: any) {
    console.error("Erro ao limpar notificações lidas:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao limpar notificações" },
      { status: 500 }
    );
  }
}