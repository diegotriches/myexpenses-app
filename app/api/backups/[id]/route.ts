import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { backupsUsuario } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import { respostaDeErro } from "@/lib/rota";

// DELETE /api/backups/[id] — remove um backup específico manualmente
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { id } = await params;

    const [removido] = await db
      .delete(backupsUsuario)
      .where(and(eq(backupsUsuario.id, id), eq(backupsUsuario.userId, userId)))
      .returning();

    if (!removido) return NextResponse.json({ error: "Backup não encontrado" }, { status: 404 });

    return NextResponse.json({ message: "Backup removido com sucesso" });
  } catch (error) {
    return respostaDeErro(error, "Erro ao remover backup");
  }
}