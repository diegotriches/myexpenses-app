import { NextResponse } from "next/server";
import { db } from "@/db";
import { estabelecimentos } from "@/db/schema";
import { sql } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import { respostaDeErro } from "@/lib/rota";

/**
 * GET /api/estabelecimentos
 *
 * Retorna todos os estabelecimentos do usuário com stats calculados:
 * - totalTransacoes: quantidade de transações vinculadas
 * - totalEntrada: soma dos valores das transações do tipo "entrada"
 * - totalSaida: soma dos valores das transações do tipo "saida"
 */
export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

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
        COALESCE(SUM(CASE WHEN t.tipo = 'entrada' THEN CAST(t.valor AS NUMERIC) ELSE 0 END), 0)::float AS "totalEntrada",
        COALESCE(SUM(CASE WHEN t.tipo = 'saida'   THEN CAST(t.valor AS NUMERIC) ELSE 0 END), 0)::float AS "totalSaida"
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
    return respostaDeErro(error);
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
      { ...novo, totalTransacoes: 0, totalEntrada: 0, totalSaida: 0 },
      { status: 201 }
    );
  } catch (error) {
    return respostaDeErro(error);
  }
}