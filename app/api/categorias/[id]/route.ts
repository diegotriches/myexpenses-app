import { NextResponse } from "next/server";
import { db } from "@/db";
import { categorias } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getUserId } from "@/lib/auth";

// GET - Buscar categoria específica
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 🔐 Autenticação
    const userId = await getUserId();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    const { id } = await params;

    // 🔐 Buscar categoria do usuário
    const [categoria] = await db
      .select()
      .from(categorias)
      .where(
        and(
          eq(categorias.id, id),
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
    const userId = await getUserId();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const { nome, tipo, icone } = body;

    // Validações
    if (!nome || !tipo || !icone) {
      return NextResponse.json(
        { error: "Nome, tipo e ícone são obrigatórios" },
        { status: 400 }
      );
    }

    // Validar tipo
    if (tipo !== "entrada" && tipo !== "saida" && tipo !== "ambos") {
      return NextResponse.json(
        { error: "Tipo deve ser 'entrada', 'saida' ou 'ambos'" },
        { status: 400 }
      );
    }

    // 🔐 Atualizar APENAS se pertencer ao usuário
    const [updated] = await db
      .update(categorias)
      .set({
        nome,
        tipo,
        icone,
      })
      .where(
        and(
          eq(categorias.id, id),
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
    const userId = await getUserId();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    const { id } = await params;

    // 🔐 Deletar APENAS se pertencer ao usuário
    const [deleted] = await db
      .delete(categorias)
      .where(
        and(
          eq(categorias.id, id),
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

    return NextResponse.json(
      { error: err.message || "Erro ao deletar categoria" },
      { status: 500 }
    );
  }
}