import { db } from "@/db";
import { users } from "@/db/schema";
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getUserId } from "@/lib/auth";

// GET - Buscar preferências
export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId();

    if (!userId) {
      return NextResponse.json(
        { message: "Não autenticado" },
        { status: 401 }
      );
    }

    const [usuario] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!usuario) {
      return NextResponse.json(
        { message: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    // Retorna preferências com valores padrão se não existirem
    const preferencias = usuario.preferencias || {
      tema: "system",
      idioma: "pt-BR",
      moeda: "BRL",
      notificacoes: true,
      notificacoesEmail: false,
      formatoData: "DD/MM/YYYY",
      inicioSemana: "domingo",
    };

    return NextResponse.json(preferencias);
  } catch (err: any) {
    console.error("Erro ao buscar preferências:", err);
    return NextResponse.json(
      { message: err.message || "Erro ao buscar preferências" },
      { status: 500 }
    );
  }
}

// PUT - Atualizar preferências
export async function PUT(req: NextRequest) {
  try {
    const userId = await getUserId();

    if (!userId) {
      return NextResponse.json(
        { message: "Não autenticado" },
        { status: 401 }
      );
    }

    const body = await req.json();

    // Validação básica
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { message: "Dados inválidos" },
        { status: 400 }
      );
    }

    const [atualizado] = await db
      .update(users)
      .set({ preferencias: body })
      .where(eq(users.id, userId))
      .returning();

    if (!atualizado) {
      return NextResponse.json(
        { message: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(atualizado.preferencias);
  } catch (err: any) {
    console.error("Erro ao atualizar preferências:", err);
    return NextResponse.json(
      { message: err.message || "Erro ao atualizar preferências" },
      { status: 500 }
    );
  }
}