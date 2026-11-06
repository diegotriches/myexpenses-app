// src/app/api/cartoes/[id]/fatura/adiantamento/[adiantamentoId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { adiantamentosFatura, faturas, contas, cartoes, extratoConta } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getUserId } from "@/lib/auth";

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

    const novoTotalFatura = Number(fatura.total) + valorNum;
    let novoSaldoConta: number | null = null;

    if (conta && adiantamento.contaId) {
      novoSaldoConta = Number(conta.saldoAtual) + valorNum;

      // ── 5. Estornar valor à conta ───────────────────────────────────────────
      await db
        .update(contas)
        .set({ saldoAtual: novoSaldoConta.toFixed(2), updatedAt: new Date() })
        .where(and(eq(contas.id, adiantamento.contaId), eq(contas.userId, userId)));

      // ── 6. Registrar estorno no extrato ─────────────────────────────────────
      await db.insert(extratoConta).values({
        userId,
        contaId:  adiantamento.contaId,
        data:     new Date().toISOString().split("T")[0],
        tipo:     "entrada",
        valor:    valorNum.toFixed(2),
        descricao: `Estorno adiantamento fatura ${cartao.nome} - ${String(fatura.mes).padStart(2, "0")}/${fatura.ano}`,
        saldoApos: novoSaldoConta.toFixed(2),
        origem:    "ESTORNO",
        referenciaId: adiantamento.id,
      });
    }

    // ── 7. Somar de volta o valor na fatura ───────────────────────────────────
    await db
      .update(faturas)
      .set({ total: novoTotalFatura.toFixed(2), updatedAt: new Date() })
      .where(eq(faturas.id, fatura.id));

    // ── 8. Remover o limite que havia sido restaurado ─────────────────────────
    await db
      .update(cartoes)
      .set({
        limiteDisponivel: sql`CAST(${cartoes.limiteDisponivel} AS NUMERIC) - ${valorNum}`,
      })
      .where(and(eq(cartoes.id, cartaoId), eq(cartoes.userId, userId)));

    // ── 9. Deletar o adiantamento ─────────────────────────────────────────────
    await db
      .delete(adiantamentosFatura)
      .where(and(
        eq(adiantamentosFatura.id,     adiantamentoId),
        eq(adiantamentosFatura.userId, userId)
      ));

    return NextResponse.json({
      message:       "Adiantamento cancelado com sucesso",
      novoTotalFatura,
      saldoConta:    novoSaldoConta, // null = conta do adiantamento já foi excluída
    });
  } catch (error: any) {
    console.error("Erro ao cancelar adiantamento:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao cancelar adiantamento" },
      { status: 500 }
    );
  }
}