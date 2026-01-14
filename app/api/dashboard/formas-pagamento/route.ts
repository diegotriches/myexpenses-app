// src/app/api/dashboard/formas-pagamento/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { db } from "@/db";
import { transacoes } from "@/db/schema";
import { eq, and, gte, lt } from "drizzle-orm";
import { contarFormas } from "@/utils/dashboardUtils";

/**
 * GET /api/dashboard/formas-pagamento?mes=1&ano=2026
 * Retorna contagem de transações por tipo (à vista, parcelado, recorrente)
 * 
 * Response: { aVista: number, parcelado: number, recorrente: number }
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

    // 3. Calcular período (usando lt em vez de lte para evitar sobreposição)
    const inicioMes = new Date(ano, mes - 1, 1);
    const fimMes = new Date(ano, mes, 1);

    // 4. Buscar transações do período
    const transacoesMes = await db
      .select()
      .from(transacoes)
      .where(
        and(
          eq(transacoes.userId, userId),
          gte(transacoes.data, inicioMes),
          lt(transacoes.data, fimMes)
        )
      );

    // 5. Calcular formas usando função do dashboardUtils
    const formas = contarFormas(transacoesMes as any);

    // 6. Retornar resultado
    return NextResponse.json(formas);
  } catch (error: any) {
    console.error("Erro ao buscar formas de pagamento:", error);
    return NextResponse.json(
      { error: error.message || "Erro interno do servidor" },
      { status: 500 }
    );
  }
}