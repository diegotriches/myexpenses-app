// src/app/api/dashboard/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { transacoes, cartoes, faturas } from "@/db/schema";
import { and, gte, lt, eq } from "drizzle-orm";
import { getUserId } from "@/lib/auth";

/**
 * GET /api/dashboard?mes=1&ano=2026
 * Retorna resumo completo do dashboard para o período
 * 
 * Response: {
 *   periodo: { mes, ano },
 *   resumo: { receitas, despesas, saldo },
 *   cartoes: [{ cartaoId, nome, totalFatura, paga }]
 * }
 */
export async function GET(req: NextRequest) {
  try {
    // 🔐 Autenticação (padrão do projeto)
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

    // Calcular período
    const inicioMes = new Date(ano, mes - 1, 1);
    const fimMes = new Date(ano, mes, 1);

    // 🔐 Buscar todas as transações do período do usuário
    const todas = await db
      .select()
      .from(transacoes)
      .where(
        and(
          eq(transacoes.userId, userId),
          gte(transacoes.data, inicioMes),
          lt(transacoes.data, fimMes)
        )
      );

    let receitas = 0;
    let despesas = 0;

    // Agrupamento por cartão
    const faturasPorCartao: Record<number, number> = {};

    for (const t of todas) {
      const valor = Number(t.valor);

      // Transações de cartão (acumulam na fatura)
      if (t.formaPagamento === "cartao" && t.cartaoId) {
        faturasPorCartao[t.cartaoId] =
          (faturasPorCartao[t.cartaoId] || 0) + valor;
        continue;
      }

      // Transações de conta (afetam fluxo de caixa imediato)
      if (t.tipo === "entrada") {
        receitas += valor;
      }

      if (t.tipo === "saida") {
        despesas += valor;
      }
    }

    // 🔐 Buscar cartões do usuário
    const cartoesDb = await db
      .select()
      .from(cartoes)
      .where(eq(cartoes.userId, userId));

    // 🔐 Buscar faturas do período para saber status de pagamento
    const faturasDb = await db
      .select({
        cartaoId: faturas.cartaoId,
        paga: faturas.paga,
      })
      .from(faturas)
      .innerJoin(cartoes, eq(faturas.cartaoId, cartoes.id))
      .where(
        and(
          eq(cartoes.userId, userId),
          eq(faturas.mes, mes),
          eq(faturas.ano, ano)
        )
      );

    // Mapear status de pagamento por cartão
    const statusPagamento = new Map<number, boolean>();
    faturasDb.forEach(f => {
      statusPagamento.set(f.cartaoId, f.paga);
    });

    // Montar resumo de cartões com status correto
    const cartoesResumo = cartoesDb.map((c) => ({
      cartaoId: c.id,
      nome: c.nome,
      totalFatura: faturasPorCartao[c.id] || 0,
      paga: statusPagamento.get(c.id) || false,
    }));

    return NextResponse.json({
      periodo: { mes, ano },
      resumo: {
        receitas,
        despesas,
        saldo: receitas - despesas,
      },
      cartoes: cartoesResumo,
    });
  } catch (error: any) {
    console.error("Erro ao carregar dashboard:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao carregar dashboard" },
      { status: 500 }
    );
  }
}