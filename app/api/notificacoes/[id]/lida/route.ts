import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { notificacoes } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import { respostaDeErro } from "@/lib/rota";

/**
 * PUT /api/notificacoes/[id]/lida
 * Marca uma notificação como lida
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { id } = await params;

    // Verificar se notificação existe e pertence ao usuário
    const [notificacao] = await db
      .select()
      .from(notificacoes)
      .where(and(eq(notificacoes.id, id), eq(notificacoes.userId, userId)))
      .limit(1);

    if (!notificacao) {
      return NextResponse.json(
        { error: "Notificação não encontrada" },
        { status: 404 }
      );
    }

    // Marcar como lida
    const [updated] = await db
      .update(notificacoes)
      .set({ lida: true })
      .where(and(eq(notificacoes.id, id), eq(notificacoes.userId, userId)))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    return respostaDeErro(error, "Erro ao marcar como lida");
  }
}