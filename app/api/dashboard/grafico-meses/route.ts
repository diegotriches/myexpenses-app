// src/app/api/dashboard/grafico-meses/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { transacoes } from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import { calcularIntervaloAno, lerAnoDaRequisicao } from "@/utils/periodoAno";

/**
 * GET /api/dashboard/grafico-meses?ano=2026
 *
 * Retorna os meses do ano informado (de janeiro até o mês atual no ano
 * vigente; de janeiro a dezembro nos anos passados) no formato:
 * [{ mes: "2026-01", receitas: 1000, despesas: 500, balanco: 500 }]
 */
export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const ano = lerAnoDaRequisicao(req.nextUrl.searchParams.get("ano"));
    if (ano === null) {
      return NextResponse.json({ error: "Ano inválido" }, { status: 400 });
    }

    const { inicio, fim, meses } = calcularIntervaloAno(ano);

    const todasTransacoes = await db
      .select()
      .from(transacoes)
      .where(
        and(
          eq(transacoes.userId, userId),
          gte(transacoes.data, inicio),
          lte(transacoes.data, fim)
        )
      );

    const dadosPorMes = meses.map(({ ano: anoMes, mes }) => {
      const transacoesDoMes = todasTransacoes.filter((t) => {
        const dataT = new Date(t.data);
        return dataT.getMonth() + 1 === mes && dataT.getFullYear() === anoMes;
      });

      let receitas = 0;
      let despesas = 0;

      transacoesDoMes.forEach((t) => {
        const valor = Number(t.valor);
        if (t.tipo === "entrada") {
          receitas += valor;
        } else if (t.tipo === "saida") {
          despesas += valor; // inclui cartão
        } else if (t.tipo === "estorno") {
          despesas -= valor;
        }
      });

      return {
        mes: `${anoMes}-${String(mes).padStart(2, "0")}`,
        receitas: Math.round(receitas * 100) / 100,
        despesas: Math.round(despesas * 100) / 100,
        balanco: Math.round((receitas - despesas) * 100) / 100,
      };
    });

    return NextResponse.json(dadosPorMes);
  } catch (error: any) {
    console.error("Erro ao buscar gráfico de meses:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao buscar dados do gráfico" },
      { status: 500 }
    );
  }
}