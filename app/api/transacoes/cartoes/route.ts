import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { cartoes, faturas, transacoes } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getUserIdFromSession } from "@/lib/auth/helpers";

export async function POST(req: NextRequest) {
  try {
    // 🔐 Autenticação
    const userId = await getUserIdFromSession();

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

    /* ========================================
       ✅ SEM TRANSACTION - Operações Sequenciais
       ======================================== */

    /* 2.1 Buscar cartão e verificar ownership */
    const [cartao] = await db
      .select()
      .from(cartoes)
      .where(
        and(
          eq(cartoes.id, cartaoId),
          eq(cartoes.userId, userId) // 🔐 Verificar ownership
        )
      );

    if (!cartao) {
      return NextResponse.json(
        { error: "Cartão não encontrado" },
        { status: 404 }
      );
    }

    if (!cartao.ativo) {
      return NextResponse.json(
        { error: "Cartão inativo" },
        { status: 400 }
      );
    }

    // ✅ Converter string para number
    const limiteDisponivel = Number(cartao.limiteDisponivel);

    if (limiteDisponivel < valorTotal) {
      return NextResponse.json(
        { error: "Limite insuficiente no cartão" },
        { status: 400 }
      );
    }

    /* 2.2 Criar ou buscar fatura - 🔐 filtrar por userId */
    const [fatura] = await db
      .select()
      .from(faturas)
      .where(
        and(
          eq(faturas.cartaoId, cartaoId),
          eq(faturas.userId, userId), // 🔐 Filtrar por userId
          eq(faturas.ano, ano),
          eq(faturas.mes, mes)
        )
      );

    let faturaId: number;
    let totalAtualFatura = 0;

    if (!fatura) {
      const [novaFatura] = await db
        .insert(faturas)
        .values({
          userId, // 🔐 Incluir userId
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
        return NextResponse.json(
          { error: "Não é possível adicionar transações em fatura já paga" },
          { status: 400 }
        );
      }
      faturaId = fatura.id;
      totalAtualFatura = Number(fatura.total);
    }

    /* 2.3 Inserir transações (parceladas ou não) - 🔐 incluir userId */
    const parcelamentoId = parcelado ? crypto.randomUUID() : null;
    const transacoesCriadas = [];

    for (let i = 1; i <= parcelas; i++) {
      const dataParcela = new Date(dataCompra);
      dataParcela.setMonth(dataParcela.getMonth() + (i - 1));

      const [transacao] = await db
        .insert(transacoes)
        .values({
          userId, // 🔐 CRÍTICO: Incluir userId
          data: dataParcela,
          tipo: "saida",
          descricao,
          valor: String(valorParcela),
          categoria,
          formaPagamento: "cartao",
          contaId,
          cartaoId,
          parcelado,
          parcelas: parcelado ? parcelas : null,
          parcelaAtual: parcelado ? i : null,
          parcelamentoId,
        })
        .returning();

      transacoesCriadas.push(transacao);
    }

    /* 2.4 Atualizar total da fatura */
    const novoTotalFatura = totalAtualFatura + valorTotal;

    await db
      .update(faturas)
      .set({
        total: novoTotalFatura.toFixed(2), // ✅ String no formato "123.45"
        updatedAt: new Date(),
      })
      .where(eq(faturas.id, faturaId));

    /* 2.5 Atualizar limite disponível - 🔐 garantir ownership */
    const novoLimiteDisponivel = limiteDisponivel - valorTotal;

    await db
      .update(cartoes)
      .set({
        limiteDisponivel: novoLimiteDisponivel.toFixed(2), // ✅ String no formato "123.45"
      })
      .where(
        and(
          eq(cartoes.id, cartaoId),
          eq(cartoes.userId, userId) // 🔐 Garantir ownership
        )
      );

    return NextResponse.json(
      {
        success: true,
        message: "Transação criada com sucesso",
        transacoes: transacoesCriadas,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Erro ao criar transação de cartão:", error);

    if (error instanceof Error && error.message === "Não autenticado") {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao criar transação de cartão",
      },
      { status: 500 }
    );
  }
}