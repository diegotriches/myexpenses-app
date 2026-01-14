import { NextResponse } from "next/server";
import { db } from "@/db";
import { categorias } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";

// GET - Buscar todas as categorias do usuário
export async function GET() {
  try {
    // 🔐 Autenticação
    const userId = await getUserId();

    // ✅ VALIDAÇÃO: Retorna 401 se não autenticado
    if (!userId) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    // 🔐 Buscar APENAS categorias do usuário
    const rows = await db
      .select()
      .from(categorias)
      .where(eq(categorias.userId, userId))
      .orderBy(categorias.tipo, categorias.nome);

    return NextResponse.json(rows);
  } catch (err: any) {
    console.error("Erro ao buscar categorias:", err);
    const message = err instanceof Error ? err.message : "Erro ao buscar categorias";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST - Criar nova categoria
export async function POST(req: Request) {
  try {
    // 🔐 Autenticação
    const userId = await getUserId();

    // ✅ VALIDAÇÃO: Retorna 401 se não autenticado
    if (!userId) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    const { nome, tipo, icone } = await req.json();

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

    // ✅ Criar categoria com UUID gerado
    const [inserted] = await db
      .insert(categorias)
      .values({
        id: uuidv4(),
        userId,
        nome,
        tipo,
        icone,
      })
      .returning();

    return NextResponse.json(inserted, { status: 201 });
  } catch (err: any) {
    console.error("Erro ao criar categoria:", err);
    const message = err instanceof Error ? err.message : "Erro ao criar categoria";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}