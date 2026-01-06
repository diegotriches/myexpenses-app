import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { transacoes } from "@/db/schema";
import { eq, and, gte, sql } from "drizzle-orm";
import { getUserIdFromSession } from "@/lib/auth/helpers";

export async function GET(req: NextRequest) {
  try {
    // 🔐 Autenticação
    const userId = await getUserIdFromSession();

    const periodo = req.nextUrl.searchParams.get("periodo") || "2025-12";
    
    // Parse período (YYYY-MM)
    const [anoStr, mesStr] = periodo.split("-");
    const anoAtual = parseInt(anoStr);
    const mesAtual = parseInt(mesStr);

    // Calcular últimos 6 meses
    const meses = [];
    for (let i = 5; i >= 0; i--) {
      let mes = mesAtual - i;
      let ano = anoAtual;

      while (mes <= 0) {
        mes += 12;
        ano -= 1;
      }

      meses.push({ mes, ano });
    }

    // Buscar transações dos últimos 6 meses
    const dataInicio = new Date(meses[0].ano, meses[0].mes - 1, 1);
    const dataFim = new Date(anoAtual, mesAtual, 1); // Início do próximo mês

    // 🔐 Buscar transações do usuário (excluindo transações de cartão no cálculo)
    const todasTransacoes = await db
      .select()
      .from(transacoes)
      .where(
        and(
          eq(transacoes.userId, userId), // 🔐 CRÍTICO: Filtrar por userId
          gte(transacoes.data, dataInicio),
          sql`${transacoes.data} < ${dataFim}`
        )
      );

    // Processar dados por mês
    const dadosPorMes = meses.map(({ mes, ano }) => {
      const mesNome = new Date(ano, mes - 1).toLocaleDateString("pt-BR", {
        month: "short",
        year: "2-digit",
      });

      const transacoesDoMes = todasTransacoes.filter((t) => {
        const dataT = new Date(t.data);
        return dataT.getMonth() + 1 === mes && dataT.getFullYear() === ano;
      });

      let receitas = 0;
      let despesas = 0;

      for (const t of transacoesDoMes) {
        const valor = Number(t.valor);

        // Ignorar transações de cartão de crédito no fluxo de caixa
        if (t.formaPagamento === "cartao") {
          continue;
        }

        if (t.tipo === "entrada") {
          receitas += valor;
        } else if (t.tipo === "saida") {
          despesas += valor;
        }
      }

      const balanco = receitas - despesas;

      return {
        mes: mesNome.charAt(0).toUpperCase() + mesNome.slice(1), // Capitalizar
        receitas: Math.round(receitas),
        despesas: Math.round(despesas),
        balanco: Math.round(balanco),
      };
    });

    return NextResponse.json(dadosPorMes);
  } catch (error) {
    console.error("Erro ao buscar gráfico de meses:", error);

    if (error instanceof Error && error.message === "Não autenticado") {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Erro ao buscar dados do gráfico" },
      { status: 500 }
    );
  }
}