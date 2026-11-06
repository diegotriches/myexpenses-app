// src/app/api/dashboard/recorrentes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { db } from "@/db";
import { transacoes } from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { calcularIntervaloAno, lerAnoDaRequisicao } from "@/utils/periodoAno";

/**
 * GET /api/dashboard/recorrentes?ano=2026
 * Retorna transações recorrentes do ano informado
 * (até o mês atual, se for o ano vigente).
 */
export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const ano = lerAnoDaRequisicao(req.nextUrl.searchParams.get("ano"));
    if (ano === null) {
      return NextResponse.json({ error: "Ano inválido" }, { status: 400 });
    }

    const { inicio, fim } = calcularIntervaloAno(ano);

    const transacoesRecorrentes = await db
      .select()
      .from(transacoes)
      .where(
        and(
          eq(transacoes.userId, userId),
          eq(transacoes.recorrente, true),
          gte(transacoes.data, inicio),
          lte(transacoes.data, fim)
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