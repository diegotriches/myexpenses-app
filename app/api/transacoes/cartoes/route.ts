import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { cartoes, faturas, transacoes } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      cartaoId,
      contaId,
      descricao,
      valor,
      data,
      categoria,
      parcelado = false,
      parcelas = 1,
    } = body;

    /* 1. Validações básicas */
    if (!cartaoId || !contaId || !valor || Number(valor) <= 0) {
      return NextResponse.json(
        { error: "Cartão, conta e valor válido são obrigatórios" },
        { status: 400 }
      );
    }

    if (parcelado && (!parcelas || parcelas < 2)) {
      return NextResponse.json(
        { error: "Parcelamento inválido" },
        { status: 400 }
      );
    }

    const dataCompra = data ? new Date(data) : new Date();
    const ano = dataCompra.getFullYear();
    const mes = dataCompra.getMonth() + 1;

    const valorTotal = Number(valor);
    const valorParcela = parcelado
      ? Number((valorTotal / parcelas).toFixed(2))
      : valorTotal;

    /* 2. Transaction */
    await db.transaction(async (trx) => {
      /* 2.1 Buscar cartão */
      const [cartao] = await trx
        .select()
        .from(cartoes)
        .where(eq(cartoes.id, cartaoId));

      if (!cartao) {
        throw new Error("Cartão não encontrado");
      }

      if (!cartao.ativo) {
        throw new Error("Cartão inativo");
      }

      const limiteDisponivel = Number(cartao.limiteDisponivel);

      if (limiteDisponivel < valorTotal) {
        throw new Error("Limite insuficiente");
      }

      /* 2.2 Criar ou buscar fatura */
      const [fatura] = await trx
        .select()
        .from(faturas)
        .where(
          and(
            eq(faturas.cartaoId, cartaoId),
            eq(faturas.ano, ano),
            eq(faturas.mes, mes)
          )
        );

      let faturaId: number;

      if (!fatura) {
        const [novaFatura] = await trx
          .insert(faturas)
          .values({
            cartaoId,
            ano,
            mes,
            total: "0",
            paga: false,
          })
          .returning();

        faturaId = novaFatura.id;
      } else {
        if (fatura.paga) {
          throw new Error("Fatura já paga");
        }
        faturaId = fatura.id;
      }

      /* 2.3 Inserir transações (parceladas ou não) */
      const parcelamentoId = parcelado
        ? crypto.randomUUID()
        : null;

      for (let i = 1; i <= parcelas; i++) {
        const dataParcela = new Date(dataCompra);
        dataParcela.setMonth(dataParcela.getMonth() + (i - 1));

        await trx.insert(transacoes).values({
          data: dataParcela,
          tipo: "saida",
          descricao,
          valor: String(valorParcela),
          categoria,
          formaPagamento: "CARTAO",
          contaId,
          cartaoId,
          parcelado,
          parcelas: parcelado ? parcelas : null,
          parcelaAtual: parcelado ? i : null,
          parcelamentoId,
        });
      }

      /* 2.4 Atualizar total da fatura */
      const totalAtual = fatura ? Number(fatura.total) : 0;
      const novoTotal = totalAtual + valorTotal;

      await trx
        .update(faturas)
        .set({ total: String(novoTotal) })
        .where(eq(faturas.id, faturaId));

      /* 2.5 Atualizar limite disponível */
      await trx
        .update(cartoes)
        .set({
          limiteDisponivel: limiteDisponivel - valorTotal,
        })
        .where(eq(cartoes.id, cartaoId));
    });

    return NextResponse.json(
      { success: true },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);

    const message =
      error instanceof Error
        ? error.message
        : "Erro ao criar transação de cartão";

    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }
}