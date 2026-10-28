// src/app/api/aplicacoes/[id]/resgatar/route.ts

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { aplicacoes, contas, extratoConta } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import { calcularResgate } from "@/utils/aplicacaoUtils";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { id } = await context.params;

    const [aplicacao] = await db.select().from(aplicacoes)
      .where(and(eq(aplicacoes.id, id), eq(aplicacoes.userId, userId)))
      .limit(1);

    if (!aplicacao) return NextResponse.json({ error: "Aplicação não encontrada" }, { status: 404 });
    if (aplicacao.resgatada) return NextResponse.json({ error: "Esta aplicação já foi resgatada" }, { status: 400 });

    const [conta] = await db.select().from(contas)
      .where(eq(contas.id, aplicacao.contaId)).limit(1);
    if (!conta) return NextResponse.json({ error: "Conta não encontrada" }, { status: 404 });

    const agora = new Date();

    // ✅ NOVO: calcula o IR (se tributável) usando a mesma função que o
    // frontend usa pra mostrar o detalhamento antes de confirmar — garante
    // que o valor previsto bate exatamente com o valor creditado de verdade
    const resultado = calcularResgate({
      valorPrincipal: Number(aplicacao.valorPrincipal),
      valorAtual: Number(aplicacao.valorAtual),
      dataAplicacao: aplicacao.dataAplicacao,
      tributacao: aplicacao.tributacao as "isento" | "tributavel",
      dataResgate: agora,
    });

    const novoSaldo = Number(conta.saldoAtual) + resultado.valorLiquido;

    await db.update(contas)
      .set({ saldoAtual: novoSaldo.toFixed(2), updatedAt: agora })
      .where(eq(contas.id, conta.id));

    await db.insert(extratoConta).values({
      userId, contaId: conta.id,
      data: agora.toISOString().split("T")[0],
      tipo: "entrada", valor: resultado.valorLiquido.toFixed(2),
      descricao: resultado.impostoRetido > 0
        ? `Resgate antecipado — ${aplicacao.descricao || "Aplicação"} (IR retido: R$ ${resultado.impostoRetido.toFixed(2)})`
        : `Resgate antecipado — ${aplicacao.descricao || "Aplicação"}`,
      saldoApos: novoSaldo.toFixed(2),
      origem: "RESGATE_APLICACAO", referenciaId: aplicacao.id,
    });

    const [atualizada] = await db.update(aplicacoes)
      .set({
        resgatada: true,
        dataResgate: agora,
        valorResgatado: resultado.valorLiquido.toFixed(2),
        impostoRetido: resultado.impostoRetido.toFixed(2),
        updatedAt: agora,
      })
      .where(eq(aplicacoes.id, id))
      .returning();

    return NextResponse.json({ ...atualizada, detalhamento: resultado });
  } catch (error: any) {
    console.error("Erro ao resgatar aplicação:", error);
    return NextResponse.json({ error: error.message || "Erro ao resgatar aplicação" }, { status: 500 });
  }
}