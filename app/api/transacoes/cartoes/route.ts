// app/api/transacoes/cartoes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { cartoes, faturas, transacoes } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import { calcularFaturaDaTransacao } from "@/utils/faturaUtils";

export async function POST(req: NextRequest) {
  try {
    // 🔐 Autenticação
    const userId = await getUserId();

    // ✅ VALIDAÇÃO: Retorna 401 se não autenticado
    if (!userId) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

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
    const valorTotal = Number(valor);
    const valorParcela = parcelado
      ? Number((valorTotal / parcelas).toFixed(2))
      : valorTotal;

    /* 2.1 Buscar cartão e verificar ownership */
    const [cartao] = await db
      .select()
      .from(cartoes)
      .where(
        and(
          eq(cartoes.id, cartaoId),
          eq(cartoes.userId, userId)
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

    const diaFechamento = cartao.diaFechamento || 1;

    /* 2.2 Criar transações e atualizar faturas */
    const parcelamentoId = parcelado ? crypto.randomUUID() : null;
    const transacoesCriadas = [];

    for (let i = 1; i <= parcelas; i++) {
      // Calcular data da parcela
      const dataParcela = new Date(dataCompra);
      dataParcela.setMonth(dataParcela.getMonth() + (i - 1));

      // ✅ CRÍTICO: Calcular fatura correta para CADA parcela
      const { mes: mesFatura, ano: anoFatura } = calcularFaturaDaTransacao(
        dataParcela,
        diaFechamento
      );

      console.log(
        `📅 Parcela ${i}/${parcelas} em ${dataParcela.toLocaleDateString('pt-BR')} → Fatura ${mesFatura}/${anoFatura}`
      );

      // ✅ Buscar ou criar fatura (filtrando por userId)
      const [faturaExistente] = await db
        .select()
        .from(faturas)
        .where(
          and(
            eq(faturas.cartaoId, cartaoId),
            eq(faturas.userId, userId),
            eq(faturas.mes, mesFatura),
            eq(faturas.ano, anoFatura)
          )
        );

      // ✅ Verificar se fatura está paga
      if (faturaExistente && faturaExistente.paga) {
        return NextResponse.json(
          { 
            error: `Parcela ${i}/${parcelas} cairia na fatura ${mesFatura}/${anoFatura} que já está paga. Não é possível adicionar.`
          },
          { status: 400 }
        );
      }

      let faturaId: number;

      if (!faturaExistente) {
        // Criar nova fatura
        const [novaFatura] = await db
          .insert(faturas)
          .values({
            userId,
            cartaoId,
            ano: anoFatura,
            mes: mesFatura,
            total: "0",
            paga: false,
          })
          .returning();

        faturaId = novaFatura.id;
        console.log(`✅ Fatura ${mesFatura}/${anoFatura} criada`);
      } else {
        faturaId = faturaExistente.id;
      }

      // ✅ Criar transação
      const [transacao] = await db
        .insert(transacoes)
        .values({
          userId,
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

      // ✅ Atualizar total da fatura
      const totalAtual = faturaExistente 
        ? Number(faturaExistente.total) 
        : 0;
      const novoTotal = totalAtual + valorParcela;

      await db
        .update(faturas)
        .set({
          total: novoTotal.toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(faturas.id, faturaId));

      console.log(
        `✅ Fatura ${mesFatura}/${anoFatura} atualizada: R$ ${totalAtual.toFixed(2)} → R$ ${novoTotal.toFixed(2)}`
      );
    }

    /* 2.3 Atualizar limite disponível (apenas 1 vez, com valor total) */
    const novoLimiteDisponivel = limiteDisponivel - valorTotal;

    await db
      .update(cartoes)
      .set({
        limiteDisponivel: novoLimiteDisponivel.toFixed(2),
      })
      .where(
        and(
          eq(cartoes.id, cartaoId),
          eq(cartoes.userId, userId)
        )
      );

    console.log(
      `💳 Limite atualizado: R$ ${limiteDisponivel.toFixed(2)} → R$ ${novoLimiteDisponivel.toFixed(2)}`
    );

    return NextResponse.json(
      {
        success: true,
        message: parcelado 
          ? `Compra parcelada em ${parcelas}x criada com sucesso`
          : "Transação criada com sucesso",
        transacoes: transacoesCriadas,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("❌ Erro ao criar transação de cartão:", error);
    const message = error instanceof Error ? error.message : "Erro ao criar transação de cartão";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}