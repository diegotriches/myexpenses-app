// src/app/api/renda-variavel/cotacoes/route.ts
//
// Cotação MANUAL de um ticker (etapa 1). Na etapa 2 o cron passa a atualizar
// automaticamente e esta rota vira só um "override" pontual.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { operacoesRv, cotacoesRv } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import { TICKER_REGEX, normalizarTicker } from "@/utils/rendaVariavelUtils";

export async function PUT(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const body = await req.json();
    const ticker = normalizarTicker(String(body.ticker ?? ""));
    if (!TICKER_REGEX.test(ticker))
      return NextResponse.json({ error: "Ticker inválido" }, { status: 400 });

    const preco = Number(body.preco);
    if (isNaN(preco) || preco <= 0)
      return NextResponse.json({ error: "Preço inválido" }, { status: 400 });

    // Só quem tem operações no ticker pode definir a cotação dele
    const [tem] = await db
      .select({ id: operacoesRv.id })
      .from(operacoesRv)
      .where(and(eq(operacoesRv.userId, userId), eq(operacoesRv.ticker, ticker)))
      .limit(1);
    if (!tem) return NextResponse.json({ error: "Ativo não encontrado na sua carteira" }, { status: 404 });

    const agora = new Date();
    await db
      .insert(cotacoesRv)
      .values({ ticker, preco: preco.toFixed(4), fonte: "manual", atualizadoEm: agora })
      .onConflictDoUpdate({
        target: cotacoesRv.ticker,
        set: { preco: preco.toFixed(4), variacaoDia: null, fonte: "manual", atualizadoEm: agora },
      });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Erro ao salvar cotação:", error);
    return NextResponse.json({ error: error.message || "Erro ao salvar cotação" }, { status: 500 });
  }
}