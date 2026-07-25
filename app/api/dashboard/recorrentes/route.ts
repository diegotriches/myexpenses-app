import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { db } from "@/db";
import { transacoes } from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";

/**
 * GET /api/dashboard/recorrentes?periodo=6
 * Retorna transações recorrentes dos últimos N meses a partir de hoje.
 */
export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const periodoParam = searchParams.get("periodo") || "6";
    const numMeses = parseInt(periodoParam);

    if (isNaN(numMeses) || numMeses < 1 || numMeses > 24) {
      return NextResponse.json(
        { error: "Período inválido (1-24 meses)" },
        { status: 400 }
      );
    }

    const hoje = new Date();
    const dataInicio = new Date(hoje.getFullYear(), hoje.getMonth() - numMeses + 1, 1);
    const dataFim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59, 999);

    const transacoesRecorrentes = await db
      .select()
      .from(transacoes)
      .where(
        and(
          eq(transacoes.userId, userId),
          eq(transacoes.recorrente, true),
          gte(transacoes.data, dataInicio),
          lte(transacoes.data, dataFim)
        )
      );

    return NextResponse.json(transacoesRecorrentes);
  } catch (error: any) {
    console.error("Erro ao buscar transações recorrentes:", error);
    return NextResponse.json(
      { error: error.message || "Erro interno do servidor" },
      { status: 500 }
    );
  }
}