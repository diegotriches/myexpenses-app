import { db } from "@/db";
import { transacoes } from "@/db/schema";
import { NextResponse } from "next/server";
import { createTransacaoDTO } from "@/dtos/create-transacao.dto";

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
    const json = await req.json();

    const parsed = createTransacaoDTO.parse(json);

    const [nova] = await db
      .insert(transacoes)
      .values({
        data: parsed.data,
        tipo: parsed.tipo,
        descricao: parsed.descricao ?? null,
        valor: parsed.valor,
        categoria: parsed.categoria ?? null,
        formaPagamento: parsed.formaPagamento,
        contaId: parsed.contaId,
        cartaoId:
          parsed.formaPagamento === "cartao"
            ? parsed.cartaoId
            : null,

        parcelado: parsed.parcelado,
        parcelamentoId: parsed.parcelamentoId ?? null,
        parcelas: parsed.parcelas ?? null,
        parcelaAtual: parsed.parcelaAtual ?? null,

        recorrente: parsed.recorrente,
        recorrenciaId: parsed.recorrenciaId ?? null,
        repeticoes: parsed.repeticoes ?? null,
      })
      .returning();

    return NextResponse.json(nova, { status: 201 });

  } catch (err: any) {
    if (err.name === "ZodError") {
      return NextResponse.json(
        { error: err.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Erro ao criar transação: " + err.message },
      { status: 500 }
    );
  }
}