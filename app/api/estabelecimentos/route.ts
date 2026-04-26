// src/app/api/estabelecimentos/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { estabelecimentos, transacoes } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getUserId } from "@/lib/auth";

/**
 * GET /api/estabelecimentos
 *
 * Retorna todos os estabelecimentos do usuário com stats calculados:
 * - totalTransacoes: quantidade de transações vinculadas
 * - totalGasto: soma dos valores das transações vinculadas
 */
export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // Busca estabelecimentos com stats em uma única query via LEFT JOIN + GROUP BY
    const resultado = await db.execute(sql`
      SELECT
        e.id,
        e.user_id        AS "userId",
        e.nome,
        e.icone,
        e.localizacao,
        e.created_at     AS "createdAt",
        e.updated_at     AS "updatedAt",
        COUNT(t.id)::int AS "totalTransacoes",
        COALESCE(SUM(CAST(t.valor AS NUMERIC)), 0)::float AS "totalGasto"
      FROM estabelecimentos e
      LEFT JOIN transacoes t
        ON t.estabelecimento_id = e.id
       AND t.user_id = ${userId}
      WHERE e.user_id = ${userId}
      GROUP BY e.id
      ORDER BY e.nome ASC
    `);

    return NextResponse.json(resultado.rows);
  } catch (error) {
    console.error("Erro ao buscar estabelecimentos:", error);
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/estabelecimentos
 *
 * Cria um novo estabelecimento para o usuário autenticado.
 */
export async function POST(req: Request) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const body = await req.json();
    const { nome, icone, localizacao } = body;

    if (!nome?.trim()) {
      return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
    }

    if (!icone?.trim()) {
      return NextResponse.json({ error: "Ícone é obrigatório" }, { status: 400 });
    }

    const [novo] = await db
      .insert(estabelecimentos)
      .values({
        userId,
        nome: nome.trim(),
        icone: icone.trim(),
        localizacao: localizacao?.trim() || null,
      })
      .returning();

    return NextResponse.json(
      { ...novo, totalTransacoes: 0, totalGasto: 0 },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erro ao criar estabelecimento:", error);
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}