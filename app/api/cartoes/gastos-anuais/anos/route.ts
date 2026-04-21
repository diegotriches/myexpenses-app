// src/app/api/cartoes/gastos-anuais/anos/route.ts

import { NextResponse } from "next/server";
import { db } from "@/db";
import { cartoes, faturas } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getUserId } from "@/lib/auth";

/**
 * GET /api/cartoes/gastos-anuais/anos
 *
 * Retorna todos os anos distintos que possuem faturas
 * de cartões de crédito do usuário, em ordem decrescente.
 *
 * Resposta: { anos: number[] }
 * Exemplo:  { anos: [2026, 2025, 2024] }
 */
export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // Busca IDs dos cartões de crédito do usuário
    const cartoesCredito = await db
      .select({ id: cartoes.id })
      .from(cartoes)
      .where(eq(cartoes.userId, userId));

    if (cartoesCredito.length === 0) {
      return NextResponse.json({ anos: [] });
    }

    const ids = cartoesCredito.map((c) => c.id);

    // Busca todas as faturas do usuário e extrai anos distintos em memória
    // (mesma estratégia da rota principal — compatível com neon-http)
    const todasFaturas = await db
      .select({ ano: faturas.ano, cartaoId: faturas.cartaoId })
      .from(faturas)
      .where(eq(faturas.userId, userId));

    const anosSet = new Set<number>();
    for (const f of todasFaturas) {
      if (ids.includes(f.cartaoId)) {
        anosSet.add(f.ano);
      }
    }

    // Ordena decrescente (mais recente primeiro)
    const anos = Array.from(anosSet).sort((a, b) => b - a);

    // Garante que o ano atual sempre aparece (útil antes do primeiro registro)
    const anoAtual = new Date().getFullYear();
    if (!anosSet.has(anoAtual)) {
      anos.unshift(anoAtual);
    }

    return NextResponse.json({ anos });
  } catch (error) {
    console.error("Erro ao buscar anos disponíveis:", error);
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}