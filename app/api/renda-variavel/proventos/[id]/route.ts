// src/app/api/renda-variavel/proventos/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { proventosRv, extratoConta } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import { ErroFinanceiro, alterarSaldo } from "@/lib/movimentacaoConta";
import { respostaDeErro } from "@/lib/rota";

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { id } = await context.params;
    const [p] = await db
      .select()
      .from(proventosRv)
      .where(and(eq(proventosRv.id, id), eq(proventosRv.userId, userId)))
      .limit(1);
    if (!p) return NextResponse.json({ error: "Provento não encontrado" }, { status: 404 });

    await db.transaction(async (tx) => {
      // Trava o provento para a reversão não acontecer duas vezes
      const [aindaExiste] = await tx.select({ id: proventosRv.id }).from(proventosRv)
        .where(and(eq(proventosRv.id, id), eq(proventosRv.userId, userId))).limit(1).for("update");
      if (!aindaExiste) throw new ErroFinanceiro("Provento não encontrado", 404);

      // Se tinha creditado a conta, devolve (tira o valor do saldo) e remove do extrato
      if (p.movimentouConta && p.contaId) {
        await alterarSaldo(tx, userId, p.contaId, -Number(p.valorLiquido));
        await tx
          .delete(extratoConta)
          .where(and(eq(extratoConta.referenciaId, id), eq(extratoConta.userId, userId)));
      }

      await tx.delete(proventosRv).where(eq(proventosRv.id, id));
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return respostaDeErro(error, "Erro ao excluir provento");
  }
}