import { NextResponse } from "next/server";
import { db } from "@/db";
import { categorias } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getUserIdFromSession } from "@/lib/auth/helpers";

// GET - Buscar categoria específica
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 🔐 Autenticação
    const userId = await getUserIdFromSession();
    const { id } = await params;

    // 🔐 Buscar categoria do usuário
    const [categoria] = await db
      .select()
      .from(categorias)
      .where(
        and(
          eq(categorias.id, Number(id)),
          eq(categorias.userId, userId)
        )
      )
      .limit(1);

    if (!categoria) {
      return NextResponse.json(
        { error: "Categoria não encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(categoria);
  } catch (err: any) {
    console.error("Erro ao buscar categoria:", err);

    if (err instanceof Error && err.message === "Não autenticado") {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: err.message || "Erro ao buscar categoria" },
      { status: 500 }
    );
  }
}

// PUT - Atualizar categoria
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 🔐 Autenticação
    const userId = await getUserIdFromSession();
    const { id } = await params;

    const { nome, tipo, icon } = await req.json();

    // Validações
    if (!nome || !tipo || !icon) {
      return NextResponse.json(
        { error: "Nome, tipo e ícone são obrigatórios" },
        { status: 400 }
      );
    }

    // Validar tipo
    if (tipo !== "entrada" && tipo !== "saida") {
      return NextResponse.json(
        { error: "Tipo deve ser 'entrada' ou 'saida'" },
        { status: 400 }
      );
    }

    // 🔐 Atualizar APENAS se pertencer ao usuário
    const [updated] = await db
      .update(categorias)
      .set({
        nome,
        tipo,
        icon,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(categorias.id, Number(id)),
          eq(categorias.userId, userId) // 🔐 Verificar ownership
        )
      )
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: "Categoria não encontrada ou acesso negado" },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("Erro ao atualizar categoria:", err);

    if (err instanceof Error && err.message === "Não autenticado") {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: err.message || "Erro ao atualizar categoria" },
      { status: 500 }
    );
  }
}

// DELETE - Deletar categoria
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 🔐 Autenticação
    const userId = await getUserIdFromSession();
    const { id } = await params;

    if (Number.isNaN(Number(id))) {
      return NextResponse.json(
        { error: "ID inválido" },
        { status: 400 }
      );
    }

    // 🔐 Deletar APENAS se pertencer ao usuário
    const [deleted] = await db
      .delete(categorias)
      .where(
        and(
          eq(categorias.id, Number(id)),
          eq(categorias.userId, userId) // 🔐 Verificar ownership
        )
      )
      .returning();

    if (!deleted) {
      return NextResponse.json(
        { error: "Categoria não encontrada ou acesso negado" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Categoria removida com sucesso"
    });
  } catch (err: any) {
    console.error("Erro ao deletar categoria:", err);

    if (err instanceof Error && err.message === "Não autenticado") {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: err.message || "Erro ao deletar categoria" },
      { status: 500 }
    );
  }
}