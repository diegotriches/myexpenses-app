import { NextResponse } from "next/server";
import { db } from "@/db";
import { notas } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import type { CreateNotaDTO } from "@/types/nota";
import { respostaDeErro } from "@/lib/rota";

const CORES_VALIDAS = ["yellow", "blue", "green", "red", "purple", "gray"] as const;

// GET /api/notas — lista todas as notas do usuário, mais recentes primeiro
export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const lista = await db
      .select()
      .from(notas)
      .where(eq(notas.userId, userId))
      .orderBy(desc(notas.updatedAt));

    return NextResponse.json(lista);
  } catch (error) {
    return respostaDeErro(error, "Erro ao listar notas");
  }
}

// POST /api/notas — cria nova nota
export async function POST(req: Request) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const body: CreateNotaDTO = await req.json();
    const { titulo, conteudo, cor = "yellow" } = body;

    if (titulo !== undefined && titulo.length > 100)
      return NextResponse.json({ error: "Título muito longo (máx. 100 caracteres)" }, { status: 400 });

    if (!CORES_VALIDAS.includes(cor as any))
      return NextResponse.json({ error: "Cor inválida" }, { status: 400 });

    const [nova] = await db
      .insert(notas)
      .values({
        userId,
        titulo:   (titulo ?? "").trim(),
        conteudo: (conteudo ?? "").trim(),
        cor,
      })
      .returning();

    return NextResponse.json(nova, { status: 201 });
  } catch (error) {
    return respostaDeErro(error, "Erro ao criar nota");
  }
}