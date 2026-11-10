import { NextRequest, NextResponse } from "next/server";
import { migrarCreditosDeFaturas } from "@/lib/creditoFatura";

export const maxDuration = 60;

/**
 * GET /api/cron/faturas
 *
 * Roda diariamente. Fatura de cartão que fechou com crédito (estornos maiores
 * que as compras do ciclo) passa o crédito para a próxima fatura não paga e é
 * encerrada zerada (ver lib/creditoFatura.ts).
 */
export async function GET(req: NextRequest) {
  const inicio = Date.now();

  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const resultado = await migrarCreditosDeFaturas();
  for (const e of resultado.erros) {
    console.error(`[Cron Faturas] Erro na fatura ${e.faturaId}:`, e.motivo);
  }

  return NextResponse.json({
    message: "Verificação de créditos de fatura concluída",
    duracao: `${Date.now() - inicio}ms`,
    ...resultado,
  });
}
