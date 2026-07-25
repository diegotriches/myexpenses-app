import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { db } from "@/db";
import { transacoes } from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { contarCondicoes } from "@/utils/dashboardUtils";

/**
 * GET /api/dashboard/condicoes-pagamento?periodo=6
 * Retorna contagem de transações por forma de pagamento (dinheiro, pix, cartão)
 * nos últimos N meses a partir de hoje.
 */
export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const periodoParam = req.nextUrl.searchParams.get("periodo") || "6";
    const numMeses = parseInt(periodoParam);

    if (isNaN(numMeses) || numMeses < 1 || numMeses > 24) {
      return NextResponse.json(
        { error: "Período inválido (1-24 meses)" },
        { status: 400 }
      );
    }

    // Mesma âncora usada em grafico-meses: últimos N meses a partir de hoje
    const hoje = new Date();
    const dataInicio = new Date(hoje.getFullYear(), hoje.getMonth() - numMeses + 1, 1);
    const dataFim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59, 999);

    const transacoesPeriodo = await db
      .select()
      .from(transacoes)
      .where(
        and(
          eq(transacoes.userId, userId),
          gte(transacoes.data, dataInicio),
          lte(transacoes.data, dataFim)
        )
      );

    const condicoes = contarCondicoes(transacoesPeriodo as any);

    return NextResponse.json(condicoes);
  } catch (error: any) {
    console.error("Erro ao buscar condições de pagamento:", error);
    return NextResponse.json(
      { error: error.message || "Erro interno do servidor" },
      { status: 500 }
    );
  }
}