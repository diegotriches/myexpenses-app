// src/app/api/contas/patrimonio/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { contas, extratoConta } from "@/db/schema";
import { eq, and, lte, sql } from "drizzle-orm";
import { getUserId } from "@/lib/auth";

/**
 * GET /api/contas/patrimonio?meses=6
 *
 * Retorna:
 * - saldoTotal: saldo atual somado de todas as contas
 * - historico: array de { mes, total, contas: [{ id, nome, saldo }] }
 *   Um ponto por mês, calculado como o saldoApos da última movimentação
 *   do mês para cada conta (ou o saldo mais recente anterior ao mês, se
 *   não houver movimentação naquele mês).
 */
export async function GET(req: Request) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const meses = Math.min(Math.max(Number(searchParams.get("meses") ?? 6), 1), 24);

    // 1. Buscar todas as contas ativas do usuário
    const todasContas = await db
      .select({
        id: contas.id,
        nome: contas.nome,
        banco: contas.banco,
        saldoAtual: contas.saldoAtual,
      })
      .from(contas)
      .where(and(eq(contas.userId, userId), eq(contas.ativo, true)));

    // 2. Saldo total atual
    const saldoTotal = todasContas.reduce(
      (acc, c) => acc + Number(c.saldoAtual),
      0
    );

    // 3. Construir array dos últimos N meses (inclusive o mês atual)
    const agora = new Date();
    const mesesArray: { ano: number; mes: number; label: string; ultimoDia: string }[] = [];

    for (let i = meses - 1; i >= 0; i--) {
      const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
      const ano = d.getFullYear();
      const mes = d.getMonth() + 1; // 1-12
      // Último dia do mês
      const ultimoDia = new Date(ano, mes, 0).toISOString().split("T")[0];
      const label = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
      mesesArray.push({ ano, mes, label, ultimoDia });
    }

    // 4. Para cada mês e conta, buscar o saldoApos da última movimentação
    //    até o último dia daquele mês.
    //
    //    Estratégia: uma única query por mês usando DISTINCT ON (conta_id)
    //    ordenando por data DESC para pegar a mais recente até aquela data.

    const historico = await Promise.all(
      mesesArray.map(async ({ label, ultimoDia }) => {
        // DISTINCT ON: para cada contaId, retorna apenas a linha mais recente
        // com data <= ultimoDia
        const rows = await db.execute(sql`
          SELECT DISTINCT ON (ec.conta_id)
            ec.conta_id   AS id,
            ec.saldo_apos AS saldo
          FROM extrato_conta ec
          WHERE ec.user_id = ${userId}
            AND ec.data <= ${ultimoDia}::date
          ORDER BY ec.conta_id, ec.data DESC, ec.created_at DESC
        `);

        // Mapa contaId → saldo naquele mês
        const saldoPorConta = new Map<string, number>();
        for (const row of rows.rows as { id: string; saldo: string }[]) {
          saldoPorConta.set(row.id, Number(row.saldo));
        }

        // Montar breakdown por conta (apenas contas com algum registro até aquele mês)
        const breakdown = todasContas
          .map((c) => ({
            id: c.id,
            nome: c.nome,
            banco: c.banco,
            saldo: saldoPorConta.get(c.id) ?? 0,
          }))
          .filter((c) => c.saldo !== 0);

        const total = breakdown.reduce((acc, c) => acc + c.saldo, 0);

        return { mes: label, total, contas: breakdown };
      })
    );

    return NextResponse.json({ saldoTotal, historico });
  } catch (error) {
    console.error("Erro ao buscar patrimônio:", error);
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}