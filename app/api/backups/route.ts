// src/app/api/backups/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { backupsUsuario } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import type { BackupListItem } from "@/types/backup";
import { respostaDeErro } from "@/lib/rota";

// GET /api/backups — lista os backups do usuário, mais recentes primeiro
// Não retorna o campo "dados" completo (pode ser grande) — apenas metadados
export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const registros = await db
      .select({
        id:           backupsUsuario.id,
        createdAt:    backupsUsuario.createdAt,
        tamanhoBytes: backupsUsuario.tamanhoBytes,
        estatisticas: backupsUsuario.estatisticas,
      })
      .from(backupsUsuario)
      .where(eq(backupsUsuario.userId, userId))
      .orderBy(desc(backupsUsuario.createdAt));

    const lista: BackupListItem[] = registros.map((r) => ({
      id:           r.id,
      createdAt:    r.createdAt.toISOString(),
      tamanhoBytes: r.tamanhoBytes,
      estatisticas: r.estatisticas as Record<string, number> | null,
    }));

    return NextResponse.json(lista);
  } catch (error) {
    return respostaDeErro(error, "Erro ao listar backups");
  }
}