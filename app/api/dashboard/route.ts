import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { transacoes, cartoes } from "@/db/schema";
import { and, gte, lt, eq } from "drizzle-orm";
import { getUserIdFromSession } from "@/lib/auth/helpers";

export async function GET(req: NextRequest) {
  try {
    // 🔐 Autenticação
    const userId = await getUserIdFromSession();

    const { searchParams } = new URL(req.url);

    const mes = Number(searchParams.get("mes"));
    const ano = Number(searchParams.get("ano"));

    if (!mes || !ano) {
      return NextResponse.json(
        { error: "Mês e ano são obrigatórios" },
        { status: 400 }
      );
    }

    const inicioMes = new Date(ano, mes - 1, 1);
    const fimMes = new Date(ano, mes, 1);

    // 🔐 Todas as transações do período do usuário
    const todas = await db
      .select()
      .from(transacoes)
      .where(
        and(
          eq(transacoes.userId, userId), // 🔐 CRÍTICO: Filtrar por userId
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

      // Cartão
      if (t.formaPagamento === "cartao" && t.cartaoId) {
        faturasPorCartao[t.cartaoId] =
          (faturasPorCartao[t.cartaoId] || 0) + valor;
        continue;
      }

      // Conta - corrigir tipos (entrada/saida ao invés de receita/despesa)
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
      .where(eq(cartoes.userId, userId)); // 🔐 Filtrar por userId

    const cartoesResumo = cartoesDb.map((c) => ({
      cartaoId: c.id,
      nome: c.nome,
      totalFatura: faturasPorCartao[c.id] || 0,
      paga: false, // Pode ser melhorado consultando tabela faturas
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
  } catch (error) {
    console.error("Erro ao carregar dashboard:", error);

    if (error instanceof Error && error.message === "Não autenticado") {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Erro ao carregar dashboard" },
      { status: 500 }
    );
  }
}