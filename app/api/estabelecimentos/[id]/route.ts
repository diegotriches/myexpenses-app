import { NextResponse } from "next/server";
import { db } from "@/db";
import { estabelecimentos } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import { respostaDeErro } from "@/lib/rota";

// GET - Buscar estabelecimento específico
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { id } = await params;

    const [estabelecimento] = await db
      .select()
      .from(estabelecimentos)
      .where(
        and(
          eq(estabelecimentos.id, id),
          eq(estabelecimentos.userId, userId)
        )
      )
      .limit(1);

    if (!estabelecimento) {
      return NextResponse.json(
        { error: "Estabelecimento não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(estabelecimento);
  } catch (error) {
    return respostaDeErro(error);
  }
}

// PUT - Atualizar estabelecimento
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { nome, icone, localizacao } = body;

    if (nome !== undefined && !nome?.trim()) {
      return NextResponse.json({ error: "Nome não pode ser vazio" }, { status: 400 });
    }

    if (icone !== undefined && !icone?.trim()) {
      return NextResponse.json({ error: "Ícone não pode ser vazio" }, { status: 400 });
    }

    const dadosAtualizacao: Partial<typeof estabelecimentos.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (nome !== undefined)        dadosAtualizacao.nome        = nome.trim();
    if (icone !== undefined)       dadosAtualizacao.icone       = icone.trim();
    if (localizacao !== undefined) dadosAtualizacao.localizacao = localizacao?.trim() || null;

    const [atualizado] = await db
      .update(estabelecimentos)
      .set(dadosAtualizacao)
      .where(
        and(
          eq(estabelecimentos.id, id),
          eq(estabelecimentos.userId, userId)
        )
      )
      .returning();

    if (!atualizado) {
      return NextResponse.json(
        { error: "Estabelecimento não encontrado ou acesso negado" },
        { status: 404 }
      );
    }

    return NextResponse.json(atualizado);
  } catch (error) {
    return respostaDeErro(error);
  }
}

// DELETE - Remover estabelecimento
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { id } = await params;

    const [deletado] = await db
      .delete(estabelecimentos)
      .where(
        and(
          eq(estabelecimentos.id, id),
          eq(estabelecimentos.userId, userId)
        )
      )
      .returning();

    if (!deletado) {
      return NextResponse.json(
        { error: "Estabelecimento não encontrado ou acesso negado" },
        { status: 404 }
      );
    }

    // Obs.: as transações vinculadas têm o campo estabelecimentoId zerado
    // automaticamente pelo ON DELETE SET NULL definido no schema.

    return NextResponse.json({ message: "Estabelecimento removido com sucesso" });
  } catch (error) {
    return respostaDeErro(error);
  }
}