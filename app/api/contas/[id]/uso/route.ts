import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  contas,
  transacoes,
  transferencias,
  extratoConta,
  aplicacoes,
  faturas,
  cartoes,
  recorrencias,
} from "@/db/schema";
import { and, eq, or, sql } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import { respostaDeErro } from "@/lib/rota";

type RouteParams = { params: Promise<{ id: string }> };

// GET - Resumo do que a exclusão definitiva da conta vai afetar
export async function GET(req: Request, { params }: RouteParams) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { id } = await params;

    const [conta] = await db
      .select()
      .from(contas)
      .where(and(eq(contas.id, id), eq(contas.userId, userId)))
      .limit(1);

    if (!conta) {
      return NextResponse.json({ error: "Conta não encontrada" }, { status: 404 });
    }

    const contar = async (tabela: any, condicao: any) => {
      const [r] = await db.select({ n: sql<number>`count(*)::int` }).from(tabela).where(condicao);
      return Number(r?.n ?? 0);
    };

    const [
      qtdTransacoes,
      qtdTransferencias,
      qtdExtrato,
      qtdFaturasPagas,
      qtdCartoes,
      qtdRecorrencias,
    ] = await Promise.all([
      contar(transacoes, and(eq(transacoes.userId, userId), eq(transacoes.contaId, id))),
      contar(
        transferencias,
        and(
          eq(transferencias.userId, userId),
          or(eq(transferencias.contaOrigemId, id), eq(transferencias.contaDestinoId, id))
        )
      ),
      contar(extratoConta, and(eq(extratoConta.userId, userId), eq(extratoConta.contaId, id))),
      contar(faturas, and(eq(faturas.userId, userId), eq(faturas.contaPagamentoId, id))),
      contar(cartoes, and(eq(cartoes.userId, userId), eq(cartoes.contaVinculadaId, id))),
      contar(recorrencias, and(eq(recorrencias.userId, userId), eq(recorrencias.contaId, id))),
    ]);

    const listaAplicacoes = await db
      .select({ resgatada: aplicacoes.resgatada, valorAtual: aplicacoes.valorAtual })
      .from(aplicacoes)
      .where(and(eq(aplicacoes.userId, userId), eq(aplicacoes.contaId, id)));

    const ativas = listaAplicacoes.filter((a) => !a.resgatada);

    return NextResponse.json({
      transacoes: qtdTransacoes,
      transferencias: qtdTransferencias,
      lancamentosExtrato: qtdExtrato,
      aplicacoes: listaAplicacoes.length,
      aplicacoesAtivas: ativas.length,
      valorAplicado: Number(ativas.reduce((s, a) => s + Number(a.valorAtual), 0).toFixed(2)),
      faturasPagas: qtdFaturasPagas,
      cartoesVinculados: qtdCartoes,
      recorrencias: qtdRecorrencias,
      saldoAtual: Number(conta.saldoAtual),
    });
  } catch (error) {
    return respostaDeErro(error);
  }
}