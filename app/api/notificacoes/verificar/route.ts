// src/app/api/notificacoes/verificar/route.ts

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { notificacoes, cartoes, faturas, contas, preferenciasNotificacao } from "@/db/schema";
import { eq, and, lte, gte, sql } from "drizzle-orm";
import { getUserId } from "@/lib/auth";

/**
 * POST /api/notificacoes/verificar
 * Verifica e cria notificações automáticas para o usuário
 * Pode ser chamado por cron job ou manualmente
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    let notificacoesCriadas = 0;

    // Buscar preferências do usuário
    let [prefs] = await db
      .select()
      .from(preferenciasNotificacao)
      .where(eq(preferenciasNotificacao.userId, userId))
      .limit(1);

    // Criar preferências padrão se não existirem
    if (!prefs) {
      [prefs] = await db
        .insert(preferenciasNotificacao)
        .values({ userId })
        .returning();
    }

    const hoje = new Date();
    const diasAVencer = new Date(hoje);
    diasAVencer.setDate(diasAVencer.getDate() + prefs.diasAntesVencimento);

    // ==================== 1. FATURAS ====================
    if (prefs.faturas) {
      // Buscar todos os cartões do usuário
      const cartoesUsuario = await db
        .select()
        .from(cartoes)
        .where(and(eq(cartoes.userId, userId), eq(cartoes.ativo, true)));

      for (const cartao of cartoesUsuario) {
        // Buscar faturas não pagas
        const faturasNaoPagas = await db
          .select()
          .from(faturas)
          .where(
            and(
              eq(faturas.cartaoId, cartao.id),
              eq(faturas.paga, false)
            )
          );

        for (const fatura of faturasNaoPagas) {
          // Calcular data de vencimento
          const vencimento = new Date(fatura.ano, fatura.mes - 1, cartao.diaVencimento || 15);
          const diasRestantes = Math.ceil((vencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

          // Verificar se já existe notificação para esta fatura
          const jaNotificou = await db
            .select()
            .from(notificacoes)
            .where(
              and(
                eq(notificacoes.userId, userId),
                eq(notificacoes.tipo, "FATURA_PROXIMA_VENCIMENTO"),
                sql`metadata->>'cartaoId' = ${String(cartao.id)}`,
                sql`metadata->>'mes' = ${String(fatura.mes)}`,
                sql`metadata->>'ano' = ${String(fatura.ano)}`
              )
            )
            .limit(1);

          // Fatura vencida
          if (diasRestantes < 0 && !jaNotificou.length) {
            await db.insert(notificacoes).values({
              userId,
              tipo: "FATURA_VENCIDA",
              severidade: "error",
              titulo: `Fatura ${cartao.nome} vencida!`,
              mensagem: `A fatura de ${fatura.mes}/${fatura.ano} está atrasada. Valor: R$ ${Number(fatura.total).toFixed(2)}`,
              link: `/cartoes`,
              metadata: { cartaoId: cartao.id, mes: fatura.mes, ano: fatura.ano },
            });
            notificacoesCriadas++;
          }
          // Fatura próxima do vencimento
          else if (diasRestantes > 0 && diasRestantes <= prefs.diasAntesVencimento && !jaNotificou.length) {
            await db.insert(notificacoes).values({
              userId,
              tipo: "FATURA_PROXIMA_VENCIMENTO",
              severidade: "warning",
              titulo: `Fatura ${cartao.nome} vence em ${diasRestantes} dias`,
              mensagem: `Vencimento: ${vencimento.toLocaleDateString('pt-BR')}. Valor: R$ ${Number(fatura.total).toFixed(2)}`,
              link: `/cartoes`,
              metadata: { cartaoId: cartao.id, mes: fatura.mes, ano: fatura.ano },
            });
            notificacoesCriadas++;
          }
        }
      }
    }

    // ==================== 2. LIMITE DE CARTÃO ====================
    if (prefs.limiteCartao) {
      const cartoesUsuario = await db
        .select()
        .from(cartoes)
        .where(and(eq(cartoes.userId, userId), eq(cartoes.ativo, true)));

      for (const cartao of cartoesUsuario) {
        const limite = Number(cartao.limite);
        const disponivel = Number(cartao.limiteDisponivel);
        const percentualUsado = ((limite - disponivel) / limite) * 100;

        // Verificar se já notificou recentemente (últimas 24h)
        const umDiaAtras = new Date(hoje);
        umDiaAtras.setDate(umDiaAtras.getDate() - 1);

        const jaNotificou = await db
          .select()
          .from(notificacoes)
          .where(
            and(
              eq(notificacoes.userId, userId),
              eq(notificacoes.tipo, "LIMITE_CARTAO_95"),
              sql`metadata->>'cartaoId' = ${String(cartao.id)}`,
              gte(notificacoes.createdAt, umDiaAtras)
            )
          )
          .limit(1);

        // Limite em 95%
        if (percentualUsado >= 95 && !jaNotificou.length) {
          await db.insert(notificacoes).values({
            userId,
            tipo: "LIMITE_CARTAO_95",
            severidade: "error",
            titulo: `Limite do ${cartao.nome} quase esgotado!`,
            mensagem: `${percentualUsado.toFixed(0)}% do limite usado. Disponível: R$ ${disponivel.toFixed(2)}`,
            link: `/cartoes`,
            metadata: { cartaoId: cartao.id, percentual: percentualUsado },
          });
          notificacoesCriadas++;
        }
        // Limite em 80%
        else if (percentualUsado >= 80 && percentualUsado < 95 && !jaNotificou.length) {
          await db.insert(notificacoes).values({
            userId,
            tipo: "LIMITE_CARTAO_80",
            severidade: "warning",
            titulo: `Atenção ao limite do ${cartao.nome}`,
            mensagem: `${percentualUsado.toFixed(0)}% do limite usado. Disponível: R$ ${disponivel.toFixed(2)}`,
            link: `/cartoes`,
            metadata: { cartaoId: cartao.id, percentual: percentualUsado },
          });
          notificacoesCriadas++;
        }
      }
    }

    // ==================== 3. SALDO DE CONTAS ====================
    if (prefs.saldoBaixo) {
      const contasUsuario = await db
        .select()
        .from(contas)
        .where(and(eq(contas.userId, userId), eq(contas.ativo, true)));

      for (const conta of contasUsuario) {
        const saldo = Number(conta.saldoAtual);

        // Verificar se já notificou recentemente
        const umDiaAtras = new Date(hoje);
        umDiaAtras.setDate(umDiaAtras.getDate() - 1);

        const jaNotificou = await db
          .select()
          .from(notificacoes)
          .where(
            and(
              eq(notificacoes.userId, userId),
              sql`tipo IN ('SALDO_BAIXO', 'SALDO_NEGATIVO')`,
              sql`metadata->>'contaId' = ${conta.id}`,
              gte(notificacoes.createdAt, umDiaAtras)
            )
          )
          .limit(1);

        // Saldo negativo
        if (saldo < 0 && !jaNotificou.length) {
          await db.insert(notificacoes).values({
            userId,
            tipo: "SALDO_NEGATIVO",
            severidade: "error",
            titulo: `Saldo negativo em ${conta.nome}!`,
            mensagem: `Saldo atual: R$ ${saldo.toFixed(2)}`,
            link: `/contas`,
            metadata: { contaId: conta.id, saldo },
          });
          notificacoesCriadas++;
        }
        // Saldo baixo
        else if (saldo >= 0 && saldo < prefs.limiteMinimoConta && !jaNotificou.length) {
          await db.insert(notificacoes).values({
            userId,
            tipo: "SALDO_BAIXO",
            severidade: "warning",
            titulo: `Saldo baixo em ${conta.nome}`,
            mensagem: `Saldo atual: R$ ${saldo.toFixed(2)}`,
            link: `/contas`,
            metadata: { contaId: conta.id, saldo },
          });
          notificacoesCriadas++;
        }
      }
    }

    return NextResponse.json({
      message: "Verificação concluída",
      criadas: notificacoesCriadas,
    });
  } catch (error: any) {
    console.error("Erro ao verificar notificações:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}