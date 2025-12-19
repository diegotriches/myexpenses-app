import { db } from "@/db";
import { transacoes, cartoes } from "@/db/schema";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  if (!id) return NextResponse.json({ error: "ID inválido." }, { status: 400 });

  try {
    const body = await req.json();
    let { formaPagamento, cartaoId, ...rest } = body;

    // Validação formaPagamento
    if (!["dinheiro", "pix", "cartao"].includes(formaPagamento)) formaPagamento = "dinheiro";
    if (formaPagamento !== "cartao") cartaoId = null;

    // Validar se cartão existe
    if (formaPagamento === "cartao" && cartaoId) {
      const check = await db.select().from(cartoes).where(eq(cartoes.id, cartaoId));
      if (!check.length) return NextResponse.json({ error: "Cartão não existe." }, { status: 400 });
    }

    const [atualizada] = await db
      .update(transacoes)
      .set({
        ...rest,
        formaPagamento,
        cartaoId: cartaoId ?? null,
        parcelado: Boolean(rest.parcelado),
        recorrente: Boolean(rest.recorrente),
        parcelamentoId: rest.parcelamentoId ?? null,
        parcelas: rest.parcelas ?? null,
        parcelaAtual: rest.parcelaAtual ?? null,
        recorrenciaId: rest.recorrenciaId ?? null,
        repeticoes: rest.repeticoes ?? null,
      })
      .where(eq(transacoes.id, id))
      .returning();

    if (!atualizada) return NextResponse.json({ error: "Transação não encontrada" }, { status: 404 });

    return NextResponse.json(atualizada);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erro desconhecido" }, { status: 500 });
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    if (!id) return NextResponse.json({ error: "ID inválido." }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const tipo = searchParams.get("tipo");
    const tiposPermitidos = ["unica", "todas_parcelas", "toda_recorrencia"];

    if (tipo && !tiposPermitidos.includes(tipo)) return NextResponse.json({ error: "Tipo inválido." }, { status: 400 });

    const [mov] = await db.select().from(transacoes).where(eq(transacoes.id, id)).limit(1);
    if (!mov) return NextResponse.json({ error: "Transação não encontrada" }, { status: 404 });

    // Bloqueio de transferência
    if (mov.transferenciaId) return NextResponse.json({ error: "Esta transação faz parte de uma transferência. Use exclusão de transferências." }, { status: 400 });

    if (!tipo || tipo === "unica") {
      await db.delete(transacoes).where(eq(transacoes.id, id));
    } else if (tipo === "todas_parcelas" && mov.parcelamentoId) {
      await db.delete(transacoes).where(eq(transacoes.parcelamentoId, mov.parcelamentoId));
    } else if (tipo === "toda_recorrencia" && mov.recorrenciaId) {
      await db.delete(transacoes).where(eq(transacoes.recorrenciaId, mov.recorrenciaId));
    }

    return NextResponse.json({ sucesso: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erro desconhecido" }, { status: 500 });
  }
}