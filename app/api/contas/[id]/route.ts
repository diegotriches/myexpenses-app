import { NextResponse } from "next/server";
import { db } from "@/db";
import { contas } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getUserIdFromSession } from "@/lib/auth/helpers";

// GET - Buscar conta específica
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 🔐 Autenticação
    const userId = await getUserIdFromSession();
    const { id } = await params;

    // 🔐 Buscar conta do usuário
    const [conta] = await db
      .select()
      .from(contas)
      .where(
        and(
          eq(contas.id, id),
          eq(contas.userId, userId)
        )
      )
      .limit(1);

    if (!conta) {
      return NextResponse.json(
        { error: "Conta não encontrada" },
        { status: 404 }
      );
    }

    // Normalizar valores
    const contaNormalizada = {
      ...conta,
      saldoInicial: Number(conta.saldoInicial),
      saldoAtual: Number(conta.saldoAtual),
    };

    return NextResponse.json(contaNormalizada);
  } catch (error) {
    console.error("Erro ao buscar conta:", error);

    if (error instanceof Error && error.message === "Não autenticado") {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Erro ao buscar conta" },
      { status: 500 }
    );
  }
}

// PUT - Atualizar conta
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 🔐 Autenticação
    const userId = await getUserIdFromSession();
    const { id } = await params;
    const data = await req.json();

    // Remover campos que não devem ser atualizados diretamente
    const {
      createdAt,
      updatedAt,
      userId: _userId, // Remover userId do payload se vier
      ...payload
    } = data;

    // 🔐 Verificar se a conta existe e pertence ao usuário
    const [contaExistente] = await db
      .select()
      .from(contas)
      .where(
        and(
          eq(contas.id, id),
          eq(contas.userId, userId)
        )
      )
      .limit(1);

    if (!contaExistente) {
      return NextResponse.json(
        { error: "Conta não encontrada ou acesso negado" },
        { status: 404 }
      );
    }

    // Preparar dados para atualização
    const dadosAtualizacao: any = {
      updatedAt: new Date(),
    };

    if (payload.nome !== undefined) dadosAtualizacao.nome = payload.nome;
    if (payload.banco !== undefined) dadosAtualizacao.banco = payload.banco;
    if (payload.ativo !== undefined) dadosAtualizacao.ativo = payload.ativo;
    if (payload.observacoes !== undefined) dadosAtualizacao.observacoes = payload.observacoes;
    
    // ⚠️ Cuidado ao atualizar saldoAtual - normalmente não deve ser editado manualmente
    if (payload.saldoAtual !== undefined) {
      const saldoNum = Number(payload.saldoAtual);
      if (!Number.isNaN(saldoNum)) {
        dadosAtualizacao.saldoAtual = saldoNum.toString();
      }
    }

    // 🔐 Atualizar APENAS se pertencer ao usuário
    const [contaAtualizada] = await db
      .update(contas)
      .set(dadosAtualizacao)
      .where(
        and(
          eq(contas.id, id),
          eq(contas.userId, userId)
        )
      )
      .returning();

    // Normalizar valores
    const contaNormalizada = {
      ...contaAtualizada,
      saldoInicial: Number(contaAtualizada.saldoInicial),
      saldoAtual: Number(contaAtualizada.saldoAtual),
    };

    return NextResponse.json(contaNormalizada);
  } catch (error) {
    console.error("Erro ao atualizar conta:", error);

    if (error instanceof Error && error.message === "Não autenticado") {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Erro ao atualizar conta" },
      { status: 500 }
    );
  }
}

// DELETE - Deletar conta
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 🔐 Autenticação
    const userId = await getUserIdFromSession();
    const { id } = await params;

    // 🔐 Deletar APENAS se pertencer ao usuário
    const [deleted] = await db
      .delete(contas)
      .where(
        and(
          eq(contas.id, id),
          eq(contas.userId, userId)
        )
      )
      .returning();

    if (!deleted) {
      return NextResponse.json(
        { error: "Conta não encontrada ou acesso negado" },
        { status: 404 }
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Erro ao remover conta:", error);

    if (error instanceof Error && error.message === "Não autenticado") {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Erro ao remover conta" },
      { status: 500 }
    );
  }
}