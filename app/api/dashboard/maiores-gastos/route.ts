import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { transacoes, cartoes } from "@/db/schema";
import { and, gte, lte, eq } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import { calcularFaturaDaTransacao } from "@/utils/faturaUtils";

/**
 * GET /api/dashboard/maiores-gastos?periodo=6&limit=5
 * Retorna os maiores gastos dos últimos N meses (a partir de hoje),
 * ordenados por valor decrescente.
 */
export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const periodoParam = searchParams.get("periodo") || "6";
    const numMeses = parseInt(periodoParam);
    const limit = Math.min(Number(searchParams.get("limit") || "5"), 20);

    if (isNaN(numMeses) || numMeses < 1 || numMeses > 24) {
      return NextResponse.json(
        { error: "Período inválido (1-24 meses)" },
        { status: 400 }
      );
    }

    const hoje = new Date();
    const dataFim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59, 999);
    // ✅ Amplia um mês pra trás do início da janela — compras de cartão feitas
    // pouco antes do início do período podem pertencer a uma fatura dentro dele
    const dataInicio = new Date(hoje.getFullYear(), hoje.getMonth() - numMeses, 1);

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
          gte(transacoes.data, dataInicio),
          lte(transacoes.data, dataFim)
        )
      );

    const cartoesDb = await db
      .select()
      .from(cartoes)
      .where(eq(cartoes.userId, userId));

    const cartoesMap = new Map(cartoesDb.map((c) => [c.id, c]));

    // Limites da janela de N meses "cheios", pra comparar mesFatura/anoFatura
    const limiteAno = hoje.getFullYear();
    const limiteMes = hoje.getMonth() + 1; // mês atual (1-12)
    const inicioJanela = new Date(hoje.getFullYear(), hoje.getMonth() - numMeses + 1, 1);
    const inicioJanelaAno = inicioJanela.getFullYear();
    const inicioJanelaMes = inicioJanela.getMonth() + 1;

    const dentroDaJanela = (mesFatura: number, anoFatura: number) => {
      const chave = anoFatura * 12 + mesFatura;
      const chaveInicio = inicioJanelaAno * 12 + inicioJanelaMes;
      const chaveFim = limiteAno * 12 + limiteMes;
      return chave >= chaveInicio && chave <= chaveFim;
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
      // Não-cartão: já veio dentro do range de data direto na query
      return true;
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