import { db } from "@/db";
import { transacoes, cartoes } from "@/db/schema";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  console.log("=== DEBUG PUT /api/transacoes/[id] ===");

  const { params } = context;
  const { id } = await params;
  console.log("ID recebido:", id);

  const numericId = Number(id);
  if (isNaN(numericId)) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  }

  try {
    const body = await req.json();
    console.log("BODY recebido:", body);

    let {
      data,
      tipo,
      descricao,
      valor,
      categoria,
      formaPagamento,
      parcela,
      recorrente,
      cartaoId,
    } = body;

    const formasPermitidas = ["dinheiro", "pix", "cartao"];
    if (!formasPermitidas.includes(formaPagamento)) {
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
        valor,
        categoria,
        formaPagamento,
        parcela,
        recorrente: !!recorrente,
        cartaoId: cartaoId ? Number(cartaoId) : null,
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
    console.log("ID recebido para DELETE:", id);

    const numericId = Number(id);
    if (isNaN(numericId)) {
      return NextResponse.json({ error: "ID inválido." }, { status: 400 });
    }

    const [apagada] = await db
      .delete(transacoes)
      .where(eq(transacoes.id, numericId))
      .returning({ id: transacoes.id });

    if (!apagada) {
      return NextResponse.json(
        { error: "Transação não encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ sucesso: true, id: apagada.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}