// src/app/api/notificacoes/verificar/route.ts

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { notificacoes, cartoes, faturas, contas, preferenciasNotificacao } from "@/db/schema";
import { eq, and, gte, sql, inArray } from "drizzle-orm";
import { getUserId } from "@/lib/auth";

// ==================== HELPER ====================

/**
 * Verifica se já foi criada notificação recentemente
 * @param userId - ID do usuário
 * @param tipos - Tipo(s) de notificação
 * @param metadata - Filtros de metadata
 * @param horas - Janela de tempo (padrão: 24h)
 */
async function jaNotificouRecentemente(
  userId: string,
  tipos: string | string[],
  metadata: Record<string, string>,
  horas: number = 24
): Promise<boolean> {
  const dataLimite = new Date();
  dataLimite.setHours(dataLimite.getHours() - horas);

  const conditions = [
    eq(notificacoes.userId, userId),
    gte(notificacoes.createdAt, dataLimite),
  ];

  // Adicionar filtro de tipo(s)
  if (Array.isArray(tipos)) {
    conditions.push(inArray(notificacoes.tipo, tipos));
  } else {
    conditions.push(eq(notificacoes.tipo, tipos));
  }

  // Adicionar filtros de metadata
  for (const [key, value] of Object.entries(metadata)) {
    conditions.push(sql`metadata->>'${sql.raw(key)}' = ${value}`);
  }

  const result = await db
    .select()
    .from(notificacoes)
    .where(and(...conditions))
    .limit(1);

  return result.length > 0;
}

// ==================== ROUTE ====================

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

          const metadataFatura = {
            cartaoId: String(cartao.id),
            mes: String(fatura.mes),
            ano: String(fatura.ano),
          };

          // Fatura vencida
          if (diasRestantes < 0) {
            const jaNotificou = await jaNotificouRecentemente(
              userId,
              "FATURA_VENCIDA",
              metadataFatura
            );

            if (!jaNotificou) {
              await db.insert(notificacoes).values({
                userId,
                tipo: "FATURA_VENCIDA",
                severidade: "error",
                titulo: `Fatura ${cartao.nome} vencida!`,
                mensagem: `A fatura de ${fatura.mes}/${fatura.ano} está atrasada. Valor: R$ ${Number(fatura.total).toFixed(2)}`,
                link: `/cartoes`,
                metadata: metadataFatura,
              });
              notificacoesCriadas++;
            }
          }
          // Fatura próxima do vencimento
          else if (diasRestantes > 0 && diasRestantes <= prefs.diasAntesVencimento) {
            const jaNotificou = await jaNotificouRecentemente(
              userId,
              "FATURA_PROXIMA_VENCIMENTO",
              metadataFatura
            );

            if (!jaNotificou) {
              await db.insert(notificacoes).values({
                userId,
                tipo: "FATURA_PROXIMA_VENCIMENTO",
                severidade: "warning",
                titulo: `Fatura ${cartao.nome} vence em ${diasRestantes} dias`,
                mensagem: `Vencimento: ${vencimento.toLocaleDateString('pt-BR')}. Valor: R$ ${Number(fatura.total).toFixed(2)}`,
                link: `/cartoes`,
                metadata: metadataFatura,
              });
              notificacoesCriadas++;
            }
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

        const metadataLimite = { cartaoId: String(cartao.id) };

        // Limite em 95%
        if (percentualUsado >= 95) {
          const jaNotificou = await jaNotificouRecentemente(
            userId,
            "LIMITE_CARTAO_95",
            metadataLimite
          );

          if (!jaNotificou) {
            await db.insert(notificacoes).values({
              userId,
              tipo: "LIMITE_CARTAO_95",
              severidade: "error",
              titulo: `Limite do ${cartao.nome} quase esgotado!`,
              mensagem: `${percentualUsado.toFixed(0)}% do limite usado. Disponível: R$ ${disponivel.toFixed(2)}`,
              link: `/cartoes`,
              metadata: { ...metadataLimite, percentual: percentualUsado },
            });
            notificacoesCriadas++;
          }
        }
        // Limite em 80%
        else if (percentualUsado >= 80) {
          const jaNotificou = await jaNotificouRecentemente(
            userId,
            "LIMITE_CARTAO_80",
            metadataLimite
          );

          if (!jaNotificou) {
            await db.insert(notificacoes).values({
              userId,
              tipo: "LIMITE_CARTAO_80",
              severidade: "warning",
              titulo: `Atenção ao limite do ${cartao.nome}`,
              mensagem: `${percentualUsado.toFixed(0)}% do limite usado. Disponível: R$ ${disponivel.toFixed(2)}`,
              link: `/cartoes`,
              metadata: { ...metadataLimite, percentual: percentualUsado },
            });
            notificacoesCriadas++;
          }
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
        const metadataSaldo = { contaId: conta.id };

        // Saldo negativo
        if (saldo < 0) {
          const jaNotificou = await jaNotificouRecentemente(
            userId,
            ["SALDO_BAIXO", "SALDO_NEGATIVO"],
            metadataSaldo
          );

          if (!jaNotificou) {
            await db.insert(notificacoes).values({
              userId,
              tipo: "SALDO_NEGATIVO",
              severidade: "error",
              titulo: `Saldo negativo em ${conta.nome}!`,
              mensagem: `Saldo atual: R$ ${saldo.toFixed(2)}`,
              link: `/contas`,
              metadata: { ...metadataSaldo, saldo },
            });
            notificacoesCriadas++;
          }
        }
        // Saldo baixo
        else if (saldo >= 0 && saldo < prefs.limiteMinimoConta) {
          const jaNotificou = await jaNotificouRecentemente(
            userId,
            ["SALDO_BAIXO", "SALDO_NEGATIVO"],
            metadataSaldo
          );

          if (!jaNotificou) {
            await db.insert(notificacoes).values({
              userId,
              tipo: "SALDO_BAIXO",
              severidade: "warning",
              titulo: `Saldo baixo em ${conta.nome}`,
              mensagem: `Saldo atual: R$ ${saldo.toFixed(2)}`,
              link: `/contas`,
              metadata: { ...metadataSaldo, saldo },
            });
            notificacoesCriadas++;
          }
        }
      }
    }

    return NextResponse.json({
      message: "Verificação concluída",
      criadas: notificacoesCriadas,
    });
  } catch (error: any) {
    console.error("❌ Erro ao verificar notificações:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao verificar notificações" },
      { status: 500 }
    );
  }
}