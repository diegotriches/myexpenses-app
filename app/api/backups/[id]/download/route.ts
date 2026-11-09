import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { backupsUsuario } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import { respostaDeErro } from "@/lib/rota";

// GET /api/backups/[id]/download — retorna o JSON completo do backup para download
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { id } = await params;

    const [backup] = await db
      .select()
      .from(backupsUsuario)
      .where(and(eq(backupsUsuario.id, id), eq(backupsUsuario.userId, userId)))
      .limit(1);

    if (!backup) return NextResponse.json({ error: "Backup não encontrado" }, { status: 404 });

    const json   = JSON.stringify(backup.dados, null, 2);
    const buffer = Buffer.from(json, "utf-8");

    const dataFormatada = new Date(backup.createdAt).toISOString().split("T")[0];
    const filename = `myexpenses-backup-${dataFormatada}.json`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":        "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length":      buffer.length.toString(),
      },
    });
  } catch (error) {
    return respostaDeErro(error, "Erro ao baixar backup");
  }
}