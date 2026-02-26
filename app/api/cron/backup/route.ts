// src/app/api/cron/backup/route.ts

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, contas, cartoes, transacoes, categorias, faturas, extratoConta, notificacoes, preferenciasNotificacao, preferences, accounts } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { uploadBackupToDrive } from "@/lib/googleDriveBackup";
import type { ExportFile, ExportMetadata, ExportStatistics, ExportData } from "@/types/export";

interface BackupResultado {
  userId: string;
  email: string;
  status: "sucesso" | "erro" | "sem_drive";
  filename?: string;
  fileId?: string;
  tamanho?: number;
  erro?: string;
  duracao: number;
}

// ✅ Query parametrizada via Drizzle — sem risco de SQL Injection
async function getGoogleTokens(userId: string): Promise<{ accessToken: string; refreshToken: string | null } | null> {
  const rows = await db
    .select({
      access_token: accounts.access_token,
      refresh_token: accounts.refresh_token,
    })
    .from(accounts)
    .where(
      and(
        eq(accounts.userId, userId),
        eq(accounts.provider, "google")
      )
    )
    .limit(1);

  if (!rows.length || !rows[0].access_token) return null;

  return {
    accessToken: rows[0].access_token,
    refreshToken: rows[0].refresh_token || null,
  };
}

async function gerarBackupJSON(userId: string, userData: { name: string | null; email: string }): Promise<string> {
  const [
    contasData,
    cartoesData,
    transacoesData,
    categoriasData,
    faturasData,
    extratoData,
    notificacoesData,
    preferenciasNotifData,
    preferencesData,
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
  ]);

  const data: ExportData = {
    categorias: categoriasData,
    contas: contasData,
    cartoes: cartoesData,
    transacoes: transacoesData,
    faturas: faturasData.map(f => ({ ...f, mesReferencia: f.mes, anoReferencia: f.ano })),
    extrato: extratoData,
    notificacoes: notificacoesData,
    preferencias: preferenciasNotifData,
  };

  const statistics: ExportStatistics = {
    categorias: categoriasData.length,
    contas: contasData.length,
    cartoes: cartoesData.length,
    transacoes: transacoesData.length,
    faturas: faturasData.length,
    extrato: extratoData.length,
    notificacoes: notificacoesData.length,
    preferencias: preferencesData.length,
    tamanhoBytes: 0,
    tamanhoFormatado: "",
  };

  const metadata: ExportMetadata = {
    version: "1.0.0",
    exportDate: new Date().toISOString(),
    userId,
    userName: userData.name || "Usuário",
    userEmail: userData.email,
    tipo: "completo",
    formato: "json",
    encrypted: false,
    appName: "MyExpenses",
    appVersion: "1.0.0",
    appUrl: process.env.NEXT_PUBLIC_APP_URL || "https://myexpenses-app-ten.vercel.app",
  };

  const exportFile: ExportFile = { metadata, statistics, data };
  const json = JSON.stringify(exportFile, null, 2);

  const tamanho = Buffer.byteLength(json, "utf-8");
  exportFile.statistics.tamanhoBytes = tamanho;
  exportFile.statistics.tamanhoFormatado = formatBytes(tamanho);

  return JSON.stringify(exportFile, null, 2);
}

async function criarNotificacao(
  userId: string,
  status: "sucesso" | "erro" | "sem_drive",
  detalhes?: { filename?: string; tamanho?: number; erro?: string }
): Promise<void> {
  const titulo =
    status === "sucesso" ? "Backup semanal concluído"
    : status === "sem_drive" ? "Backup não realizado"
    : "Erro no backup semanal";

  const mensagem =
    status === "sucesso"
      ? `Seus dados foram salvos no Google Drive (${formatBytes(detalhes?.tamanho || 0)}). Arquivo: ${detalhes?.filename}`
      : status === "sem_drive"
      ? "Conecte sua conta Google nas configurações para ativar o backup automático semanal."
      : `Não foi possível realizar o backup: ${detalhes?.erro || "Erro desconhecido"}. Tente exportar manualmente.`;

  const severidade =
    status === "sucesso" ? "info"
    : status === "sem_drive" ? "aviso"
    : "erro";

  await db.insert(notificacoes).values({
    userId,
    titulo,
    mensagem,
    tipo: "backup",
    severidade,
    lida: false,
    createdAt: new Date(),
  });
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export async function GET(req: NextRequest) {
  const inicioTotal = Date.now();

  // ✅ Valida CRON_SECRET para evitar chamadas não autorizadas
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.warn("[Cron Backup] Tentativa não autorizada");
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  console.log("[Cron Backup] Iniciando backup semanal...");

  const todosUsuarios = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users);

  console.log(`[Cron Backup] ${todosUsuarios.length} usuário(s) encontrado(s)`);

  const resultados: BackupResultado[] = [];

  for (const usuario of todosUsuarios) {
    const inicioUsuario = Date.now();

    try {
      const tokens = await getGoogleTokens(usuario.id);

      if (!tokens) {
        console.log(`[Cron Backup] Usuário ${usuario.email} sem conta Google vinculada — pulando`);
        await criarNotificacao(usuario.id, "sem_drive");
        resultados.push({
          userId: usuario.id,
          email: usuario.email,
          status: "sem_drive",
          duracao: Date.now() - inicioUsuario,
        });
        continue;
      }

      const json = await gerarBackupJSON(usuario.id, { name: usuario.name, email: usuario.email });
      const dataHoje = new Date().toISOString().split("T")[0];
      const filename = `myexpenses-backup-${dataHoje}.json`;
      const resultado = await uploadBackupToDrive(tokens, filename, json);

      await criarNotificacao(usuario.id, "sucesso", {
        filename: resultado.filename,
        tamanho: resultado.size,
      });

      const duracao = Date.now() - inicioUsuario;
      console.log(`[Cron Backup] ✅ ${usuario.email} — ${resultado.filename} (${duracao}ms)`);

      resultados.push({
        userId: usuario.id,
        email: usuario.email,
        status: "sucesso",
        filename: resultado.filename,
        fileId: resultado.fileId,
        tamanho: resultado.size,
        duracao,
      });
    } catch (error: any) {
      const duracao = Date.now() - inicioUsuario;
      console.error(`[Cron Backup] ❌ Erro no usuário ${usuario.email}:`, error.message);
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
  const sucessos = resultados.filter(r => r.status === "sucesso").length;
  const erros = resultados.filter(r => r.status === "erro").length;
  const semDrive = resultados.filter(r => r.status === "sem_drive").length;

  console.log(`[Cron Backup] Concluído em ${duracaoTotal}ms — ✅ ${sucessos} | ❌ ${erros} | ⚠️ ${semDrive}`);

  return NextResponse.json({
    message: "Backup semanal concluído",
    duracao: `${duracaoTotal}ms`,
    resumo: { total: todosUsuarios.length, sucessos, erros, semDrive },
    resultados,
  });
}