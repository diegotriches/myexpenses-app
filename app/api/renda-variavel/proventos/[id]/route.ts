// src/app/api/renda-variavel/proventos/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { proventosRv, contas, extratoConta } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import { r2 } from "@/utils/rendaVariavelUtils";

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

    // Se tinha creditado a conta, devolve (tira o valor do saldo) e remove do extrato
    if (p.movimentouConta && p.contaId) {
      const [conta] = await db.select().from(contas).where(eq(contas.id, p.contaId)).limit(1);
      if (conta) {
        await db
          .update(contas)
          .set({ saldoAtual: r2(Number(conta.saldoAtual) - Number(p.valorLiquido)).toFixed(2), updatedAt: new Date() })
          .where(eq(contas.id, conta.id));
      }
      await db
        .delete(extratoConta)
        .where(and(eq(extratoConta.referenciaId, id), eq(extratoConta.userId, userId)));
    }

    await db.delete(proventosRv).where(eq(proventosRv.id, id));
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Erro ao excluir provento:", error);
    return NextResponse.json({ error: error.message || "Erro ao excluir provento" }, { status: 500 });
  }
}