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

    /* 2. Transaction */
    await db.transaction(async (trx) => {
      /* 2.1 Buscar cartão e verificar ownership */
      const [cartao] = await trx
        .select()
        .from(cartoes)
        .where(
          and(
            eq(cartoes.id, cartaoId),
            eq(cartoes.userId, userId) // 🔐 Verificar ownership
          )
        );

      if (!cartao) {
        throw new Error("CARTAO_NAO_ENCONTRADO");
      }

      if (!cartao.ativo) {
        throw new Error("CARTAO_INATIVO");
      }

      const limiteDisponivel = Number(cartao.limiteDisponivel);

      if (limiteDisponivel < valorTotal) {
        throw new Error("LIMITE_INSUFICIENTE");
      }

      /* 2.2 Criar ou buscar fatura - 🔐 filtrar por userId */
      const [fatura] = await trx
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

      if (!fatura) {
        const [novaFatura] = await trx
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
          throw new Error("FATURA_JA_PAGA");
        }
        faturaId = fatura.id;
      }

      /* 2.3 Inserir transações (parceladas ou não) - 🔐 incluir userId */
      const parcelamentoId = parcelado
        ? crypto.randomUUID()
        : null;

      for (let i = 1; i <= parcelas; i++) {
        const dataParcela = new Date(dataCompra);
        dataParcela.setMonth(dataParcela.getMonth() + (i - 1));

        await trx.insert(transacoes).values({
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
        });
      }

      /* 2.4 Atualizar total da fatura */
      const totalAtual = fatura ? Number(fatura.total) : 0;
      const novoTotal = totalAtual + valorTotal;

      await trx
        .update(faturas)
        .set({ 
          total: String(novoTotal),
          updatedAt: new Date(),
        })
        .where(eq(faturas.id, faturaId));

      /* 2.5 Atualizar limite disponível - 🔐 garantir ownership */
      await trx
        .update(cartoes)
        .set({
          limiteDisponivel: limiteDisponivel - valorTotal,
        })
        .where(
          and(
            eq(cartoes.id, cartaoId),
            eq(cartoes.userId, userId) // 🔐 Garantir ownership
          )
        );
    });

    return NextResponse.json(
      { success: true, message: "Transação criada com sucesso" },
      { status: 201 }
    );
  } catch (error: any) { // ✅ Adicionar tipo 'any'
    console.error("Erro ao criar transação de cartão:", error);

    if (error instanceof Error && error.message === "Não autenticado") {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    const errorMessages: Record<string, { message: string; status: number }> = {
      CARTAO_NAO_ENCONTRADO: { message: "Cartão não encontrado", status: 404 },
      CARTAO_INATIVO: { message: "Cartão inativo", status: 400 },
      LIMITE_INSUFICIENTE: { message: "Limite insuficiente", status: 400 },
      FATURA_JA_PAGA: { message: "Não é possível adicionar transações em fatura já paga", status: 400 },
    };

    const errorInfo = error instanceof Error && errorMessages[error.message]
      ? errorMessages[error.message]
      : {
          message: error instanceof Error ? error.message : "Erro ao criar transação de cartão",
          status: 400,
        };

    return NextResponse.json(
      { error: errorInfo.message },
      { status: errorInfo.status }
    );
  }
}