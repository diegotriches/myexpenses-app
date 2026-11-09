// src/app/api/antecipacoes/[antecipacaoId]/desfazer/route.ts

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { antecipacoesParcela, transacoes, faturas } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import { ErroFinanceiro } from "@/lib/movimentacaoConta";
import { ajustarTotalFatura } from "@/lib/impactoTransacao";

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

    const parcelasRemovidas = antecipacao.parcelasRemovidas as Array<{
      parcelaAtual: number | null; valor: string; data: string;
      descricao: string | null; categoria: string | null;
      estabelecimentoId: string | null; mes: number; ano: number;
    }>;

    await db.transaction(async (tx) => {
      // Sair primeiro impede desfazer duas vezes e tira a dependência da fatura
      const removida = await tx.delete(antecipacoesParcela)
        .where(and(eq(antecipacoesParcela.id, antecipacaoId), eq(antecipacoesParcela.userId, userId)))
        .returning({ id: antecipacoesParcela.id });
      if (!removida.length) throw new ErroFinanceiro("Antecipação não encontrada", 404);

      const [atual] = await tx.select().from(faturas)
        .where(eq(faturas.id, faturaAtual.id)).limit(1).for("update");
      if (!atual || atual.paga) throw new ErroFinanceiro("Não é possível desfazer — a fatura atual já foi paga");

      // Mesclada: restaura o valor da parcela, que continua existindo no ciclo.
      // A descrição mantém o sufixo da antecipação e pode ser editada à mão.
      if (antecipacao.valorOriginalTransacaoMesclada !== null) {
        await tx.update(transacoes)
          .set({ valor: antecipacao.valorOriginalTransacaoMesclada, updatedAt: new Date() })
          .where(and(eq(transacoes.id, antecipacao.transacaoSinteticaId), eq(transacoes.userId, userId)));
      } else {
        await tx.delete(transacoes)
          .where(and(eq(transacoes.id, antecipacao.transacaoSinteticaId), eq(transacoes.userId, userId)));
      }

      await ajustarTotalFatura(
        tx,
        atual,
        Number(atual.total) - Number(antecipacao.valorComDesconto),
        Math.max(0, Number(atual.limiteExtraAoPagar ?? 0) - Number(antecipacao.desconto)),
      );

      // Recria as parcelas removidas, devolvendo o valor às faturas futuras
      for (const p of parcelasRemovidas) {
        await tx.insert(transacoes).values({
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

        const [faturaFutura] = await tx.select().from(faturas)
          .where(and(eq(faturas.cartaoId, antecipacao.cartaoId), eq(faturas.userId, userId), eq(faturas.mes, p.mes), eq(faturas.ano, p.ano)))
          .limit(1)
          .for("update");

        if (faturaFutura?.paga) throw new ErroFinanceiro("Uma das faturas futuras já foi paga. Estorne o pagamento antes de desfazer.");

        const valorParcela = Number(p.valor);
        if (faturaFutura) {
          await tx.update(faturas)
            .set({ total: (Number(faturaFutura.total) + valorParcela).toFixed(2), updatedAt: new Date() })
            .where(eq(faturas.id, faturaFutura.id));
        } else {
          await tx.insert(faturas).values({
            userId, cartaoId: antecipacao.cartaoId, mes: p.mes, ano: p.ano,
            total: valorParcela.toFixed(2), paga: false,
          });
        }
      }

      // Restaura o total de parcelas declarado em todas as linhas
      await tx.update(transacoes)
        .set({ parcelas: antecipacao.totalParcelasOriginal, updatedAt: new Date() })
        .where(and(eq(transacoes.parcelamentoId, antecipacao.parcelamentoId), eq(transacoes.userId, userId)));
    });

    return NextResponse.json({ sucesso: true, parcelasRestauradas: parcelasRemovidas.length });
  } catch (error: any) {
    if (error instanceof ErroFinanceiro) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Erro ao desfazer antecipação:", error);
    return NextResponse.json({ error: error.message || "Erro ao desfazer antecipação" }, { status: 500 });
  }
}