//
// Marca (ou desmarca) DARFs como pagos. Não movimenta conta: é só controle.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { irDarfRv } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import { respostaDeErro } from "@/lib/rota";

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const body = await req.json();
    const itens: { competencia: string; valor: number }[] = Array.isArray(body?.itens) ? body.itens : [];
    if (itens.length === 0 || itens.length > 600)
      return NextResponse.json({ error: "Informe de 1 a 600 DARFs" }, { status: 400 });
    if (typeof body?.pago !== "boolean")
      return NextResponse.json({ error: "Campo 'pago' obrigatório" }, { status: 400 });

    for (const i of itens) {
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(i?.competencia)) || !Number.isFinite(Number(i?.valor)) || Number(i.valor) < 0)
        return NextResponse.json({ error: "DARF inválido" }, { status: 400 });
    }

    if (body.pago) {
      await db
        .insert(irDarfRv)
        .values(itens.map((i) => ({ userId, competencia: i.competencia, valor: Number(i.valor).toFixed(2) })))
        .onConflictDoNothing();
    } else {
      await db
        .delete(irDarfRv)
        .where(and(eq(irDarfRv.userId, userId), inArray(irDarfRv.competencia, itens.map((i) => i.competencia))));
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return respostaDeErro(error, "Erro ao atualizar DARF");
  }
}