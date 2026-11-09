import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { extratoConta, contas } from "@/db/schema";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import { respostaDeErro } from "@/lib/rota";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const userId = await getUserId();

    if (!userId) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const contaId = id;

    if (!contaId) {
      return NextResponse.json({ error: "Conta inválida" }, { status: 400 });
    }

    const [conta] = await db
      .select()
      .from(contas)
      .where(and(eq(contas.id, contaId), eq(contas.userId, userId)))
      .limit(1);

    if (!conta) {
      return NextResponse.json(
        { error: "Conta não encontrada ou acesso negado" },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(req.url);

    const inicio  = searchParams.get("inicio")  || null;
    const fim     = searchParams.get("fim")      || null;
    const origem  = searchParams.get("origem")   || null;
    const tipo    = searchParams.get("tipo")     || null;
    const limit   = Math.min(Number(searchParams.get("limit")  ?? 50), 100);
    const offset  = Number(searchParams.get("offset") ?? 0);

    // ── Filtros para a query principal (movimentações exibidas) ──────────────
    const filtros = [
      eq(extratoConta.contaId, contaId),
      eq(extratoConta.userId, userId),
    ];

    if (inicio) filtros.push(gte(extratoConta.data, inicio));
    if (fim)    filtros.push(lte(extratoConta.data, fim));

    if (origem && origem !== "TODAS") {
      filtros.push(eq(extratoConta.origem, origem as any));
    }

    if (tipo && tipo !== "TODOS") {
      filtros.push(eq(extratoConta.tipo, tipo as any));
    }

    // ── Query principal ──────────────────────────────────────────────────────
    const registros = await db
      .select()
      .from(extratoConta)
      .where(and(...filtros))
      .orderBy(desc(extratoConta.data), desc(extratoConta.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(extratoConta)
      .where(and(...filtros));

    // ── Resumo — SEMPRE calculado ────────────────────────────────────────────
    // Filtros de data para o resumo (sem tipo/origem para refletir saldo real)
    const filtrosResumo = [
      eq(extratoConta.contaId, contaId),
      eq(extratoConta.userId, userId),
      ...(inicio ? [gte(extratoConta.data, inicio)] : []),
      ...(fim    ? [lte(extratoConta.data, fim)]    : []),
    ];

    const movimentacoesPeriodo = await db
      .select({ tipo: extratoConta.tipo, valor: extratoConta.valor })
      .from(extratoConta)
      .where(and(...filtrosResumo));

    const totalEntradas = movimentacoesPeriodo
      .filter((m) => m.tipo === "entrada")
      .reduce((sum, m) => sum + Number(m.valor), 0);

    const totalSaidas = movimentacoesPeriodo
      .filter((m) => m.tipo === "saida")
      .reduce((sum, m) => sum + Number(m.valor), 0);

    // ── Saldo Inicial ────────────────────────────────────────────────────────
    // Saldo imediatamente ANTES do período:
    // → Com filtro de início: saldoApos da última mov ESTRITAMENTE antes de `inicio`
    // → Sem filtro de início: 0, porque o extrato já contém o lançamento de
    //   abertura da conta (origem AJUSTE, "Saldo inicial da conta") como primeira
    //   movimentação. Usar conta.saldoInicial aqui causaria dupla contagem,
    //   pois esse valor já está incluído em totalEntradas via o registro AJUSTE.
    let saldoInicial: number;

    if (inicio) {
      const filtroAnterior = [
        eq(extratoConta.contaId, contaId),
        eq(extratoConta.userId, userId),
        sql`${extratoConta.data} < ${inicio}`,
      ];

      const [movAnterior] = await db
        .select({ saldoApos: extratoConta.saldoApos })
        .from(extratoConta)
        .where(and(...filtroAnterior))
        .orderBy(desc(extratoConta.data), desc(extratoConta.createdAt))
        .limit(1);

      saldoInicial = movAnterior
        ? Number(movAnterior.saldoApos)
        : Number(conta.saldoInicial ?? 0);
    } else {
      // Sem filtro de data: saldoInicial = 0 para evitar dupla contagem com o
      // lançamento AJUSTE de abertura que já está em totalEntradas.
      saldoInicial = 0;
    }

    // ── Saldo Final ──────────────────────────────────────────────────────────
    // CORREÇÃO: calculado aritmeticamente a partir do saldoInicial do período.
    // Não depende de ordenação de registros nem de casos-borda de "sem filtro".
    //
    // Fórmula: saldoFinal = saldoInicial + totalEntradas - totalSaidas
    //
    // Isso é sempre correto porque totalEntradas e totalSaidas já filtram
    // APENAS as movimentações do período (filtrosResumo), sem tipo/origem,
    // refletindo o impacto real no saldo da conta no intervalo.
    const saldoFinal = saldoInicial + totalEntradas - totalSaidas;

    const resumo = {
      contaId: conta.id,
      contaNome: conta.nome,
      saldoInicial,
      saldoFinal,
      totalEntradas,
      totalSaidas,
      variacao: saldoFinal - saldoInicial,
      periodo: { inicio, fim },
    };

    return NextResponse.json({
      contaId,
      contaNome: conta.nome,
      conta: { id: conta.id, nome: conta.nome },
      limit,
      offset,
      total: Number(count),
      pageSize: registros.length,
      resumo,
      extrato: registros.map((r) => ({
        id: r.id,
        contaId: r.contaId,
        data: r.data,
        tipo: r.tipo,
        descricao: r.descricao,
        valor: Number(r.valor),
        saldoApos: Number(r.saldoApos),
        origem: r.origem,
        referenciaId: r.referenciaId,
        createdAt: r.createdAt,
      })),
    });

  } catch (error) {
    return respostaDeErro(error);
  }
}