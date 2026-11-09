import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { transacoes } from "@/db/schema";
import { and, eq, desc, lte } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import { respostaDeErro } from "@/lib/rota";

/**
 * GET /api/dashboard/transacoes-recentes?limit=5
 * Retorna as últimas N transações do usuário, ordenadas por data decrescente
 *
 * Response: {
 *   transacoes: [{
 *     id, descricao, valor, data, tipo,
 *     categoria, categoriaId,
 *     parcelado, parcelas, parcelaAtual,
 *     recorrente
 *   }]
 * }
 */
export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit") || "5"), 50);

    const hoje = new Date();
    hoje.setHours(23, 59, 59, 999);

    const recentes = await db
      .select({
        id: transacoes.id,
        descricao: transacoes.descricao,
        valor: transacoes.valor,
        data: transacoes.data,
        tipo: transacoes.tipo,
        categoria: transacoes.categoria,
        parcelado: transacoes.parcelado,
        parcelas: transacoes.parcelas,
        parcelaAtual: transacoes.parcelaAtual,
        recorrente: transacoes.recorrente,
      })
      .from(transacoes)
      .where(
        and(
          eq(transacoes.userId, userId),
          lte(transacoes.data, hoje)
        )
      )
      .orderBy(desc(transacoes.data))
      .limit(limit);

    return NextResponse.json({
      transacoes: recentes.map((t) => ({
        id: t.id,
        descricao: t.descricao || null,
        valor: Number(t.valor),
        data: t.data,
        tipo: t.tipo,
        categoria: t.categoria || null,
        parcelado: t.parcelado || false,
        parcelas: t.parcelas || null,
        parcelaAtual: t.parcelaAtual || null,
        recorrente: t.recorrente || false,
      })),
    });
  } catch (error) {
    return respostaDeErro(error, "Erro ao carregar transações recentes");
  }
}