// src/app/api/aplicacoes/[id]/recalcular/route.ts
//
// Força o recálculo completo da aplicação (busca no BCB o que faltar e
// refaz rendimento/IR por lote). Útil logo após importar o histórico ou
// pra atualizar na hora, sem esperar o cron.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { aplicacoes } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import { recalcularAplicacao } from "@/lib/aplicacaoEngine";

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { id } = await context.params;
    const [aplicacao] = await db.select({ id: aplicacoes.id }).from(aplicacoes)
      .where(and(eq(aplicacoes.id, id), eq(aplicacoes.userId, userId))).limit(1);
    if (!aplicacao) return NextResponse.json({ error: "Aplicação não encontrada" }, { status: 404 });

    const r = await recalcularAplicacao(id);
    if (!r) return NextResponse.json({ error: "Nada a recalcular (resgatada ou sem aportes)" }, { status: 400 });

    return NextResponse.json({
      ok: true,
      statusBcb: r.statusBcb,
      valorAtual: Number(r.sim.valorAtual.toFixed(2)),
      principal: Number(r.sim.principal.toFixed(2)),
    });
  } catch (error: any) {
    console.error("Erro ao recalcular aplicação:", error);
    return NextResponse.json({ error: error.message || "Erro ao recalcular" }, { status: 500 });
  }
}