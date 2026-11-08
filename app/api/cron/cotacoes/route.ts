// src/app/api/cron/cotacoes/route.ts
//
// Roda uma vez por dia útil, depois do fechamento do pregão, e grava o preço
// de fechamento de todos os ativos em carteira (de todos os usuários).

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { operacoesRv } from "@/db/schema";
import { sql } from "drizzle-orm";
import { atualizarCotacoes } from "@/lib/cotacoes/atualizarCotacoes";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const inicio = Date.now();

  // Tickers com posição aberta (compras − vendas > 0) em qualquer usuário
  const linhas = await db
    .select({
      ticker: operacoesRv.ticker,
      saldo: sql<string>`sum(case when ${operacoesRv.tipo} = 'compra' then ${operacoesRv.quantidade} else -${operacoesRv.quantidade} end)`,
    })
    .from(operacoesRv)
    .groupBy(operacoesRv.userId, operacoesRv.ticker);

  const tickers = Array.from(new Set(linhas.filter((l) => Number(l.saldo) > 0).map((l) => l.ticker)));

  const resultado = await atualizarCotacoes(tickers, { forcar: true });

  return NextResponse.json({
    message: "Atualização de cotações concluída",
    duracao: `${Date.now() - inicio}ms`,
    tickers: tickers.length,
    ...resultado,
  });
}