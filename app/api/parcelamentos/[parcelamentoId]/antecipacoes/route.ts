import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { antecipacoesParcela, faturas } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getUserId } from "@/lib/auth";

/**
 * GET /api/parcelamentos/[parcelamentoId]/antecipacoes
 * Lista as antecipações registradas para um parcelamento, já indicando
 * se cada uma ainda pode ser desfeita (fatura atual não paga).
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ parcelamentoId: string }> }
) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { parcelamentoId } = await context.params;

  const registros = await db.select().from(antecipacoesParcela)
    .where(and(eq(antecipacoesParcela.parcelamentoId, parcelamentoId), eq(antecipacoesParcela.userId, userId)));

  const resultado = [];
  for (const r of registros) {
    const [fatura] = await db.select({ paga: faturas.paga }).from(faturas)
      .where(eq(faturas.id, r.faturaAtualId)).limit(1);
    resultado.push({ ...r, podeDesfazer: !fatura?.paga });
  }

  return NextResponse.json(resultado);
}