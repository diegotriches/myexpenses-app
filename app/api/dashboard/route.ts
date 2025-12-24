import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { transacoes, cartoes } from "@/db/schema";
import { and, gte, lt, eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
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

  try {
    // Todas as transações do período
    const todas = await db
      .select()
      .from(transacoes)
      .where(
        and(
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

      // Conta
      if (t.tipo === "receita") {
        receitas += valor;
      }

      if (t.tipo === "despesa") {
        despesas += valor;
      }
    }

    // Buscar dados dos cartões
    const cartoesDb = await db.select().from(cartoes);

    const cartoesResumo = cartoesDb.map((c) => ({
      cartaoId: c.id,
      nome: c.nome,
      totalFatura: faturasPorCartao[c.id] || 0,
      paga: false, // depois entra lógica de pagamento
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
    console.error(error);
    return NextResponse.json(
      { error: "Erro ao carregar dashboard" },
      { status: 500 }
    );
  }
}