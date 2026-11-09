// src/app/api/notificacoes/marcar-todas-lidas/route.ts

import { NextResponse } from "next/server";
import { db } from "@/db";
import { notificacoes } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import { respostaDeErro } from "@/lib/rota";

/**
 * PUT /api/notificacoes/marcar-todas-lidas
 * Marca todas as notificações não lidas do usuário como lidas
 */
export async function PUT() {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // Atualizar todas as notificações não lidas para lidas
    const updated = await db
      .update(notificacoes)
      .set({ lida: true })
      .where(
        and(
          eq(notificacoes.userId, userId),
          eq(notificacoes.lida, false)
        )
      )
      .returning();

    return NextResponse.json({
      message: "Todas as notificações foram marcadas como lidas",
      count: updated.length,
    });
  } catch (error) {
    return respostaDeErro(error, "Erro ao marcar todas como lidas");
  }
}