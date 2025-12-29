import { db } from "@/db";
import { users } from "@/db/schema";
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getUserId } from "@/lib/auth";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = Number(params.id);
    const body = await req.json();

    const { name, email, rendaMensal, metaEconomia } = body;

    // Verifica se email já existe (para outro usuário)
    if (email) {
      const emailExistente = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (emailExistente.length > 0 && emailExistente[0].id !== id) {
        return NextResponse.json(
          { message: "Este email já está em uso" },
          { status: 400 }
        );
      }
    }

    const [atualizado] = await db
      .update(users)
      .set({
        name: name || undefined,
        email: email || undefined,
      })
      .where(eq(users.id, id))
      .returning();

    if (!atualizado) {
      return NextResponse.json(
        { message: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(atualizado);
  } catch (err: any) {
    console.error("Erro ao atualizar usuário:", err);
    return NextResponse.json(
      { message: err.message || "Erro ao atualizar usuário" },
      { status: 500 }
    );
  }
}

// Deletar usuário
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = Number(params.id);

    const [deletado] = await db
      .delete(users)
      .where(eq(users.id, id))
      .returning();

    if (!deletado) {
      return NextResponse.json(
        { message: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Usuário deletado com sucesso" });
  } catch (err: any) {
    console.error("Erro ao deletar usuário:", err);
    return NextResponse.json(
      { message: err.message || "Erro ao deletar usuário" },
      { status: 500 }
    );
  }
}