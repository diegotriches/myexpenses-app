// src/app/api/antecipacoes/[antecipacaoId]/desfazer/route.ts

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { antecipacoesParcela, transacoes, faturas } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getUserId } from "@/lib/auth";

/**
 * POST /api/antecipacoes/[antecipacaoId]/desfazer
 *
 * Desfaz uma antecipação de parcelas, restaurando o estado anterior:
 * - Se a antecipação foi MESCLADA numa parcela existente, restaura o
 *   valor original dela (não apaga a linha — ela também representa a
 *   parcela normal do ciclo, não só o valor antecipado).
 * - Se foi uma transação própria (sem mesclagem), remove essa transação.
 * - Subtrai o valor com desconto (e o desconto embutido em
 *   limiteExtraAoPagar) da fatura atual.
 * - Recria as parcelas removidas com os dados originais (snapshot salvo
 *   no momento da antecipação), devolvendo o valor de cada uma à fatura
 *   futura correspondente.
 * - Restaura o número total de parcelas declarado em todas as linhas do
 *   parcelamento.
 *
 * Só permitido enquanto a fatura atual (onde a antecipação foi lançada)
 * ainda não tiver sido paga.
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ antecipacaoId: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { antecipacaoId } = await context.params;

    const [antecipacao] = await db.select().from(antecipacoesParcela)
      .where(and(eq(antecipacoesParcela.id, antecipacaoId), eq(antecipacoesParcela.userId, userId)))
      .limit(1);

    if (!antecipacao) {
      return NextResponse.json({ error: "Antecipação não encontrada" }, { status: 404 });
    }

    const [faturaAtual] = await db.select().from(faturas)
      .where(and(eq(faturas.id, antecipacao.faturaAtualId), eq(faturas.userId, userId)))
      .limit(1);

    if (!faturaAtual) {
      return NextResponse.json({ error: "Fatura associada não encontrada" }, { status: 404 });
    }
    if (faturaAtual.paga) {
      return NextResponse.json(
        { error: "Não é possível desfazer — a fatura atual já foi paga" },
        { status: 400 }
      );
    }

    // 1. ✅ NOVO: se foi mesclada, restaura o valor original da parcela em
    // vez de apagar a linha inteira; senão, remove a transação sintética
    if (antecipacao.valorOriginalTransacaoMesclada !== null) {
      await db.update(transacoes)
        .set({ valor: antecipacao.valorOriginalTransacaoMesclada, updatedAt: new Date() })
        .where(and(eq(transacoes.id, antecipacao.transacaoSinteticaId), eq(transacoes.userId, userId)));
      // Nota: a descrição não é revertida ao texto original — o sufixo
      // "(+ antecipação de N parcela(s))" permanece. Não é um problema
      // funcional, só um detalhe cosmético que pode ser editado manualmente.
    } else {
      await db.delete(transacoes)
        .where(and(eq(transacoes.id, antecipacao.transacaoSinteticaId), eq(transacoes.userId, userId)));
    }

    // 2. Reverte a fatura atual (total e limiteExtraAoPagar)
    const valorComDesconto = Number(antecipacao.valorComDesconto);
    const desconto = Number(antecipacao.desconto);
    const novoTotalFaturaAtual = Number(faturaAtual.total) - valorComDesconto;

    if (novoTotalFaturaAtual <= 0) {
      await db.delete(faturas).where(eq(faturas.id, faturaAtual.id));
    } else {
      await db.update(faturas).set({
        total: novoTotalFaturaAtual.toFixed(2),
        limiteExtraAoPagar: Math.max(0, Number(faturaAtual.limiteExtraAoPagar ?? 0) - desconto).toFixed(2),
        updatedAt: new Date(),
      }).where(eq(faturas.id, faturaAtual.id));
    }

    // 3. Recria as parcelas removidas, devolvendo o valor às faturas futuras
    const parcelasRemovidas = antecipacao.parcelasRemovidas as Array<{
      parcelaAtual: number | null; valor: string; data: string;
      descricao: string | null; categoria: string | null;
      estabelecimentoId: string | null; mes: number; ano: number;
    }>;

    for (const p of parcelasRemovidas) {
      await db.insert(transacoes).values({
        userId,
        tipo: "saida",
        valor: p.valor,
        data: new Date(p.data),
        descricao: p.descricao,
        categoria: p.categoria,
        formaPagamento: "cartao",
        cartaoId: antecipacao.cartaoId,
        estabelecimentoId: p.estabelecimentoId,
        parcelado: true,
        parcelas: antecipacao.totalParcelasOriginal,
        parcelaAtual: p.parcelaAtual,
        parcelamentoId: antecipacao.parcelamentoId,
      });

      const [faturaFutura] = await db.select().from(faturas)
        .where(and(eq(faturas.cartaoId, antecipacao.cartaoId), eq(faturas.userId, userId), eq(faturas.mes, p.mes), eq(faturas.ano, p.ano)))
        .limit(1);

      const valorParcela = Number(p.valor);
      if (faturaFutura) {
        await db.update(faturas)
          .set({ total: (Number(faturaFutura.total) + valorParcela).toFixed(2), updatedAt: new Date() })
          .where(eq(faturas.id, faturaFutura.id));
      } else {
        await db.insert(faturas).values({
          userId, cartaoId: antecipacao.cartaoId, mes: p.mes, ano: p.ano,
          total: valorParcela.toFixed(2), paga: false,
        });
      }
    }

    // 4. Restaura o total de parcelas declarado em todas as linhas restantes
    await db.update(transacoes)
      .set({ parcelas: antecipacao.totalParcelasOriginal, updatedAt: new Date() })
      .where(and(eq(transacoes.parcelamentoId, antecipacao.parcelamentoId), eq(transacoes.userId, userId)));

    // 5. Remove o registro de auditoria — a antecipação foi desfeita
    await db.delete(antecipacoesParcela).where(eq(antecipacoesParcela.id, antecipacaoId));

    return NextResponse.json({ sucesso: true, parcelasRestauradas: parcelasRemovidas.length });
  } catch (error: any) {
    console.error("Erro ao desfazer antecipação:", error);
    return NextResponse.json({ error: error.message || "Erro ao desfazer antecipação" }, { status: 500 });
  }
}