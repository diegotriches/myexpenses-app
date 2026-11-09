import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { adiantamentosFatura, faturas, contas, cartoes } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import { ErroFinanceiro, movimentarConta } from "@/lib/movimentacaoConta";
import { hojeBrt } from "@/utils/aplicacaoSimulacao";
import { respostaDeErro } from "@/lib/rota";

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/cartoes/[id]/fatura/adiantamento/[adiantamentoId]
// Cancela um adiantamento: estorna valor à conta, soma de volta na fatura,
// remove o limite restaurado anteriormente.
// ─────────────────────────────────────────────────────────────────────────────
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; adiantamentoId: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { id, adiantamentoId } = await params;
    const cartaoId = Number(id);

    if (!cartaoId)       return NextResponse.json({ error: "Cartão inválido" }, { status: 400 });
    if (!adiantamentoId) return NextResponse.json({ error: "ID do adiantamento inválido" }, { status: 400 });

    // ── 1. Buscar adiantamento ────────────────────────────────────────────────
    const [adiantamento] = await db
      .select()
      .from(adiantamentosFatura)
      .where(and(
        eq(adiantamentosFatura.id,     adiantamentoId),
        eq(adiantamentosFatura.userId, userId)
      ))
      .limit(1);

    if (!adiantamento)
      return NextResponse.json({ error: "Adiantamento não encontrado" }, { status: 404 });

    const valorNum = Number(adiantamento.valor);

    // ── 2. Buscar fatura vinculada ────────────────────────────────────────────
    const [fatura] = await db
      .select()
      .from(faturas)
      .where(and(
        eq(faturas.id,     adiantamento.faturaId),
        eq(faturas.userId, userId)
      ))
      .limit(1);

    if (!fatura)
      return NextResponse.json({ error: "Fatura não encontrada" }, { status: 404 });

    if (fatura.cartaoId !== cartaoId)
      return NextResponse.json({ error: "Adiantamento não encontrado" }, { status: 404 });

    if (fatura.paga)
      return NextResponse.json(
        { error: "Não é possível cancelar adiantamento de fatura já paga" },
        { status: 400 }
      );

    // ── 3. Buscar conta ───────────────────────────────────────────────────────
    // conta_id fica NULL quando a conta usada no adiantamento foi excluída
    // (ON DELETE SET NULL). Nesse caso não há onde estornar o dinheiro: o
    // adiantamento ainda pode ser cancelado, só não mexe em conta/extrato.
    let conta: typeof contas.$inferSelect | undefined;

    if (adiantamento.contaId) {
      [conta] = await db
        .select()
        .from(contas)
        .where(and(
          eq(contas.id,     adiantamento.contaId),
          eq(contas.userId, userId)
        ))
        .limit(1);

      if (!conta)
        return NextResponse.json({ error: "Conta não encontrada" }, { status: 404 });
    }

    // ── 4. Buscar cartão ──────────────────────────────────────────────────────
    const [cartao] = await db
      .select()
      .from(cartoes)
      .where(and(eq(cartoes.id, cartaoId), eq(cartoes.userId, userId)))
      .limit(1);

    if (!cartao)
      return NextResponse.json({ error: "Cartão não encontrado" }, { status: 404 });

    const { novoTotalFatura, novoSaldoConta } = await db.transaction(async (tx) => {
      // Trava o adiantamento para o cancelamento não acontecer duas vezes
      const [aindaExiste] = await tx.select({ id: adiantamentosFatura.id }).from(adiantamentosFatura)
        .where(eq(adiantamentosFatura.id, adiantamentoId)).limit(1).for("update");
      if (!aindaExiste) throw new ErroFinanceiro("Adiantamento não encontrado", 404);

      const [atual] = await tx.select().from(faturas).where(eq(faturas.id, fatura.id)).limit(1).for("update");
      if (!atual || atual.paga) throw new ErroFinanceiro("Não é possível cancelar adiantamento de fatura já paga");

      let saldoConta: number | null = null;
      if (conta && adiantamento.contaId) {
        const resultado = await movimentarConta(tx, {
          userId,
          contaId:  adiantamento.contaId,
          tipo:     "entrada",
          valor:    valorNum,
          data:     hojeBrt(),
          descricao: `Estorno adiantamento fatura ${cartao.nome} - ${String(atual.mes).padStart(2, "0")}/${atual.ano}`,
          origem:    "ESTORNO",
          referenciaId: adiantamento.id,
        });
        saldoConta = resultado.saldoApos;
      }

      const novoTotal = Number(atual.total) + valorNum;
      await tx
        .update(faturas)
        .set({ total: novoTotal.toFixed(2), updatedAt: new Date() })
        .where(eq(faturas.id, fatura.id));

      await tx
        .update(cartoes)
        .set({
          limiteDisponivel: sql`CAST(${cartoes.limiteDisponivel} AS NUMERIC) - ${valorNum}`,
        })
        .where(and(eq(cartoes.id, cartaoId), eq(cartoes.userId, userId)));

      await tx
        .delete(adiantamentosFatura)
        .where(and(
          eq(adiantamentosFatura.id,     adiantamentoId),
          eq(adiantamentosFatura.userId, userId)
        ));

      return { novoTotalFatura: novoTotal, novoSaldoConta: saldoConta };
    });

    return NextResponse.json({
      message:       "Adiantamento cancelado com sucesso",
      novoTotalFatura,
      saldoConta:    novoSaldoConta, // null = conta do adiantamento já foi excluída
    });
  } catch (error) {
    return respostaDeErro(error, "Erro ao cancelar adiantamento");
  }
}