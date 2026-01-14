// src/app/api/dashboard/recorrentes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { db } from "@/db";
import { transacoes } from "@/db/schema";
import { eq, and, gte, lt } from "drizzle-orm";

/**
 * GET /api/dashboard/recorrentes?mes=1&ano=2026
 * Retorna transações recorrentes do período
 * 
 * Response: Transacao[] (array de transações com recorrente === true)
 */
export async function GET(req: NextRequest) {
  try {
    // 1. Validar autenticação
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    // 2. Validar parâmetros
    const { searchParams } = new URL(req.url);
    const mes = Number(searchParams.get("mes"));
    const ano = Number(searchParams.get("ano"));

    if (!mes || !ano) {
      return NextResponse.json(
        { error: "Mês e ano são obrigatórios" },
        { status: 400 }
      );
    }

    if (mes < 1 || mes > 12) {
      return NextResponse.json(
        { error: "Mês deve estar entre 1 e 12" },
        { status: 400 }
      );
    }

    // 3. Calcular período (usando lt em vez de lte)
    const inicioMes = new Date(ano, mes - 1, 1);
    const fimMes = new Date(ano, mes, 1);

    // 4. Buscar transações recorrentes do período
    const transacoesRecorrentes = await db
      .select()
      .from(transacoes)
      .where(
        and(
          eq(transacoes.userId, userId),
          eq(transacoes.recorrente, true),
          gte(transacoes.data, inicioMes),
          lt(transacoes.data, fimMes)
        )
      );

    // 5. Retornar resultado
    return NextResponse.json(transacoesRecorrentes);
  } catch (error: any) {
    console.error("Erro ao buscar transações recorrentes:", error);
    return NextResponse.json(
      { error: error.message || "Erro interno do servidor" },
      { status: 500 }
    );
  }
}