import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { db } from "@/db";
import { faturas, cartoes } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * GET /api/dashboard/faturas-resumo?periodo=6
 * Retorna resumo de faturas (total, pago, em aberto) dos últimos N meses
 * a partir de hoje.
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

    // Gera o conjunto {mes, ano} dos últimos N meses a partir de hoje
    // (mesmo padrão usado em grafico-meses)
    const hoje = new Date();
    const mesesValidos = new Set<string>();
    for (let i = 0; i < numMeses; i++) {
      const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      mesesValidos.add(`${data.getFullYear()}-${data.getMonth() + 1}`);
    }

    // Busca todas as faturas do usuário (via JOIN em cartões) e filtra em memória —
    // mes/ano são colunas separadas, então gte/lte não funciona de forma segura
    // na virada de ano
    const todasFaturas = await db
      .select({
        id: faturas.id,
        total: faturas.total,
        paga: faturas.paga,
        mes: faturas.mes,
        ano: faturas.ano,
      })
      .from(faturas)
      .innerJoin(cartoes, eq(faturas.cartaoId, cartoes.id))
      .where(eq(cartoes.userId, userId));

    const faturasDoPeriodo = todasFaturas.filter((f) =>
      mesesValidos.has(`${f.ano}-${f.mes}`)
    );

    const totalFaturas = faturasDoPeriodo.reduce((acc, f) => acc + Number(f.total), 0);
    const totalPago = faturasDoPeriodo
      .filter((f) => f.paga)
      .reduce((acc, f) => acc + Number(f.total), 0);
    const totalAberto = totalFaturas - totalPago;

    return NextResponse.json({ totalFaturas, totalPago, totalAberto });
  } catch (error: any) {
    console.error("Erro ao buscar resumo de faturas:", error);
    return NextResponse.json(
      { error: error.message || "Erro interno do servidor" },
      { status: 500 }
    );
  }
}