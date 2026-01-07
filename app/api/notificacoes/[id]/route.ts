// src/app/api/notificacoes/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { notificacoes } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getUserId } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { id } = await params;
    const [notificacao] = await db
      .select()
      .from(notificacoes)
      .where(and(eq(notificacoes.id, id), eq(notificacoes.userId, userId)))
      .limit(1);

    if (!notificacao) {
      return NextResponse.json({ error: "Notificação não encontrada" }, { status: 404 });
    }

    return NextResponse.json(notificacao);
  } catch (error: any) {
    console.error("Erro ao buscar notificação:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { id } = await params;
    
    // Verificar se existe antes de deletar
    const [existing] = await db
      .select()
      .from(notificacoes)
      .where(and(eq(notificacoes.id, id), eq(notificacoes.userId, userId)))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Notificação não encontrada" }, { status: 404 });
    }

    await db
      .delete(notificacoes)
      .where(and(eq(notificacoes.id, id), eq(notificacoes.userId, userId)));

    return NextResponse.json({ message: "Notificação removida com sucesso" });
  } catch (error: any) {
    console.error("Erro ao remover notificação:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}