// src/app/api/export/meus-dados/route.ts

import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import { gerarArquivoBackup } from "@/lib/backupDados";
import { respostaDeErro } from "@/lib/rota";

/**
 * GET /api/export/meus-dados
 * Exporta todos os dados do usuário no mesmo formato do backup automático,
 * aceito pela importação.
 */
export async function GET() {
  const inicio = Date.now();

  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const [usuario] = await db
      .select({ name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!usuario) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    const arquivo = await gerarArquivoBackup(userId, usuario);
    const buffer  = Buffer.from(JSON.stringify(arquivo), "utf-8");

    const timestamp = new Date().toISOString().split("T")[0];
    const filename  = `myexpenses-export-${timestamp}.json`;

    console.log(`[Export] Exportação concluída em ${Date.now() - inicio}ms — ${filename} (${arquivo.statistics.tamanhoFormatado})`);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":        "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length":      buffer.length.toString(),
      },
    });
  } catch (error) {
    return respostaDeErro(error, "Erro ao exportar dados");
  }
}
