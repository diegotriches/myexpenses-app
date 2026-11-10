import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { extratoConta, contas, extratoOrigemEnum, extratoTipoEnum } from "@/db/schema";
import { eq, and, gte, lte, sql, desc, sum, type SQL } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import { respostaDeErro } from "@/lib/rota";
import { acumuladoNaConta, centavos, saldoAposLinha, valorAssinado } from "@/lib/saldoExtrato";

type RouteParams = {
  params: Promise<{ id: string }>;
};

type Origem = (typeof extratoOrigemEnum.enumValues)[number];
type Tipo = (typeof extratoTipoEnum.enumValues)[number];

const ehOrigem = (v: string): v is Origem => (extratoOrigemEnum.enumValues as readonly string[]).includes(v);
const ehTipo = (v: string): v is Tipo => (extratoTipoEnum.enumValues as readonly string[]).includes(v);

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

    const daConta = and(eq(extratoConta.contaId, contaId), eq(extratoConta.userId, userId));
    const saldoAtual = Number(conta.saldoAtual);

    // ── Saldo de cada linha, derivado das linhas (ver lib/saldoExtrato.ts) ──
    // A soma acumulada é feita sobre TODAS as linhas da conta, antes dos filtros,
    // para o saldo exibido não depender de período, origem ou tipo escolhidos.
    const comSaldo = db
      .select({
        id: extratoConta.id,
        contaId: extratoConta.contaId,
        data: extratoConta.data,
        tipo: extratoConta.tipo,
        descricao: extratoConta.descricao,
        valor: extratoConta.valor,
        origem: extratoConta.origem,
        referenciaId: extratoConta.referenciaId,
        createdAt: extratoConta.createdAt,
        acumulado: acumuladoNaConta.as("acumulado"),
      })
      .from(extratoConta)
      .where(daConta)
      .as("e");

    // ── Filtros das movimentações exibidas ───────────────────────────────────
    const filtros: SQL[] = [];
    if (inicio) filtros.push(gte(comSaldo.data, inicio));
    if (fim)    filtros.push(lte(comSaldo.data, fim));
    if (origem && origem !== "TODAS" && ehOrigem(origem)) filtros.push(eq(comSaldo.origem, origem));
    if (tipo && tipo !== "TODOS" && ehTipo(tipo)) filtros.push(eq(comSaldo.tipo, tipo));

    const registros = await db
      .select()
      .from(comSaldo)
      .where(filtros.length ? and(...filtros) : undefined)
      .orderBy(desc(comSaldo.data), desc(comSaldo.createdAt), desc(comSaldo.id))
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(comSaldo)
      .where(filtros.length ? and(...filtros) : undefined);

    const [{ total: totalDaContaTexto }] = await db
      .select({ total: sum(valorAssinado) })
      .from(extratoConta)
      .where(daConta);
    const totalDaConta = Number(totalDaContaTexto ?? 0);

    // ── Resumo do período (sem tipo/origem, para refletir o saldo real) ──────
    const movimentacoesPeriodo = await db
      .select({ tipo: extratoConta.tipo, valor: extratoConta.valor })
      .from(extratoConta)
      .where(and(
        daConta,
        ...(inicio ? [gte(extratoConta.data, inicio)] : []),
        ...(fim    ? [lte(extratoConta.data, fim)]    : []),
      ));

    const totalEntradas = centavos(movimentacoesPeriodo
      .filter((m) => m.tipo === "entrada")
      .reduce((s, m) => s + Number(m.valor), 0));

    const totalSaidas = centavos(movimentacoesPeriodo
      .filter((m) => m.tipo === "saida")
      .reduce((s, m) => s + Number(m.valor), 0));

    // Saldo imediatamente antes do período: o atual menos tudo o que veio a partir do início.
    // Sem início, é o saldo antes da primeira linha (zero, já que a abertura da conta é uma linha).
    let saldoInicial: number;
    if (inicio) {
      const [{ total: aPartirDoInicio }] = await db
        .select({ total: sum(valorAssinado) })
        .from(extratoConta)
        .where(and(daConta, gte(extratoConta.data, inicio)));
      saldoInicial = centavos(saldoAtual - Number(aPartirDoInicio ?? 0));
    } else {
      saldoInicial = centavos(saldoAtual - totalDaConta);
    }

    const saldoFinal = centavos(saldoInicial + totalEntradas - totalSaidas);

    const resumo = {
      contaId: conta.id,
      contaNome: conta.nome,
      saldoInicial,
      saldoFinal,
      totalEntradas,
      totalSaidas,
      variacao: centavos(saldoFinal - saldoInicial),
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
        saldoApos: saldoAposLinha(saldoAtual, totalDaConta, Number(r.acumulado)),
        origem: r.origem,
        referenciaId: r.referenciaId,
        createdAt: r.createdAt,
      })),
    });

  } catch (error) {
    return respostaDeErro(error);
  }
}
