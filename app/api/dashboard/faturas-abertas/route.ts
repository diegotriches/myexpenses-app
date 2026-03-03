// src/app/api/dashboard/faturas-abertas/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { cartoes, faturas, transacoes } from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { getUserIdOrRedirect } from "@/lib/auth/session";
import { calcularPeriodoFatura, calcularDataVencimento } from "@/utils/faturaUtils";

export interface FaturaAbertaItem {
  cartaoId: number;
  mes: number;
  ano: number;
  total: number;
  status: "EM_ABERTO" | "ATRASADA";
  dataVencimento: string;
}

/**
 * GET /api/dashboard/faturas-abertas
 * Retorna a fatura aberta do mes atual para cada cartao de credito ativo.
 * Usado exclusivamente pelo CardLimiteCredito no dashboard.
 */
export async function GET() {
  try {
    const userId = await getUserIdOrRedirect();

    const hoje = new Date();
    const mes = hoje.getMonth() + 1;
    const ano = hoje.getFullYear();

    const cartoesAtivos = await db
      .select()
      .from(cartoes)
      .where(
        and(
          eq(cartoes.userId, userId),
          eq(cartoes.tipo, "credito"),
          eq(cartoes.ativo, true)
        )
      );

    const resultado: FaturaAbertaItem[] = [];

    for (const cartao of cartoesAtivos) {
      const diaFechamento = cartao.diaFechamento || 1;
      const diaVencimento = cartao.diaVencimento || 1;

      const { inicio, fim } = calcularPeriodoFatura(mes, ano, diaFechamento);
      const dataVencimento = calcularDataVencimento(mes, ano, diaVencimento);
      const dataVencimentoStr = dataVencimento.toISOString().split("T")[0];

      // Busca fatura existente
      const [fatura] = await db
        .select()
        .from(faturas)
        .where(
          and(
            eq(faturas.cartaoId, cartao.id),
            eq(faturas.userId, userId),
            eq(faturas.ano, ano),
            eq(faturas.mes, mes)
          )
        )
        .limit(1);

      // Se fatura ja esta paga, nao exibir no dashboard
      if (fatura?.paga) continue;

      // Calcula total pelas transacoes do periodo
      const transacoesDoMes = await db
        .select({ valor: transacoes.valor })
        .from(transacoes)
        .where(
          and(
            eq(transacoes.cartaoId, cartao.id),
            eq(transacoes.userId, userId),
            gte(transacoes.data, inicio),
            lte(transacoes.data, fim)
          )
        );

      const total = transacoesDoMes.reduce((acc, t) => acc + Number(t.valor), 0);

      // Sem transacoes = sem fatura para exibir
      if (total <= 0) continue;

      const status: "EM_ABERTO" | "ATRASADA" =
        hoje > dataVencimento ? "ATRASADA" : "EM_ABERTO";

      resultado.push({
        cartaoId: cartao.id,
        mes,
        ano,
        total,
        status,
        dataVencimento: dataVencimentoStr,
      });
    }

    return NextResponse.json(resultado);
  } catch (error) {
    console.error("Erro ao buscar faturas abertas:", error);
    return NextResponse.json([], { status: 200 });
  }
}