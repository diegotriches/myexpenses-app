// src/app/api/export/meus-dados/route.ts

import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  users, contas, cartoes, transacoes, categorias, faturas, extratoConta,
  notificacoes, preferenciasNotificacao, preferences, estabelecimentos,
  transferencias, notas, adiantamentosFatura,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { getUserId } from "@/lib/auth";

/**
 * GET /api/export/meus-dados
 * Exporta TODOS os dados do usuário em formato JSON para download.
 *
 * ✅ REESCRITO: agora usa exatamente o mesmo conjunto de tabelas do
 * snapshot gerado pelo backup automático (cron job), incluindo
 * estabelecimentos, transferencias, notas e adiantamentosFatura, que
 * não estavam no export original. Isso garante que o arquivo exportado
 * manualmente aqui é 100% compatível com a rota de importação, que
 * espera essa mesma estrutura.
 *
 * Não há mais opções de "seletivo" ou "por período" — simplificado
 * para uma única exportação completa, que é o caso de uso real
 * (backup manual / migração de dados).
 */
export async function GET() {
  const inicio = Date.now();

  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const [userData] = await db
      .select({
        id:    users.id,
        name:  users.name,
        email: users.email,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!userData) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

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

    const data = {
      categorias:       categoriasData,
      contas:           contasData,
      cartoes:          cartoesData,
      transacoes:       transacoesData,
      // mesReferencia/anoReferencia são removidos na importação antes do
      // insert (não existem na tabela real) — mantidos aqui só como
      // informação de leitura para quem abrir o JSON manualmente.
      faturas:          faturasData.map((f) => ({ ...f, mesReferencia: f.mes, anoReferencia: f.ano })),
      extrato:          extratoData,
      notificacoes:     notificacoesData,
      preferencias:     preferenciasNotifData,
      preferences:      preferencesData[0] ?? null,
      estabelecimentos: estabelecimentosData,
      transferencias:   transferenciasData,
      notas:            notasData,
      adiantamentos:    adiantamentosData,
    };

    const statistics = {
      categorias:       categoriasData.length,
      contas:           contasData.length,
      cartoes:          cartoesData.length,
      transacoes:       transacoesData.length,
      faturas:          faturasData.length,
      extrato:          extratoData.length,
      notificacoes:     notificacoesData.length,
      preferencias:     preferenciasNotifData.length,
      estabelecimentos: estabelecimentosData.length,
      transferencias:   transferenciasData.length,
      notas:            notasData.length,
      adiantamentos:    adiantamentosData.length,
      tamanhoBytes:     0,
      tamanhoFormatado: "",
    };

    const metadata = {
      version:    "2.0.0",
      exportDate: new Date().toISOString(),
      userId:     userData.id,
      userName:   userData.name || "Usuário",
      userEmail:  userData.email,
      appName:    "MyExpenses",
    };

    const exportFile = { metadata, statistics, data };
    const json   = JSON.stringify(exportFile, null, 2);
    const buffer = Buffer.from(json, "utf-8");

    exportFile.statistics.tamanhoBytes     = buffer.length;
    exportFile.statistics.tamanhoFormatado = formatBytes(buffer.length);

    // Reserializa com o tamanho já preenchido
    const jsonFinal   = JSON.stringify(exportFile, null, 2);
    const bufferFinal = Buffer.from(jsonFinal, "utf-8");

    const timestamp = new Date().toISOString().split("T")[0];
    const filename  = `myexpenses-export-${timestamp}.json`;

    const duracao = Date.now() - inicio;
    console.log(`[Export] Exportação concluída em ${duracao}ms — ${filename} (${exportFile.statistics.tamanhoFormatado})`);

    return new NextResponse(bufferFinal, {
      status: 200,
      headers: {
        "Content-Type":        "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length":      bufferFinal.length.toString(),
      },
    });
  } catch (error: any) {
    console.error("[Export] Erro ao exportar dados:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao exportar dados" },
      { status: 500 }
    );
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k     = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i     = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}