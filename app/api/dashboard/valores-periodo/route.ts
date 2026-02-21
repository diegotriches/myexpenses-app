// src/app/api/dashboard/valores-periodo/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { transacoes, cartoes } from "@/db/schema";
import { and, gte, lt, eq } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import { calcularFaturaDaTransacao } from "@/utils/faturaUtils";

/**
 * GET /api/dashboard/valores-periodo?mes=1&ano=2026
 * Retorna receitas recebidas, a receber e despesas a pagar no período
 *
 * Response: {
 *   recebidos: number,   // receitas com data <= hoje
 *   aReceber: number,    // receitas com data > hoje
 *   aPagar: number,      // despesas com data > hoje
 *   projecao: number     // aReceber - aPagar
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

    if (!mes || !ano || mes < 1 || mes > 12) {
      return NextResponse.json(
        { error: "Mês e ano são obrigatórios (mes: 1-12)" },
        { status: 400 }
      );
    }

    const inicioMes = new Date(ano, mes - 1, 1);
    const fimMes = new Date(ano, mes, 1);

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    // Buscar todas as transações do período
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

    // Buscar cartões para calcular ciclo de fatura (igual ao route.ts principal)
    const cartoesDb = await db
      .select()
      .from(cartoes)
      .where(eq(cartoes.userId, userId));

    const cartoesMap = new Map(cartoesDb.map((c) => [c.id, c]));

    let recebidos = 0;
    let aReceber = 0;
    let aPagar = 0;

    for (const t of todas) {
      const valor = Number(t.valor);
      const dataTransacao = new Date(t.data);
      dataTransacao.setHours(0, 0, 0, 0);
      const isFutura = dataTransacao > hoje;

      if (t.tipo === "entrada") {
        if (isFutura) {
          aReceber += valor;
        } else {
          recebidos += valor;
        }
      }

      if (t.tipo === "saida" && isFutura) {
        // Despesas de cartão: verificar se a fatura pertence ao mês atual
        if (t.formaPagamento === "cartao" && t.cartaoId) {
          const cartao = cartoesMap.get(t.cartaoId);
          if (cartao) {
            const { mes: mesFatura, ano: anoFatura } = calcularFaturaDaTransacao(
              dataTransacao,
              cartao.diaFechamento || 1
            );
            if (mesFatura === mes && anoFatura === ano) {
              aPagar += valor;
            }
          }
        } else {
          aPagar += valor;
        }
      }
    }

    return NextResponse.json({
      recebidos,
      aReceber,
      aPagar,
      projecao: aReceber - aPagar,
    });
  } catch (error: any) {
    console.error("Erro ao carregar valores do período:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao carregar valores do período" },
      { status: 500 }
    );
  }
}