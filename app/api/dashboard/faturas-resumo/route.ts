// src/app/api/dashboard/faturas-resumo/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { db } from "@/db";
import { faturas, cartoes } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * GET /api/dashboard/faturas-resumo?mes=1&ano=2026
 * Retorna resumo de faturas (total, pago, em aberto)
 * 
 * Response: { totalFaturas: number, totalPago: number, totalAberto: number }
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

    // 3. Buscar faturas do mês com JOIN em cartões para filtrar por userId
    const faturasDoMes = await db
      .select({
        id: faturas.id,
        total: faturas.total,
        paga: faturas.paga,
        mes: faturas.mes,
        ano: faturas.ano,
      })
      .from(faturas)
      .innerJoin(cartoes, eq(faturas.cartaoId, cartoes.id))
      .where(
        and(
          eq(cartoes.userId, userId),
          eq(faturas.mes, mes),
          eq(faturas.ano, ano)
        )
      );

    // 4. Calcular totais
    const totalFaturas = faturasDoMes.reduce((acc, f) => 
      acc + Number(f.total), 0
    );
    
    const totalPago = faturasDoMes
      .filter(f => f.paga)
      .reduce((acc, f) => acc + Number(f.total), 0);
    
    const totalAberto = totalFaturas - totalPago;

    // 5. Retornar resultado
    return NextResponse.json({
      totalFaturas,
      totalPago,
      totalAberto,
    });
  } catch (error: any) {
    console.error("Erro ao buscar resumo de faturas:", error);
    return NextResponse.json(
      { error: error.message || "Erro interno do servidor" },
      { status: 500 }
    );
  }
}