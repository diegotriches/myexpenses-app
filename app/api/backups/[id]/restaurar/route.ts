// src/app/api/backups/[id]/restaurar/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { backupsUsuario, notificacoes } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import { substituirDadosUsuario, validarArquivoBackup } from "@/lib/backupDados";

export const maxDuration = 60;

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/backups/[id]/restaurar
// Substitui todos os dados do usuário pelo conteúdo do backup.
//
// ⚠️ OPERAÇÃO DESTRUTIVA E IRREVERSÍVEL — exige confirmação explícita no body.
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    if (body.confirmar !== true) {
      return NextResponse.json(
        { error: "Confirmação obrigatória — envie { confirmar: true } no body" },
        { status: 400 }
      );
    }

    const [backup] = await db
      .select()
      .from(backupsUsuario)
      .where(and(eq(backupsUsuario.id, id), eq(backupsUsuario.userId, userId)))
      .limit(1);

    if (!backup) return NextResponse.json({ error: "Backup não encontrado" }, { status: 404 });

    const validacao = validarArquivoBackup(backup.dados);
    if (!validacao.ok) return NextResponse.json({ error: validacao.erro }, { status: 400 });

    await substituirDadosUsuario(userId, validacao.data);

    await db.insert(notificacoes).values({
      userId,
      titulo:     "Backup restaurado com sucesso",
      mensagem:   `Seus dados foram restaurados a partir do backup de ${new Date(backup.createdAt).toLocaleDateString("pt-BR")}.`,
      tipo:       "backup",
      severidade: "info",
      lida:       false,
      link:       "/ajustes?tab=exportar",
      createdAt:  new Date(),
    });

    return NextResponse.json({
      message:  "Backup restaurado com sucesso",
      backupId: id,
      data:     new Date(backup.createdAt).toISOString(),
    });
  } catch (error: unknown) {
    console.error("Erro ao restaurar backup:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao restaurar backup" },
      { status: 500 }
    );
  }
}
