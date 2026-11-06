// src/app/api/dashboard/maiores-gastos/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { transacoes, cartoes } from "@/db/schema";
import { and, gte, lte, eq } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import { calcularFaturaDaTransacao } from "@/utils/faturaUtils";
import { calcularIntervaloAno, lerAnoDaRequisicao } from "@/utils/periodoAno";

/**
 * GET /api/dashboard/maiores-gastos?ano=2026&limit=5
 * Retorna os maiores gastos do ano informado (até o mês atual, se for o ano
 * vigente), ordenados por valor decrescente.
 */
export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const ano = lerAnoDaRequisicao(searchParams.get("ano"));
    const limit = Math.min(Number(searchParams.get("limit") || "5"), 20);

    if (ano === null) {
      return NextResponse.json({ error: "Ano inválido" }, { status: 400 });
    }

    const intervalo = calcularIntervaloAno(ano);

    // Amplia a busca para dezembro do ano anterior: compras de cartão feitas
    // pouco antes do início do ano podem pertencer a uma fatura dentro dele
    const dataInicioBusca = new Date(ano - 1, 11, 1);

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
          gte(transacoes.data, dataInicioBusca),
          lte(transacoes.data, intervalo.fim)
        )
      );

    const cartoesDb = await db
      .select()
      .from(cartoes)
      .where(eq(cartoes.userId, userId));

    const cartoesMap = new Map(cartoesDb.map((c) => [c.id, c]));

    const dentroDaJanela = (mesFatura: number, anoFatura: number) => {
      const chave = anoFatura * 12 + mesFatura;
      return chave >= intervalo.chaveInicio && chave <= intervalo.chaveFim;
    };

    const despesasFiltradas = despesas.filter((t) => {
      if (t.formaPagamento === "cartao" && t.cartaoId) {
        const cartao = cartoesMap.get(t.cartaoId);
        if (!cartao) return false;
        const { mes: mesFatura, ano: anoFatura } = calcularFaturaDaTransacao(
          new Date(t.data),
          cartao.diaFechamento || 1
        );
        return dentroDaJanela(mesFatura, anoFatura);
      }
      // Não-cartão: precisa estar dentro do ano (a busca ampliada traz dezembro anterior)
      return new Date(t.data) >= intervalo.inicio;
    });

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