import { db } from "@/db";
import { transacoes, cartoes } from "@/db/schema";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

export async function GET(_req: Request) {
    try {
        const result = await db.select().from(transacoes);
        return NextResponse.json(result);
    } catch (err: any) {
        return NextResponse.json(
            { error: "Erro ao buscar transações: " + err.message },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
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

      // Parcelamento
      parcelado,
      parcelamentoId,
      parcelas,
      parcelaAtual,

      // Recorrência
      recorrente,
      recorrenciaId,
      repeticoes,
    } = body;

    if (!data || !tipo || !descricao || !valor) {
      return NextResponse.json(
        { error: "Campos obrigatórios ausentes." },
        { status: 400 }
      );
    }

    const valorNum = Number(valor);
    if (Number.isNaN(valorNum)) {
      return NextResponse.json(
        { error: "Valor inválido." },
        { status: 400 }
      );
    }

    if (!["dinheiro", "pix", "cartao"].includes(formaPagamento)) {
      formaPagamento = "dinheiro";
    }

    if (formaPagamento !== "cartao") {
      cartaoId = null;
    }

    if (formaPagamento === "cartao" && cartaoId !== null) {
      const cartaoNum = Number(cartaoId);
      if (Number.isNaN(cartaoNum)) {
        return NextResponse.json({ error: "cartaoId inválido." }, { status: 400 });
      }

      const existe = await db
        .select()
        .from(cartoes)
        .where(eq(cartoes.id, cartaoNum));

      if (existe.length === 0) {
        return NextResponse.json(
          { error: "Cartão informado não existe." },
          { status: 400 }
        );
      }

      cartaoId = cartaoNum;
    }

    const [nova] = await db
      .insert(transacoes)
      .values({
        data,
        tipo,
        descricao,
        valor: valorNum,
        categoria,
        formaPagamento,
        cartaoId: cartaoId ?? null,

        // Parcelamento
        parcelado: Boolean(parcelado),
        parcelamentoId: parcelamentoId ?? null,
        parcelas: parcelas ?? null,
        parcelaAtual: parcelaAtual ?? null,

        // Recorrência
        recorrente: Boolean(recorrente),
        recorrenciaId: recorrenciaId ?? null,
        repeticoes: repeticoes ?? null,
      })
      .returning();

    return NextResponse.json(nova, { status: 201 });

  } catch (err: any) {
    return NextResponse.json(
      { error: "Erro ao criar transação: " + err.message },
      { status: 500 }
    );
  }
}