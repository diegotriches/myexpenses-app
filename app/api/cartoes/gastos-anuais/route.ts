import { NextResponse } from "next/server";
import { db } from "@/db";
import { cartoes, faturas } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import { respostaDeErro } from "@/lib/rota";

/**
 * GET /api/cartoes/gastos-anuais?ano=2026
 *
 * Retorna apenas cartões de crédito ativos (e inativos com faturas no ano).
 *
 * Resposta:
 * {
 *   ano: number,
 *   totalGasto:    number,   // soma de todas as faturas do ano
 *   totalPago:     number,   // faturas com paga = true
 *   totalPendente: number,   // faturas com paga = false
 *   porMes: Array<{
 *     mes: number, label: string,
 *     total: number, pago: number, pendente: number
 *   }>,
 *   porCartao: Array<{
 *     id: number, nome: string, empresa: string | null,
 *     totalGasto: number, totalPago: number, totalPendente: number
 *   }>
 * }
 */
export async function GET(req: Request) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const ano = Number(searchParams.get("ano") ?? new Date().getFullYear());

    if (isNaN(ano) || ano < 2000 || ano > 2100) {
      return NextResponse.json({ error: "Ano inválido" }, { status: 400 });
    }

    // 1. Buscar todos os cartões de crédito do usuário
    const cartoesCredito = await db
      .select({
        id: cartoes.id,
        nome: cartoes.nome,
        empresa: cartoes.empresa,
        ativo: cartoes.ativo,
      })
      .from(cartoes)
      .where(
        and(
          eq(cartoes.userId, userId),
          eq(cartoes.tipo, "credito")
        )
      );

    if (cartoesCredito.length === 0) {
      return NextResponse.json({
        ano,
        totalGasto: 0,
        totalPago: 0,
        totalPendente: 0,
        porMes: [],
        porCartao: [],
      });
    }

    // 2. Buscar todas as faturas do ano para esses cartões
    const ids = cartoesCredito.map((c) => c.id);

    // Drizzle não tem inArray com lista dinâmica de forma simples sem sql``,
    // então buscamos todas as faturas do usuário no ano e filtramos em memória
    const todasFaturas = await db
      .select()
      .from(faturas)
      .where(
        and(
          eq(faturas.userId, userId),
          eq(faturas.ano, ano)
        )
      );

    const faturasFiltradas = todasFaturas.filter((f) => ids.includes(f.cartaoId));

    // 3. Agregações globais
    let totalGasto    = 0;
    let totalPago     = 0;
    let totalPendente = 0;

    for (const f of faturasFiltradas) {
      const valor = Number(f.total);
      totalGasto += valor;
      if (f.paga) totalPago += valor;
      else        totalPendente += valor;
    }

    // 4. Breakdown por mês (1–12)
    const MESES_LABEL = [
      "Jan","Fev","Mar","Abr","Mai","Jun",
      "Jul","Ago","Set","Out","Nov","Dez",
    ];

    const porMesMap = new Map<number, { total: number; pago: number; pendente: number }>();
    for (let m = 1; m <= 12; m++) {
      porMesMap.set(m, { total: 0, pago: 0, pendente: 0 });
    }

    for (const f of faturasFiltradas) {
      const entry = porMesMap.get(f.mes)!;
      const valor = Number(f.total);
      entry.total    += valor;
      if (f.paga) entry.pago     += valor;
      else        entry.pendente += valor;
    }

    const porMes = Array.from(porMesMap.entries()).map(([mes, dados]) => ({
      mes,
      label: MESES_LABEL[mes - 1],
      ...dados,
    }));

    // 5. Breakdown por cartão
    const porCartaoMap = new Map<
      number,
      { nome: string; empresa: string | null; totalGasto: number; totalPago: number; totalPendente: number }
    >();

    for (const c of cartoesCredito) {
      porCartaoMap.set(c.id, {
        nome: c.nome,
        empresa: c.empresa ?? null,
        totalGasto: 0,
        totalPago: 0,
        totalPendente: 0,
      });
    }

    for (const f of faturasFiltradas) {
      const entry = porCartaoMap.get(f.cartaoId);
      if (!entry) continue;
      const valor = Number(f.total);
      entry.totalGasto += valor;
      if (f.paga) entry.totalPago     += valor;
      else        entry.totalPendente += valor;
    }

    const porCartao = Array.from(porCartaoMap.entries())
      .map(([id, dados]) => ({ id, ...dados }))
      .filter((c) => c.totalGasto > 0)
      .sort((a, b) => b.totalGasto - a.totalGasto);

    return NextResponse.json({
      ano,
      totalGasto,
      totalPago,
      totalPendente,
      porMes,
      porCartao,
    });
  } catch (error) {
    return respostaDeErro(error);
  }
}