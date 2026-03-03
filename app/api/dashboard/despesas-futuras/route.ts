// src/app/api/dashboard/despesas-futuras/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { transacoes, cartoes, faturas } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import { calcularFaturaDaTransacao } from "@/utils/faturaUtils";
import type { DespesasFuturas } from "@/types/dashboard";

/**
 * GET /api/dashboard/despesas-futuras?mes=1&ano=2026
 *
 * Retorna o total de despesas em cartoes que cairao em faturas FUTURAS
 * (posteriores ao mes/ano informado) e que ainda nao foram pagas.
 *
 * OTIMIZADO: busca todas as faturas de uma vez antes do loop
 * eliminando o problema de N+1 queries.
 */
export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const mes = Number(searchParams.get("mes"));
    const ano = Number(searchParams.get("ano"));

    if (!mes || !ano || mes < 1 || mes > 12) {
      return NextResponse.json(
        { error: "Mes e ano invalidos" },
        { status: 400 }
      );
    }

    // 1. Buscar transacoes de cartao do usuario em paralelo com cartoes e faturas
    const [transacoesCartao, cartoesDb, faturasDb] = await Promise.all([
      db
        .select({
          id: transacoes.id,
          data: transacoes.data,
          valor: transacoes.valor,
          cartaoId: transacoes.cartaoId,
        })
        .from(transacoes)
        .where(
          and(
            eq(transacoes.userId, userId),
            eq(transacoes.tipo, "saida"),
            eq(transacoes.formaPagamento, "cartao")
          )
        ),

      db
        .select()
        .from(cartoes)
        .where(eq(cartoes.userId, userId)),

      // Busca TODAS as faturas do usuario de uma vez — sem loop
      db
        .select({
          cartaoId: faturas.cartaoId,
          mes: faturas.mes,
          ano: faturas.ano,
          paga: faturas.paga,
        })
        .from(faturas)
        .where(eq(faturas.userId, userId)),
    ]);

    // 2. Mapas para lookup O(1)
    const cartoesMap = new Map(cartoesDb.map((c) => [c.id, c]));

    // Chave: "cartaoId-mes-ano" => paga
    const faturasMap = new Map<string, boolean>();
    for (const f of faturasDb) {
      faturasMap.set(f.cartaoId + "-" + f.mes + "-" + f.ano, f.paga);
    }

    // 3. Processar transacoes em memoria — zero queries adicionais
    let total = 0;
    let quantidade = 0;

    for (const transacao of transacoesCartao) {
      if (!transacao.cartaoId) continue;

      const cartao = cartoesMap.get(transacao.cartaoId);
      if (!cartao) continue;

      const diaFechamento = cartao.diaFechamento || 1;

      const { mes: mesFatura, ano: anoFatura } = calcularFaturaDaTransacao(
        new Date(transacao.data),
        diaFechamento
      );

      // Verifica se a fatura e futura
      const isFutura =
        anoFatura > ano ||
        (anoFatura === ano && mesFatura > mes);

      if (!isFutura) continue;

      // Lookup em memoria — O(1), sem query
      const chave = transacao.cartaoId + "-" + mesFatura + "-" + anoFatura;
      const paga = faturasMap.get(chave) ?? false;

      if (!paga) {
        total += Number(transacao.valor);
        quantidade++;
      }
    }

    return NextResponse.json<DespesasFuturas>({
      total: Number(total.toFixed(2)),
      quantidade,
    });
  } catch (error: any) {
    console.error("Erro ao buscar despesas futuras:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao buscar despesas futuras" },
      { status: 500 }
    );
  }
}