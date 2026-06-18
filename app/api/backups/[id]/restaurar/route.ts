// src/app/api/backups/[id]/restaurar/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  backupsUsuario, contas, cartoes, transacoes, categorias, faturas,
  extratoConta, notificacoes, preferenciasNotificacao, preferences,
  estabelecimentos, transferencias, notas, adiantamentosFatura,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getUserId } from "@/lib/auth";

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/backups/[id]/restaurar
// Restaura um backup: apaga os dados atuais do usuário em todas as tabelas
// e reinsere exatamente o que está no snapshot.
//
// ⚠️ OPERAÇÃO DESTRUTIVA E IRREVERSÍVEL — exige confirmação explícita no body.
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    if (body.confirmar !== true) {
      return NextResponse.json(
        { error: "Confirmação obrigatória — envie { confirmar: true } no body" },
        { status: 400 }
      );
    }

    const [backup] = await db
      .select()
      .from(backupsUsuario)
      .where(and(eq(backupsUsuario.id, id), eq(backupsUsuario.userId, userId)))
      .limit(1);

    if (!backup) return NextResponse.json({ error: "Backup não encontrado" }, { status: 404 });

    const snapshot = backup.dados as any;
    const data     = snapshot.data;

    if (!data) {
      return NextResponse.json({ error: "Backup corrompido ou em formato inválido" }, { status: 400 });
    }

    // ── Restauração em transação ────────────────────────────────────────────
    // Ordem de DELETE respeita dependências de FK (filhas antes das pais).
    // Ordem de INSERT é a inversa (pais antes das filhas).
    await db.transaction(async (tx) => {
      // 1. Apaga dados atuais (filhas → pais)
      await tx.delete(adiantamentosFatura).where(eq(adiantamentosFatura.userId, userId));
      await tx.delete(extratoConta).where(eq(extratoConta.userId, userId));
      await tx.delete(transferencias).where(eq(transferencias.userId, userId));
      await tx.delete(faturas).where(eq(faturas.userId, userId));
      await tx.delete(transacoes).where(eq(transacoes.userId, userId));
      await tx.delete(notas).where(eq(notas.userId, userId));
      await tx.delete(notificacoes).where(eq(notificacoes.userId, userId));
      await tx.delete(preferenciasNotificacao).where(eq(preferenciasNotificacao.userId, userId));
      await tx.delete(estabelecimentos).where(eq(estabelecimentos.userId, userId));
      await tx.delete(cartoes).where(eq(cartoes.userId, userId));
      await tx.delete(contas).where(eq(contas.userId, userId));
      await tx.delete(categorias).where(eq(categorias.userId, userId));
      await tx.delete(preferences).where(eq(preferences.userId, userId));

      // 2. Reinsere do snapshot (pais → filhas)
      if (data.categorias?.length)       await tx.insert(categorias).values(data.categorias);
      if (data.contas?.length)           await tx.insert(contas).values(data.contas);
      if (data.cartoes?.length)          await tx.insert(cartoes).values(data.cartoes);
      if (data.estabelecimentos?.length) await tx.insert(estabelecimentos).values(data.estabelecimentos);
      if (data.transacoes?.length)       await tx.insert(transacoes).values(data.transacoes);
      if (data.faturas?.length) {
        // Remove campos calculados que não existem na tabela real
        const faturasLimpas = data.faturas.map((f: any) => {
          const { mesReferencia, anoReferencia, ...resto } = f;
          return resto;
        });
        await tx.insert(faturas).values(faturasLimpas);
      }
      if (data.adiantamentos?.length)    await tx.insert(adiantamentosFatura).values(data.adiantamentos);
      if (data.transferencias?.length)   await tx.insert(transferencias).values(data.transferencias);
      if (data.extrato?.length)          await tx.insert(extratoConta).values(data.extrato);
      if (data.notas?.length)            await tx.insert(notas).values(data.notas);
      if (data.notificacoes?.length)     await tx.insert(notificacoes).values(data.notificacoes);
      if (data.preferencias?.length)     await tx.insert(preferenciasNotificacao).values(data.preferencias);
      if (data.preferences)              await tx.insert(preferences).values(data.preferences);
    });

    // Notifica o usuário sobre a restauração concluída
    await db.insert(notificacoes).values({
      userId,
      titulo:     "Backup restaurado com sucesso",
      mensagem:   `Seus dados foram restaurados a partir do backup de ${new Date(backup.createdAt).toLocaleDateString("pt-BR")}.`,
      tipo:       "backup",
      severidade: "info",
      lida:       false,
      link:       "/ajustes?tab=exportar",
      createdAt:  new Date(),
    });

    return NextResponse.json({
      message:  "Backup restaurado com sucesso",
      backupId: id,
      data:     new Date(backup.createdAt).toISOString(),
    });
  } catch (error: any) {
    console.error("Erro ao restaurar backup:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao restaurar backup" },
      { status: 500 }
    );
  }
}