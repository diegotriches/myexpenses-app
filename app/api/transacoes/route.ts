import { db } from "@/db";
import { transacoes } from "@/db/schema";
import { NextResponse } from "next/server";
import { TransacaoCreate } from "@/types/transacao";

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
    console.log("JSON recebido pelo backend:", json);

    // Conversões básicas
    const parsed = {
      ...json,
      valor: Number(json.valor),
      cartaoId: json.cartaoId ?? null,
      parcelaAtual: json.parcelaAtual ?? null,
      parcelas: json.parcelas ?? null,
      parcelamentoId: json.parcelamentoId ?? null,
      recorrenciaId: json.recorrenciaId ?? null,
      repeticoes: json.repeticoes ?? null,
    };

    // Validações
    if (!parsed.tipo || !["entrada", "saida"].includes(parsed.tipo)) {
      return NextResponse.json(
        { error: "Tipo de transação inválido" },
        { status: 400 }
      );
    }

    if (!parsed.contaId) {
      return NextResponse.json(
        { error: "contaId é obrigatório" },
        { status: 400 }
      );
    }

    if (!parsed.data || isNaN(new Date(parsed.data).getTime())) {
      return NextResponse.json(
        { error: "Data inválida" },
        { status: 400 }
      );
    }

    if (parsed.formaPagamento === "cartao" && parsed.cartaoId == null) {
      return NextResponse.json(
        { error: "cartaoId é obrigatório quando formaPagamento for 'cartao'" },
        { status: 400 }
      );
    }

    if (parsed.parcelado && (parsed.parcelas == null || parsed.parcelaAtual == null)) {
      return NextResponse.json(
        { error: "parcelas e parcelaAtual são obrigatórios quando parcelado" },
        { status: 400 }
      );
    }

    if (parsed.recorrente && parsed.repeticoes == null) {
      return NextResponse.json(
        { error: "repeticoes é obrigatório quando recorrente" },
        { status: 400 }
      );
    }

    // Preparar valores para inserção
    const values: typeof transacoes.$inferInsert = {
      data: new Date(parsed.data),
      tipo: parsed.tipo,
      descricao: parsed.descricao ?? null,
      valor: parsed.valor!,
      categoria: parsed.categoria ?? null,
      formaPagamento: parsed.formaPagamento ?? "dinheiro",
      contaId: parsed.contaId,
      cartaoId: parsed.formaPagamento === "cartao" ? parsed.cartaoId : null,
      parcelado: parsed.parcelado ?? false,
      parcelamentoId: parsed.parcelamentoId ?? null,
      parcelas: parsed.parcelas ?? null,
      parcelaAtual: parsed.parcelaAtual ?? null,
      recorrente: parsed.recorrente ?? false,
      recorrenciaId: parsed.recorrenciaId ?? null,
      repeticoes: parsed.repeticoes ?? null,
      transferenciaId: parsed.transferenciaId ?? null,
    };

    const [nova] = await db
      .insert(transacoes)
      .values(values)
      .returning();

    return NextResponse.json(nova, { status: 201 });
  } catch (err: any) {
    console.error("Erro ao criar transação:", err);
    return NextResponse.json(
      { error: "Erro ao criar transação: " + (err.message || err) },
      { status: 500 }
    );
  }
}