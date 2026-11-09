// src/lib/recorrencias/notificarRecorrencia.ts
//
// Cria as notificações geradas pelo cron de recorrências. Nenhuma função
// aqui lança erro: se a notificação falhar, a transação já gerada não é
// afetada (apenas registra no log).

import { db } from "@/db";
import { notificacoes, preferenciasNotificacao } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { AlertaImpacto } from "./aplicarImpacto";
import { formatarMoeda } from "@/utils/formatadores";

// Respeita as preferências do usuário; sem registro = tudo ligado
async function preferenciaAtiva(
  userId: string,
  campo: "saldoBaixo" | "limiteCartao",
): Promise<boolean> {
  try {
    const [pref] = await db
      .select()
      .from(preferenciasNotificacao)
      .where(eq(preferenciasNotificacao.userId, userId))
      .limit(1);
    return pref ? pref[campo] : true;
  } catch {
    return true;
  }
}

interface ImpactoParams {
  userId: string;
  recorrenciaId: string;
  transacaoId: string;
  descricao: string | null;
  valor: number;
  dataTexto: string; // dd/mm
  alerta: AlertaImpacto;
}

export async function notificarImpactoRecorrencia(
  p: ImpactoParams,
): Promise<void> {
  try {
    const { userId, alerta } = p;
    const nome = p.descricao?.trim() || "Recorrência sem descrição";

    if (alerta.tipo === "SALDO_NEGATIVO") {
      if (!(await preferenciaAtiva(userId, "saldoBaixo"))) return;

      const origem = alerta.cartaoNome
        ? `a conta "${alerta.contaNome}" (cartão de débito ${alerta.cartaoNome})`
        : `a conta "${alerta.contaNome}"`;

      await db.insert(notificacoes).values({
        userId,
        tipo: "RECORRENCIA_SALDO_NEGATIVO",
        severidade: "error",
        titulo: "Recorrência deixou a conta negativa",
        mensagem: `A recorrência "${nome}" (${formatarMoeda(p.valor)}) foi lançada em ${p.dataTexto} e deixou ${origem} com saldo de ${formatarMoeda(alerta.saldoApos)}.`,
        link: "/contas",
        metadata: {
          recorrenciaId: p.recorrenciaId,
          transacaoId: p.transacaoId,
          contaId: alerta.contaId,
          valor: p.valor,
          saldoApos: alerta.saldoApos,
        },
      });
      return;
    }

    // LIMITE_EXCEDIDO
    if (!(await preferenciaAtiva(userId, "limiteCartao"))) return;

    await db.insert(notificacoes).values({
      userId,
      tipo: "RECORRENCIA_LIMITE_EXCEDIDO",
      severidade: "error",
      titulo: "Recorrência excedeu o limite do cartão",
      mensagem: `A recorrência "${nome}" (${formatarMoeda(p.valor)}) foi lançada em ${p.dataTexto} e o cartão "${alerta.cartaoNome}" ficou com limite disponível de ${formatarMoeda(alerta.limiteDisponivelApos)}.`,
      link: "/cartoes",
      metadata: {
        recorrenciaId: p.recorrenciaId,
        transacaoId: p.transacaoId,
        cartaoId: alerta.cartaoId,
        valor: p.valor,
        limiteDisponivelApos: alerta.limiteDisponivelApos,
      },
    });
  } catch (error: any) {
    console.error(
      "[Recorrências] Falha ao criar notificação de impacto:",
      error?.message,
    );
  }
}

interface ErroParams {
  userId: string;
  recorrenciaId: string;
  descricao: string | null;
  valor: number;
  dataTexto: string; // dd/mm
  motivo: string;
}

export async function notificarErroRecorrencia(p: ErroParams): Promise<void> {
  try {
    const nome = p.descricao?.trim() || "Recorrência sem descrição";
    await db.insert(notificacoes).values({
      userId: p.userId,
      tipo: "RECORRENCIA_ERRO",
      severidade: "error",
      titulo: "Não foi possível gerar uma recorrência",
      mensagem: `A recorrência "${nome}" (${formatarMoeda(p.valor)}) não pôde ser gerada em ${p.dataTexto}. Confira os dados dela e lance a movimentação manualmente, se necessário.`,
      link: "/transacoes",
      metadata: {
        recorrenciaId: p.recorrenciaId,
        valor: p.valor,
        motivo: p.motivo,
      },
    });
  } catch (error: any) {
    console.error(
      "[Recorrências] Falha ao criar notificação de erro:",
      error?.message,
    );
  }
}