// src/app/api/renda-variavel/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { operacoesRv, extratoConta } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import { ErroFinanceiro, alterarSaldo } from "@/lib/movimentacaoConta";
import { totalOperacao, validarSequencia, type OperacaoRv } from "@/utils/rendaVariavelUtils";

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

    await db.transaction(async (tx) => {
      // Trava a operação para a reversão não acontecer duas vezes
      const [aindaExiste] = await tx.select({ id: operacoesRv.id }).from(operacoesRv)
        .where(and(eq(operacoesRv.id, id), eq(operacoesRv.userId, userId))).limit(1).for("update");
      if (!aindaExiste) throw new ErroFinanceiro("Operação não encontrada", 404);

      // Desfaz o efeito no saldo da conta, se a operação tinha movimentado
      if (op.movimentouConta && op.contaId) {
        const total = totalOperacao({
          tipo: op.tipo,
          quantidade: op.quantidade,
          precoUnitario: Number(op.precoUnitario),
          taxas: Number(op.taxas),
        });
        await alterarSaldo(tx, userId, op.contaId, op.tipo === "compra" ? total : -total);
        await tx
          .delete(extratoConta)
          .where(and(eq(extratoConta.referenciaId, id), eq(extratoConta.userId, userId)));
      }

      await tx.delete(operacoesRv).where(eq(operacoesRv.id, id));
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    if (error instanceof ErroFinanceiro) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Erro ao excluir operação de renda variável:", error);
    return NextResponse.json({ error: error.message || "Erro ao excluir operação" }, { status: 500 });
  }
}