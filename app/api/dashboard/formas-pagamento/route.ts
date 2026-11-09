// src/app/api/dashboard/formas-pagamento/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { db } from "@/db";
import { transacoes } from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { contarFormas } from "@/utils/dashboardUtils";
import { calcularIntervaloAno, lerAnoDaRequisicao } from "@/utils/periodoAno";
import { respostaDeErro } from "@/lib/rota";

/**
 * GET /api/dashboard/formas-pagamento?ano=2026
 * Retorna contagem de transações por tipo (à vista, parcelado, recorrente)
 * no ano informado (até o mês atual, se for o ano vigente).
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

    const transacoesPeriodo = await db
      .select()
      .from(transacoes)
      .where(
        and(
          eq(transacoes.userId, userId),
          gte(transacoes.data, inicio),
          lte(transacoes.data, fim)
        )
      );

    const formas = contarFormas(transacoesPeriodo as any);

    return NextResponse.json(formas);
  } catch (error) {
    return respostaDeErro(error, "Erro interno do servidor");
  }
}