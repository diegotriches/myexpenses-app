import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";

export async function GET() {
  try {
    // Testa conexão básica
    const result = await db.execute(sql`SELECT NOW() as current_time, version() as db_version`);
    
    // Testa se consegue contar registros de uma tabela
    const contasCount = await db.execute(sql`SELECT COUNT(*) as total FROM contas`);
    const cartoesCount = await db.execute(sql`SELECT COUNT(*) as total FROM cartoes`);
    const transacoesCount = await db.execute(sql`SELECT COUNT(*) as total FROM transacoes`);

    return NextResponse.json({
      status: "✅ Conectado ao banco de dados!",
      connection: {
        timestamp: result.rows[0]?.current_time,
        version: result.rows[0]?.db_version,
        database_url: process.env.DATABASE_URL?.includes('neon.tech') ? '✅ Neon' : '⚠️ Outro provedor',
      },
      data: {
        contas: contasCount.rows[0]?.total || 0,
        cartoes: cartoesCount.rows[0]?.total || 0,
        transacoes: transacoesCount.rows[0]?.total || 0,
      },
      environment: process.env.NODE_ENV,
    }, { status: 200 });

  } catch (error) {
    console.error("Erro ao conectar no banco:", error);
    
    return NextResponse.json({
      status: "❌ Erro na conexão",
      error: error instanceof Error ? error.message : "Erro desconhecido",
      database_url_exists: !!process.env.DATABASE_URL,
      database_url_format: process.env.DATABASE_URL?.substring(0, 20) + "...",
    }, { status: 500 });
  }
}