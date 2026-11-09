// src/app/api/antecipacoes/route.ts

import { NextResponse } from "next/server";
import { db } from "@/db";
import { antecipacoesParcela, faturas } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getUserId } from "@/lib/auth";

/**
 * GET /api/antecipacoes
 * Lista TODAS as antecipações do usuário (não escopada por parcelamento),
 * cada uma já indicando se ainda pode ser desfeita (fatura atual não paga).
 * Usada pela aba Parcelas pra saber quais parcelamentos totalmente
 * antecipados (sem parcelas futuras restantes) ainda precisam continuar
 * visíveis, já que a antecipação pode ser desfeita.
 */
export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const registros = await db.select().from(antecipacoesParcela).where(eq(antecipacoesParcela.userId, userId));

  const resultado = [];
  for (const r of registros) {
    const [fatura] = await db.select({ paga: faturas.paga }).from(faturas)
      .where(eq(faturas.id, r.faturaAtualId)).limit(1);
    resultado.push({ ...r, podeDesfazer: !fatura?.paga });
  }

  return NextResponse.json(resultado);
}