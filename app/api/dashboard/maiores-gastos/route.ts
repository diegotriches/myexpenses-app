// src/app/api/dashboard/maiores-gastos/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { transacoes, cartoes } from "@/db/schema";
import { and, gte, lt, eq } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import { calcularFaturaDaTransacao } from "@/utils/faturaUtils";

/**
 * GET /api/dashboard/maiores-gastos?mes=1&ano=2026&limit=5
 * Retorna os maiores gastos do período, ordenados por valor decrescente
 *
 * Response: {
 *   gastos: [{
 *     id, descricao, valor, data, categoria
 *   }],
 *   total: number,     // soma dos gastos retornados
 *   media: number      // média dos gastos retornados
 * }
 */
export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const mes = Number(searchParams.get("mes"));
    const ano = Number(searchParams.get("ano"));
    const limit = Math.min(Number(searchParams.get("limit") || "5"), 20);

    if (!mes || !ano || mes < 1 || mes > 12) {
      return NextResponse.json(
        { error: "Mês e ano são obrigatórios (mes: 1-12)" },
        { status: 400 }
      );
    }

    const inicioMes = new Date(ano, mes - 1, 1);
    const fimMes = new Date(ano, mes, 1);

    // Buscar despesas do período
    const despesas = await db
      .select({
        id: transacoes.id,
        descricao: transacoes.descricao,
        valor: transacoes.valor,
        data: transacoes.data,
        categoria: transacoes.categoria,
        formaPagamento: transacoes.formaPagamento,
        cartaoId: transacoes.cartaoId,
      })
      .from(transacoes)
      .where(
        and(
          eq(transacoes.userId, userId),
          eq(transacoes.tipo, "saida"),
          gte(transacoes.data, inicioMes),
          lt(transacoes.data, fimMes)
        )
      );

    // Buscar cartões para calcular ciclo de fatura
    const cartoesDb = await db
      .select()
      .from(cartoes)
      .where(eq(cartoes.userId, userId));

    const cartoesMap = new Map(cartoesDb.map((c) => [c.id, c]));

    // Filtrar despesas de cartão pelo ciclo de fatura (mesmo critério do route principal)
    const despesasFiltradas = despesas.filter((t) => {
      if (t.formaPagamento === "cartao" && t.cartaoId) {
        const cartao = cartoesMap.get(t.cartaoId);
        if (!cartao) return false;
        const { mes: mesFatura, ano: anoFatura } = calcularFaturaDaTransacao(
          new Date(t.data),
          cartao.diaFechamento || 1
        );
        return mesFatura === mes && anoFatura === ano;
      }
      return true;
    });

    // Ordenar por valor decrescente e pegar o top N
    const topGastos = despesasFiltradas
      .sort((a, b) => Number(b.valor) - Number(a.valor))
      .slice(0, limit)
      .map((t) => ({
        id: t.id,
        descricao: t.descricao || "Despesa sem descrição",
        valor: Number(t.valor),
        data: t.data,
        categoria: t.categoria || null,
      }));

    const total = topGastos.reduce((acc, t) => acc + t.valor, 0);

    return NextResponse.json({
      gastos: topGastos,
      total,
      media: topGastos.length > 0 ? total / topGastos.length : 0,
    });
  } catch (error: any) {
    console.error("Erro ao carregar maiores gastos:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao carregar maiores gastos" },
      { status: 500 }
    );
  }
}