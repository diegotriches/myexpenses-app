import { db } from "@/db";
import { transacoes, cartoes } from "@/db/schema";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { params } = context;
  const { id } = await params;

  const numericId = Number(id);
  if (Number.isNaN(numericId)) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  }

  try {
    const body = await req.json();

    let {
      data,
      tipo,
      descricao,
      valor,
      categoria,
      formaPagamento,
      cartaoId,

      parcelado,
      parcelamentoId,
      parcelas,
      parcelaAtual,

      recorrente,
      recorrenciaId,
      repeticoes,
    } = body;

    if (!["dinheiro", "pix", "cartao"].includes(formaPagamento)) {
      formaPagamento = "dinheiro";
    }

    if (formaPagamento !== "cartao") {
      cartaoId = null;
    }

    if (formaPagamento === "cartao" && cartaoId) {
      const check = await db
        .select()
        .from(cartoes)
        .where(eq(cartoes.id, Number(cartaoId)));

      if (check.length === 0) {
        return NextResponse.json(
          { error: "Cartão informado não existe." },
          { status: 400 }
        );
      }
    }

    const [atualizada] = await db
      .update(transacoes)
      .set({
        data,
        tipo,
        descricao,
        valor: Number(valor),
        categoria,
        formaPagamento,
        cartaoId: cartaoId ? Number(cartaoId) : null,

        parcelado: Boolean(parcelado),
        parcelamentoId: parcelamentoId ?? null,
        parcelas: parcelas ?? null,
        parcelaAtual: parcelaAtual ?? null,

        recorrente: Boolean(recorrente),
        recorrenciaId: recorrenciaId ?? null,
        repeticoes: repeticoes ?? null,
      })
      .where(eq(transacoes.id, numericId))
      .returning();

    if (!atualizada) {
      return NextResponse.json(
        { error: "Transação não encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(atualizada);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { params } = context;
    const { id } = await params;

    const numericId = Number(id);
    if (Number.isNaN(numericId)) {
      return NextResponse.json({ error: "ID inválido." }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const tipo = searchParams.get("tipo"); 

    const transacao = await db
      .select()
      .from(transacoes)
      .where(eq(transacoes.id, numericId))
      .limit(1);

    if (!transacao.length) {
      return NextResponse.json(
        { error: "Transação não encontrada" },
        { status: 404 }
      );
    }

    const mov = transacao[0];

    if (!tipo || tipo === "unica") {
      await db.delete(transacoes).where(eq(transacoes.id, numericId));
    }

    else if (tipo === "todas_parcelas" && mov.parcelamentoId) {
      await db
        .delete(transacoes)
        .where(eq(transacoes.parcelamentoId, mov.parcelamentoId));
    }

    else if (tipo === "toda_recorrencia" && mov.recorrenciaId) {
      await db
        .delete(transacoes)
        .where(eq(transacoes.recorrenciaId, mov.recorrenciaId));
    }

    return NextResponse.json({ sucesso: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}