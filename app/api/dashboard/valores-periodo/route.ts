import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { transacoes, cartoes } from "@/db/schema";
import { and, gte, lte, eq } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import { calcularFaturaDaTransacao } from "@/utils/faturaUtils";

/**
 * GET /api/dashboard/valores-periodo?periodo=6
 * Retorna receitas recebidas, a receber e despesas a pagar nos últimos
 * N meses a partir de hoje.
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

    if (isNaN(numMeses) || numMeses < 1 || numMeses > 24) {
      return NextResponse.json(
        { error: "Período inválido (1-24 meses)" },
        { status: 400 }
      );
    }

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const dataFim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59, 999);
    // Amplia um mês pra trás pra pegar compras de cartão do mês anterior
    // que caem na fatura do primeiro mês da janela
    const dataInicio = new Date(hoje.getFullYear(), hoje.getMonth() - numMeses, 1);

    const todas = await db
      .select()
      .from(transacoes)
      .where(
        and(
          eq(transacoes.userId, userId),
          gte(transacoes.data, dataInicio),
          lte(transacoes.data, dataFim)
        )
      );

    const cartoesDb = await db
      .select()
      .from(cartoes)
      .where(eq(cartoes.userId, userId));

    const cartoesMap = new Map(cartoesDb.map((c) => [c.id, c]));

    // Janela "cheia" (sem o mês extra de segurança) pra checar fatura de cartão
    const inicioJanela = new Date(hoje.getFullYear(), hoje.getMonth() - numMeses + 1, 1);
    const inicioJanelaChave = inicioJanela.getFullYear() * 12 + (inicioJanela.getMonth() + 1);
    const fimJanelaChave = hoje.getFullYear() * 12 + (hoje.getMonth() + 1);

    const dentroDaJanela = (mesFatura: number, anoFatura: number) => {
      const chave = anoFatura * 12 + mesFatura;
      return chave >= inicioJanelaChave && chave <= fimJanelaChave;
    };

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
        if (t.formaPagamento === "cartao" && t.cartaoId) {
          const cartao = cartoesMap.get(t.cartaoId);
          if (cartao) {
            const { mes: mesFatura, ano: anoFatura } = calcularFaturaDaTransacao(
              dataTransacao,
              cartao.diaFechamento || 1
            );
            if (dentroDaJanela(mesFatura, anoFatura)) {
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