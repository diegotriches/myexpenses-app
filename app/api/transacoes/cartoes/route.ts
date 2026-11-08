// app/api/transacoes/cartoes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { cartoes, faturas, transacoes } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import { garantirDono } from "@/lib/garantirDono";
import { calcularFaturaDaTransacao } from "@/utils/faturaUtils";

// ============================================================================
// HELPER: Adicionar meses sem overflow de dias
// ============================================================================

/**
 * Avança N meses a partir de uma data sem overflow de dias.
 *
 * O JavaScript nativo faz:
 *   new Date(2026, 0, 31).setMonth(1) → 3 de março (31/fev não existe)
 *
 * Esta função trava no último dia do mês destino quando necessário:
 *   31/jan + 1 mês → 28/fev (não 03/mar)
 *   30/jan + 1 mês → 28/fev
 *   31/jan + 2 meses → 31/mar ✅
 */
function adicionarMeses(data: Date, meses: number): Date {
  const diaOriginal = data.getDate();

  // Avança para o dia 1 antes de mudar o mês — evita overflow
  const resultado = new Date(data);
  resultado.setDate(1);
  resultado.setMonth(resultado.getMonth() + meses);

  // Usa o menor entre o dia original e o último dia do mês destino
  const ultimoDiaDoMes = new Date(
    resultado.getFullYear(),
    resultado.getMonth() + 1,
    0
  ).getDate();

  resultado.setDate(Math.min(diaOriginal, ultimoDiaDoMes));
  return resultado;
}

// ============================================================================
// POST - Criar transação de cartão (à vista ou parcelada)
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    // 🔐 Autenticação
    const userId = await getUserId();

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

    const erroDono = await garantirDono(userId, { contaId });
    if (erroDono) return NextResponse.json({ error: erroDono }, { status: 404 });

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
      // ✅ CORRIGIDO: usa adicionarMeses() em vez de setMonth()
      // Evita overflow: 31/jan + 1 mês = 28/fev (não 03/mar)
      const dataParcela = adicionarMeses(dataCompra, i - 1);

      const { mes: mesFatura, ano: anoFatura } = calcularFaturaDaTransacao(
        dataParcela,
        diaFechamento
      );

      console.log(
        `📅 Parcela ${i}/${parcelas} em ${dataParcela.toLocaleDateString('pt-BR')} → Fatura ${mesFatura}/${anoFatura}`
      );

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

      if (faturaExistente && faturaExistente.paga) {
        return NextResponse.json(
          {
            error: `Parcela ${i}/${parcelas} cairia na fatura ${mesFatura}/${anoFatura} que já está paga.`,
          },
          { status: 400 }
        );
      }

      let faturaId: number;

      if (!faturaExistente) {
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

      const totalAtual = faturaExistente ? Number(faturaExistente.total) : 0;
      const novoTotal = totalAtual + valorParcela;

      await db
        .update(faturas)
        .set({
          total: novoTotal.toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(faturas.id, faturaId));

      console.log(
        `✅ Fatura ${mesFatura}/${anoFatura}: R$ ${totalAtual.toFixed(2)} → R$ ${novoTotal.toFixed(2)}`
      );
    }

    /* 2.3 Atualizar limite disponível (valor total, uma vez) */
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
      `💳 Limite: R$ ${limiteDisponivel.toFixed(2)} → R$ ${novoLimiteDisponivel.toFixed(2)}`
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