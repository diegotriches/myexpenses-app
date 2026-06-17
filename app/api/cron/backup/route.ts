// src/app/api/cron/backup/route.ts

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  users, contas, cartoes, transacoes, categorias, faturas, extratoConta,
  notificacoes, preferenciasNotificacao, preferences, estabelecimentos,
  transferencias, notas, adiantamentosFatura, backupsUsuario,
} from "@/db/schema";
import { eq, and, lt, asc } from "drizzle-orm";
import type { ExportMetadata, ExportStatistics, ExportData } from "@/types/export";

// Quantidade de backups a manter por usuário (≈ 8 semanas de histórico)
const BACKUPS_PARA_MANTER = 8;

interface BackupResultado {
  userId:   string;
  email:    string;
  status:   "sucesso" | "erro";
  backupId?: string;
  tamanho?: number;
  erro?:    string;
  duracao:  number;
}

// ── Geração do snapshot ─────────────────────────────────────────────────────
async function gerarSnapshot(
  userId: string,
  userData: { name: string | null; email: string }
): Promise<{ json: string; data: ExportData; statistics: ExportStatistics }> {
  const [
    contasData, cartoesData, transacoesData, categoriasData, faturasData,
    extratoData, notificacoesData, preferenciasNotifData, preferencesData,
    estabelecimentosData, transferenciasData, notasData, adiantamentosData,
  ] = await Promise.all([
    db.select().from(contas).where(eq(contas.userId, userId)),
    db.select().from(cartoes).where(eq(cartoes.userId, userId)),
    db.select().from(transacoes).where(eq(transacoes.userId, userId)),
    db.select().from(categorias).where(eq(categorias.userId, userId)),
    db.select().from(faturas).where(eq(faturas.userId, userId)),
    db.select().from(extratoConta).where(eq(extratoConta.userId, userId)),
    db.select().from(notificacoes).where(eq(notificacoes.userId, userId)),
    db.select().from(preferenciasNotificacao).where(eq(preferenciasNotificacao.userId, userId)),
    db.select().from(preferences).where(eq(preferences.userId, userId)),
    db.select().from(estabelecimentos).where(eq(estabelecimentos.userId, userId)),
    db.select().from(transferencias).where(eq(transferencias.userId, userId)),
    db.select().from(notas).where(eq(notas.userId, userId)),
    db.select().from(adiantamentosFatura).where(eq(adiantamentosFatura.userId, userId)),
  ]);

  const data: ExportData & Record<string, any> = {
    categorias:   categoriasData,
    contas:       contasData,
    cartoes:      cartoesData,
    transacoes:   transacoesData,
    faturas:      faturasData.map((f) => ({ ...f, mesReferencia: f.mes, anoReferencia: f.ano })),
    extrato:      extratoData,
    notificacoes: notificacoesData,
    preferencias: preferenciasNotifData,
    estabelecimentos: estabelecimentosData,
    transferencias:   transferenciasData,
    notas:            notasData,
    adiantamentos:    adiantamentosData,
  };

  if (preferencesData.length > 0) data.preferences = preferencesData[0];

  const statistics: ExportStatistics & Record<string, any> = {
    categorias:       categoriasData.length,
    contas:           contasData.length,
    cartoes:          cartoesData.length,
    transacoes:       transacoesData.length,
    faturas:          faturasData.length,
    extrato:          extratoData.length,
    notificacoes:     notificacoesData.length,
    preferencias:     preferencesData.length,
    estabelecimentos: estabelecimentosData.length,
    transferencias:   transferenciasData.length,
    notas:            notasData.length,
    adiantamentos:    adiantamentosData.length,
    tamanhoBytes:     0,
    tamanhoFormatado: "",
  };

  const metadata: ExportMetadata = {
    version:    "2.0.0",
    exportDate: new Date().toISOString(),
    userId,
    userName:   userData.name || "Usuário",
    userEmail:  userData.email,
    tipo:       "completo",
    formato:    "json",
    encrypted:  false,
    appName:    "MyExpenses",
    appVersion: "1.0.0",
    appUrl:     process.env.NEXT_PUBLIC_APP_URL || "https://myexpenses-app-ten.vercel.app",
  };

  const exportFile = {
    metadata,
    statistics,
    data,
    // Campo extra fora do tipo ExportMetadata — identifica a origem do backup
    origem: "cron-automatico" as const,
  };
  const json    = JSON.stringify(exportFile);
  const tamanho = Buffer.byteLength(json, "utf-8");

  statistics.tamanhoBytes     = tamanho;
  statistics.tamanhoFormatado = formatBytes(tamanho);

  return { json: JSON.stringify({ metadata, statistics, data, origem: "cron-automatico" }), data, statistics };
}

// ── Persistência no banco ────────────────────────────────────────────────────
async function salvarBackupNoBanco(
  userId: string,
  data: ExportData,
  statistics: ExportStatistics,
  tamanhoBytes: number
): Promise<string> {
  const [registro] = await db
    .insert(backupsUsuario)
    .values({
      userId,
      dados:        data,
      tamanhoBytes,
      estatisticas: statistics,
    })
    .returning({ id: backupsUsuario.id });

  return registro.id;
}

// ── Limpeza de backups antigos ───────────────────────────────────────────────
async function limparBackupsAntigos(userId: string): Promise<void> {
  const todos = await db
    .select({ id: backupsUsuario.id })
    .from(backupsUsuario)
    .where(eq(backupsUsuario.userId, userId))
    .orderBy(asc(backupsUsuario.createdAt));

  if (todos.length <= BACKUPS_PARA_MANTER) return;

  const idsParaRemover = todos.slice(0, todos.length - BACKUPS_PARA_MANTER).map((b) => b.id);

  for (const id of idsParaRemover) {
    await db.delete(backupsUsuario).where(eq(backupsUsuario.id, id));
  }
  console.log(`[Cron Backup] ${idsParaRemover.length} backup(s) antigo(s) removido(s) — userId=${userId}`);
}

// ── Notificação ───────────────────────────────────────────────────────────────
async function criarNotificacao(
  userId: string,
  status: "sucesso" | "erro",
  detalhes?: { tamanho?: number; erro?: string }
): Promise<void> {
  const titulo = status === "sucesso" ? "Backup semanal concluído" : "Erro no backup semanal";

  const mensagem =
    status === "sucesso"
      ? `Seus dados foram salvos automaticamente (${formatBytes(detalhes?.tamanho || 0)}). Acesse Configurações > Backups para ver o histórico.`
      : `Não foi possível realizar o backup: ${detalhes?.erro || "Erro desconhecido"}. Tente exportar manualmente em Configurações.`;

  await db.insert(notificacoes).values({
    userId,
    titulo,
    mensagem,
    tipo:       "backup",
    severidade: status === "sucesso" ? "info" : "erro",
    lida:       false,
    createdAt:  new Date(),
  });
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k     = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i     = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// ── Handler principal ─────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const inicioTotal = Date.now();

  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.warn("[Cron Backup] Tentativa não autorizada");
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  console.log("[Cron Backup] Iniciando backup semanal (Postgres)...");

  const todosUsuarios = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users);

  console.log(`[Cron Backup] ${todosUsuarios.length} usuário(s) encontrado(s)`);

  const resultados: BackupResultado[] = [];

  for (const usuario of todosUsuarios) {
    const inicioUsuario = Date.now();

    try {
      const { data, statistics } = await gerarSnapshot(usuario.id, {
        name:  usuario.name,
        email: usuario.email,
      });

      const backupId = await salvarBackupNoBanco(
        usuario.id,
        data,
        statistics,
        statistics.tamanhoBytes
      );

      await limparBackupsAntigos(usuario.id);

      await criarNotificacao(usuario.id, "sucesso", { tamanho: statistics.tamanhoBytes });

      const duracao = Date.now() - inicioUsuario;
      console.log(`[Cron Backup] ✅ ${usuario.email} — backup ${backupId} (${formatBytes(statistics.tamanhoBytes)}, ${duracao}ms)`);

      resultados.push({
        userId:   usuario.id,
        email:    usuario.email,
        status:   "sucesso",
        backupId,
        tamanho:  statistics.tamanhoBytes,
        duracao,
      });
    } catch (error: any) {
      const duracao = Date.now() - inicioUsuario;
      console.error(`[Cron Backup] ❌ Erro no usuário ${usuario.email}:`, error.message);
      await criarNotificacao(usuario.id, "erro", { erro: error.message });
      resultados.push({
        userId:  usuario.id,
        email:   usuario.email,
        status:  "erro",
        erro:    error.message,
        duracao,
      });
    }
  }

  const duracaoTotal = Date.now() - inicioTotal;
  const sucessos      = resultados.filter((r) => r.status === "sucesso").length;
  const erros         = resultados.filter((r) => r.status === "erro").length;

  console.log(`[Cron Backup] Concluído em ${duracaoTotal}ms — ✅ ${sucessos} | ❌ ${erros}`);

  return NextResponse.json({
    message: "Backup semanal concluído",
    duracao: `${duracaoTotal}ms`,
    resumo:  { total: todosUsuarios.length, sucessos, erros },
    resultados,
  });
}