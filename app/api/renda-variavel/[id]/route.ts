// src/app/api/renda-variavel/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { operacoesRv, contas, extratoConta } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import { totalOperacao, validarSequencia, r2, type OperacaoRv } from "@/utils/rendaVariavelUtils";

const fmtIso = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/");

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { id } = await context.params;

    const [op] = await db
      .select()
      .from(operacoesRv)
      .where(and(eq(operacoesRv.id, id), eq(operacoesRv.userId, userId)))
      .limit(1);
    if (!op) return NextResponse.json({ error: "Operação não encontrada" }, { status: 404 });

    // Sem a operação, a carteira ainda precisa fazer sentido (nunca vender o que não tem)
    const doTicker = await db
      .select()
      .from(operacoesRv)
      .where(and(eq(operacoesRv.userId, userId), eq(operacoesRv.ticker, op.ticker)));
    const restantes: OperacaoRv[] = doTicker
      .filter((o) => o.id !== id)
      .map((o) => ({
        id: o.id,
        ticker: o.ticker,
        tipoAtivo: o.tipoAtivo,
        tipo: o.tipo,
        data: o.data,
        quantidade: o.quantidade,
        precoUnitario: Number(o.precoUnitario),
        taxas: Number(o.taxas),
      }));
    const problema = validarSequencia(restantes);
    if (problema) {
      return NextResponse.json(
        {
          error: `Não é possível excluir: a venda de ${op.ticker} em ${fmtIso(problema.data)} ficaria sem saldo. Exclua primeiro as vendas posteriores.`,
        },
        { status: 400 },
      );
    }

    // Desfaz o efeito no saldo da conta, se a operação tinha movimentado
    if (op.movimentouConta && op.contaId) {
      const [conta] = await db.select().from(contas).where(eq(contas.id, op.contaId)).limit(1);
      if (conta) {
        const total = totalOperacao({
          tipo: op.tipo,
          quantidade: op.quantidade,
          precoUnitario: Number(op.precoUnitario),
          taxas: Number(op.taxas),
        });
        const novoSaldo = r2(Number(conta.saldoAtual) + (op.tipo === "compra" ? total : -total));
        await db
          .update(contas)
          .set({ saldoAtual: novoSaldo.toFixed(2), updatedAt: new Date() })
          .where(eq(contas.id, conta.id));
      }
      await db
        .delete(extratoConta)
        .where(and(eq(extratoConta.referenciaId, id), eq(extratoConta.userId, userId)));
    }

    await db.delete(operacoesRv).where(eq(operacoesRv.id, id));
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Erro ao excluir operação de renda variável:", error);
    return NextResponse.json({ error: error.message || "Erro ao excluir operação" }, { status: 500 });
  }
}