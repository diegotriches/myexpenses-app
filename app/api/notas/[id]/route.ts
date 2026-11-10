import { NextResponse } from "next/server";
import { db } from "@/db";
import { notas } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import type { UpdateNotaDTO } from "@/types/nota";
import { respostaDeErro } from "@/lib/rota";

const CORES_VALIDAS = ["yellow", "blue", "green", "red", "purple", "gray"] as const;

// PUT /api/notas/[id] — atualiza titulo, conteudo ou cor
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { id } = await params;
    const body: UpdateNotaDTO = await req.json();
    const { titulo, conteudo, cor } = body;

    if (titulo !== undefined && titulo.length > 100)
      return NextResponse.json({ error: "Título muito longo (máx. 100 caracteres)" }, { status: 400 });

    if (cor !== undefined && !(CORES_VALIDAS as readonly string[]).includes(cor))
      return NextResponse.json({ error: "Cor inválida" }, { status: 400 });

    const dadosAtualizacao: Partial<typeof notas.$inferInsert> = { updatedAt: new Date() };
    if (titulo   !== undefined) dadosAtualizacao.titulo   = titulo.trim();
    if (conteudo !== undefined) dadosAtualizacao.conteudo = conteudo.trim();
    if (cor      !== undefined) dadosAtualizacao.cor      = cor;

    const [atualizada] = await db
      .update(notas)
      .set(dadosAtualizacao)
      .where(and(eq(notas.id, id), eq(notas.userId, userId)))
      .returning();

    if (!atualizada)
      return NextResponse.json({ error: "Nota não encontrada" }, { status: 404 });

    return NextResponse.json(atualizada);
  } catch (error) {
    return respostaDeErro(error, "Erro ao atualizar nota");
  }
}

// DELETE /api/notas/[id] — remove nota
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { id } = await params;

    const [deletada] = await db
      .delete(notas)
      .where(and(eq(notas.id, id), eq(notas.userId, userId)))
      .returning();

    if (!deletada)
      return NextResponse.json({ error: "Nota não encontrada" }, { status: 404 });

    return NextResponse.json({ message: "Nota removida com sucesso" });
  } catch (error) {
    return respostaDeErro(error, "Erro ao deletar nota");
  }
}