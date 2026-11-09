// src/app/api/cron/backup/route.ts

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, notificacoes, preferences, backupsUsuario } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { formatarBytes, gerarArquivoBackup, type ArquivoBackup } from "@/lib/backupDados";
import type { BackupFrequencia } from "@/types/preferences";

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Decide se o usuário deve receber backup hoje baseado na frequência configurada.
 * Horário de referência: hora UTC em que o cron roda (3h UTC).
 */
function deveGerarBackupHoje(
  frequencia: BackupFrequencia,
  diaSemana: number | null,
  diaMes: number | null,
  ultimoBackupEm: Date | null,
): boolean {
  const agora = new Date();
  const diaHoje = agora.getUTCDay(); // 0=dom … 6=sáb
  const dataHoje = agora.getUTCDate(); // 1-31

  switch (frequencia) {
    case "desativado":
      return false;

    case "diario": {
      // Gera backup apenas se houve alteração nas últimas 24h
      // (indicado por ultimoBackupEm sendo anterior a hoje)
      // Se nunca fez backup, gera sempre
      if (!ultimoBackupEm) return true;
      const msDesdeUltimo = agora.getTime() - ultimoBackupEm.getTime();
      const horasDesdeUltimo = msDesdeUltimo / (1000 * 60 * 60);
      // Só gera se passou pelo menos 20h desde o último (janela de segurança)
      return horasDesdeUltimo >= 20;
    }

    case "semanal":
      // Gera se hoje é o dia da semana configurado (default: domingo = 0)
      return diaHoje === (diaSemana ?? 0);

    case "mensal": {
      // Gera se hoje é o dia do mês configurado (default: dia 1)
      const diaAlvo = diaMes ?? 1;
      // Trata meses com menos dias: se dia alvo > dias do mês, usa último dia
      const ultimoDiaMes = new Date(
        agora.getUTCFullYear(),
        agora.getUTCMonth() + 1,
        0,
      ).getUTCDate();
      const diaEfetivo = Math.min(diaAlvo, ultimoDiaMes);
      return dataHoje === diaEfetivo;
    }

    default:
      return false;
  }
}

// ── Persistência ──────────────────────────────────────────────────────────────

async function salvarBackup(
  userId: string,
  arquivo: ArquivoBackup,
): Promise<string> {
  const [registro] = await db
    .insert(backupsUsuario)
    .values({
      userId,
      dados: arquivo,
      tamanhoBytes: arquivo.statistics.tamanhoBytes,
      estatisticas: arquivo.statistics,
    })
    .returning({ id: backupsUsuario.id });

  return registro.id;
}

async function limparBackupsAntigos(
  userId: string,
  quantidadeMaxima: number,
): Promise<void> {
  const todos = await db
    .select({ id: backupsUsuario.id })
    .from(backupsUsuario)
    .where(eq(backupsUsuario.userId, userId))
    .orderBy(asc(backupsUsuario.createdAt));

  if (todos.length <= quantidadeMaxima) return;

  const idsParaRemover = todos
    .slice(0, todos.length - quantidadeMaxima)
    .map((b) => b.id);

  for (const id of idsParaRemover) {
    await db.delete(backupsUsuario).where(eq(backupsUsuario.id, id));
  }
}

async function atualizarUltimoBackup(userId: string): Promise<void> {
  await db
    .update(preferences)
    .set({ ultimoBackupEm: new Date(), updatedAt: new Date() })
    .where(eq(preferences.userId, userId));
}

async function criarNotificacao(
  userId: string,
  status: "sucesso" | "erro",
  detalhes?: { tamanho?: number; erro?: string },
): Promise<void> {
  const titulo =
    status === "sucesso"
      ? "Backup automático concluído"
      : "Erro no backup automático";
  const mensagem =
    status === "sucesso"
      ? `Seus dados foram salvos automaticamente (${formatarBytes(detalhes?.tamanho || 0)}). Acesse Configurações > Backups para ver o histórico.`
      : `Não foi possível realizar o backup: ${detalhes?.erro || "Erro desconhecido"}.`;

  await db.insert(notificacoes).values({
    userId,
    titulo,
    mensagem,
    tipo: "backup",
    severidade: status === "sucesso" ? "info" : "error",
    lida: false,
    link: "/ajustes?tab=exportar",
    createdAt: new Date(),
  });
}

// ── Handler principal ─────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const inicioTotal = Date.now();

  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  console.log("[Cron Backup] Iniciando verificação diária de backups...");

  const todosUsuarios = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users);

  const resultados: Array<{
    userId: string;
    email: string;
    status: "sucesso" | "erro" | "pulado";
    motivo?: string;
    backupId?: string;
    tamanho?: number;
    erro?: string;
    duracao: number;
  }> = [];

  for (const usuario of todosUsuarios) {
    const inicioUsuario = Date.now();

    // Busca preferências do usuário
    const [prefs] = await db
      .select({
        backupAutomatico: preferences.backupAutomatico,
        backupFrequencia: preferences.backupFrequencia,
        backupDiaSemana: preferences.backupDiaSemana,
        backupDiaMes: preferences.backupDiaMes,
        backupQuantidadeMaxima: preferences.backupQuantidadeMaxima,
        ultimoBackupEm: preferences.ultimoBackupEm,
      })
      .from(preferences)
      .where(eq(preferences.userId, usuario.id))
      .limit(1);

    // Sem preferências cadastradas → usa defaults (semanal, domingo)
    const frequencia = (prefs?.backupFrequencia ??
      "semanal") as BackupFrequencia;
    const backupAtivo = prefs?.backupAutomatico ?? true;
    const diaSemana = prefs?.backupDiaSemana ?? 0;
    const diaMes = prefs?.backupDiaMes ?? 1;
    const ultimoBackup = prefs?.ultimoBackupEm ?? null;
    const quantidadeMaxima = prefs?.backupQuantidadeMaxima ?? 8;

    // Verifica se backup automático está ativo
    if (!backupAtivo || frequencia === "desativado") {
      console.log(`[Cron Backup] ⏭️ ${usuario.email} — backup desativado`);
      resultados.push({
        userId: usuario.id,
        email: usuario.email,
        status: "pulado",
        motivo: "desativado",
        duracao: Date.now() - inicioUsuario,
      });
      continue;
    }

    // Verifica se deve gerar backup hoje baseado na frequência
    if (!deveGerarBackupHoje(frequencia, diaSemana, diaMes, ultimoBackup)) {
      console.log(
        `[Cron Backup] ⏭️ ${usuario.email} — não é o dia de backup (${frequencia})`,
      );
      resultados.push({
        userId: usuario.id,
        email: usuario.email,
        status: "pulado",
        motivo: `fora do agendamento (${frequencia})`,
        duracao: Date.now() - inicioUsuario,
      });
      continue;
    }

    try {
      const arquivo = await gerarArquivoBackup(usuario.id, {
        name: usuario.name,
        email: usuario.email,
      });
      const { statistics } = arquivo;

      const backupId = await salvarBackup(usuario.id, arquivo);
      await limparBackupsAntigos(usuario.id, quantidadeMaxima);
      await atualizarUltimoBackup(usuario.id);
      await criarNotificacao(usuario.id, "sucesso", {
        tamanho: statistics.tamanhoBytes,
      });

      const duracao = Date.now() - inicioUsuario;
      console.log(
        `[Cron Backup] ✅ ${usuario.email} — ${frequencia} — ${formatarBytes(statistics.tamanhoBytes)} (${duracao}ms)`,
      );

      resultados.push({
        userId: usuario.id,
        email: usuario.email,
        status: "sucesso",
        backupId,
        tamanho: statistics.tamanhoBytes,
        duracao,
      });
    } catch (error: any) {
      const duracao = Date.now() - inicioUsuario;
      console.error(`[Cron Backup] ❌ ${usuario.email}:`, error.message);
      await criarNotificacao(usuario.id, "erro", { erro: error.message });
      resultados.push({
        userId: usuario.id,
        email: usuario.email,
        status: "erro",
        erro: error.message,
        duracao,
      });
    }
  }

  const duracaoTotal = Date.now() - inicioTotal;
  const sucessos = resultados.filter((r) => r.status === "sucesso").length;
  const erros = resultados.filter((r) => r.status === "erro").length;
  const pulados = resultados.filter((r) => r.status === "pulado").length;

  console.log(
    `[Cron Backup] Concluído em ${duracaoTotal}ms — ✅ ${sucessos} | ❌ ${erros} | ⏭️ ${pulados} pulados`,
  );

  return NextResponse.json({
    message: "Verificação de backup concluída",
    duracao: `${duracaoTotal}ms`,
    resumo: { total: todosUsuarios.length, sucessos, erros, pulados },
    resultados,
  });
}