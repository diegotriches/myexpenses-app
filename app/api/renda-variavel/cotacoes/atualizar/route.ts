// src/app/api/renda-variavel/cotacoes/atualizar/route.ts
//
// Atualiza (na brapi) as cotações dos ativos que o usuário tem em carteira.
// Chamada automaticamente ao abrir a aba Renda variável e pelo botão
// "Atualizar cotações". O servidor decide o que realmente precisa de busca.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { operacoesRv } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import { calcularPosicoes, type OperacaoRv } from "@/utils/rendaVariavelUtils";
import { atualizarCotacoes } from "@/lib/cotacoes/atualizarCotacoes";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const body = await req.json().catch(() => ({}));

    const linhas = await db.select().from(operacoesRv).where(eq(operacoesRv.userId, userId));
    const ops: OperacaoRv[] = linhas.map((o) => ({
      id: o.id,
      ticker: o.ticker,
      tipoAtivo: o.tipoAtivo,
      tipo: o.tipo,
      data: o.data,
      quantidade: o.quantidade,
      precoUnitario: Number(o.precoUnitario),
      taxas: Number(o.taxas),
    }));
    const abertos = calcularPosicoes(ops).filter((p) => p.quantidade > 0).map((p) => p.ticker);

    const resultado = await atualizarCotacoes(abertos, { forcar: body?.forcar === true });
    return NextResponse.json(resultado);
  } catch (error: any) {
    console.error("Erro ao atualizar cotações:", error);
    return NextResponse.json({ error: error.message || "Erro ao atualizar cotações" }, { status: 500 });
  }
}