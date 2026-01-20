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
 * Retorna o total de despesas em cartões que cairão em faturas FUTURAS
 * (posteriores ao mês/ano informado) e que ainda não foram pagas.
 * 
 * Response: DespesasFuturas {
 *   total: number,      // Soma dos valores
 *   quantidade: number  // Quantidade de transações
 * }
 */
export async function GET(req: NextRequest) {
  try {
    // 🔐 Autenticação
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    // Validar parâmetros
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

    // 1. Buscar TODAS as transações de cartão do usuário (não pagas)
    const transacoesCartao = await db
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
      );

    // 2. Buscar cartões do usuário (precisamos do diaFechamento)
    const cartoesDb = await db
      .select()
      .from(cartoes)
      .where(eq(cartoes.userId, userId));

    // Mapear cartões por ID para acesso rápido
    const cartoesMap = new Map(cartoesDb.map(c => [c.id, c]));

    let total = 0;
    let quantidade = 0;

    // 3. Processar cada transação
    for (const transacao of transacoesCartao) {
      if (!transacao.cartaoId) continue;

      const cartao = cartoesMap.get(transacao.cartaoId);
      if (!cartao) continue;

      const diaFechamento = cartao.diaFechamento || 1;

      // Calcular qual fatura a transação pertence
      const { mes: mesFatura, ano: anoFatura } = calcularFaturaDaTransacao(
        new Date(transacao.data),
        diaFechamento
      );

      // Verificar se a fatura é FUTURA (mês > atual OU ano > atual)
      const isFutura = 
        anoFatura > ano || 
        (anoFatura === ano && mesFatura > mes);

      if (!isFutura) continue;

      // Buscar fatura para verificar se está paga
      const [fatura] = await db
        .select()
        .from(faturas)
        .where(
          and(
            eq(faturas.cartaoId, transacao.cartaoId),
            eq(faturas.userId, userId),
            eq(faturas.mes, mesFatura),
            eq(faturas.ano, anoFatura)
          )
        );

      // Se fatura não existe OU não está paga, contabilizar
      if (!fatura || !fatura.paga) {
        total += Number(transacao.valor);
        quantidade++;
      }
    }

    return NextResponse.json<DespesasFuturas>({
      total: Number(total.toFixed(2)),
      quantidade,
    });

  } catch (error: any) {
    console.error("❌ Erro ao buscar despesas futuras:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao buscar despesas futuras" },
      { status: 500 }
    );
  }
}