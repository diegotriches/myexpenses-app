// src/app/api/dashboard/grafico-meses/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { transacoes } from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { getUserId } from "@/lib/auth";

/**
 * GET /api/dashboard/grafico-meses
 * 
 * Query Params:
 * - periodo: número de meses (padrão: "6")
 * 
 * Retorna dados dos últimos N meses no formato:
 * [{ mes: "2026-01", receitas: 1000, despesas: 500, balanco: 500 }]
 */
export async function GET(req: NextRequest) {
  try {
    // 🔐 Autenticação (padrão do projeto)
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    // Parse do período (número de meses)
    const periodoParam = req.nextUrl.searchParams.get("periodo") || "6";
    const numMeses = parseInt(periodoParam);
    
    if (isNaN(numMeses) || numMeses < 1 || numMeses > 24) {
      return NextResponse.json(
        { error: "Período inválido (1-24 meses)" },
        { status: 400 }
      );
    }

    // Calcular data de início (N meses atrás)
    const hoje = new Date();
    const dataInicio = new Date(
      hoje.getFullYear(), 
      hoje.getMonth() - numMeses + 1, 
      1
    );
    const dataFim = new Date(
      hoje.getFullYear(), 
      hoje.getMonth() + 1, 
      0, // Último dia do mês atual
      23, 59, 59, 999
    );

    // 🔐 Buscar transações do usuário
    const todasTransacoes = await db
      .select()
      .from(transacoes)
      .where(
        and(
          eq(transacoes.userId, userId),
          gte(transacoes.data, dataInicio),
          lte(transacoes.data, dataFim)
        )
      );

    // Gerar array dos últimos N meses
    const meses: { ano: number; mes: number }[] = [];
    for (let i = numMeses - 1; i >= 0; i--) {
      const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      meses.push({
        ano: data.getFullYear(),
        mes: data.getMonth() + 1 // 1-12
      });
    }

    // Processar dados por mês
    const dadosPorMes = meses.map(({ ano, mes }) => {
      // Filtrar transações do mês
      const transacoesDoMes = todasTransacoes.filter((t) => {
        const dataT = new Date(t.data);
        return dataT.getMonth() + 1 === mes && dataT.getFullYear() === ano;
      });

      let receitas = 0;
      let despesas = 0;

      transacoesDoMes.forEach((t) => {
        const valor = Number(t.valor);

        // ⚠️ IMPORTANTE: Ignorar transações de cartão de crédito
        // (o fluxo de caixa real é o pagamento da fatura, não a compra)
        if (t.formaPagamento === "cartao") {
          return;
        }

        if (t.tipo === "entrada") {
          receitas += valor;
        } else if (t.tipo === "saida") {
          despesas += valor;
        }
      });

      const balanco = receitas - despesas;

      // ✅ Formato YYYY-MM (padrão ISO)
      const mesFormatado = `${ano}-${String(mes).padStart(2, '0')}`;

      return {
        mes: mesFormatado,
        receitas: Math.round(receitas * 100) / 100, // Arredonda para 2 casas
        despesas: Math.round(despesas * 100) / 100,
        balanco: Math.round(balanco * 100) / 100,
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