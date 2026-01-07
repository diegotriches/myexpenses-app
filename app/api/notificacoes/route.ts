// src/app/api/notificacoes/route.ts

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { notificacoes } from "@/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import type { CriarNotificacaoDTO } from "@/types/notificacao";

/**
 * GET /api/notificacoes
 * Lista notificações do usuário
 * Query params: ?lidas=true/false&limite=10
 */
export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const lidasParam = searchParams.get("lidas");
    const limiteParam = searchParams.get("limite");

    // Construir condições WHERE
    const conditions = [eq(notificacoes.userId, userId)];
    
    // Filtrar por status de lida
    if (lidasParam !== null) {
      const lidas = lidasParam === "true";
      conditions.push(eq(notificacoes.lida, lidas));
    }

    // Parsear limite
    const limite = limiteParam ? parseInt(limiteParam, 10) : undefined;

    // Construir query completa de uma vez
    const queryBase = db
      .select()
      .from(notificacoes)
      .where(and(...conditions))
      .orderBy(desc(notificacoes.createdAt));

    // Executar com ou sem limite
    const results = limite && limite > 0 
      ? await queryBase.limit(limite)
      : await queryBase;

    // Contar não lidas
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notificacoes)
      .where(
        and(
          eq(notificacoes.userId, userId),
          eq(notificacoes.lida, false)
        )
      );

    return NextResponse.json({
      notificacoes: results,
      total: results.length,
      naoLidas: count || 0,
    });
  } catch (error: any) {
    console.error("Erro ao listar notificações:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao listar notificações" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notificacoes
 * Cria nova notificação (uso interno ou admin)
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const body: CriarNotificacaoDTO = await req.json();

    // Validações
    if (!body.tipo || !body.severidade || !body.titulo || !body.mensagem) {
      return NextResponse.json(
        { error: "Campos obrigatórios: tipo, severidade, titulo, mensagem" },
        { status: 400 }
      );
    }

    const [notificacao] = await db
      .insert(notificacoes)
      .values({
        userId,
        tipo: body.tipo,
        severidade: body.severidade,
        titulo: body.titulo,
        mensagem: body.mensagem,
        link: body.link,
        metadata: body.metadata,
      })
      .returning();

    return NextResponse.json(notificacao, { status: 201 });
  } catch (error: any) {
    console.error("Erro ao criar notificação:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao criar notificação" },
      { status: 500 }
    );
  }
}