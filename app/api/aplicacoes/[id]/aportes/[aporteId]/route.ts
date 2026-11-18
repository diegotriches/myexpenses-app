import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { aplicacoes, aportesAplicacao, contas, extratoConta } from "@/db/schema";
import { and, asc, eq } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import { alterarSaldo, ErroFinanceiro, movimentarConta } from "@/lib/movimentacaoConta";
import { respostaDeErro } from "@/lib/rota";

/**
 * Liga ou desliga o desconto de um aporte na conta, depois de criado.
 * - `descontado: true`: aporte histórico (o valor não saiu da conta) passa a
 *   debitar a conta, com o lançamento no extrato na data do aporte.
 * - `descontado: false`: desfaz o desconto (feito na criação ou por aqui):
 *   devolve o valor à conta, apaga o lançamento e o aporte volta a ser histórico.
 * O rendimento não muda: o aporte já conta desde a sua data nos dois casos.
 */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string; aporteId: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { id, aporteId } = await context.params;
    const { descontado }: Partial<Record<"descontado", unknown>> = await req.json();
    if (typeof descontado !== "boolean")
      return NextResponse.json({ error: "Informe se o aporte deve ser descontado da conta" }, { status: 400 });

    const [aplicacao] = await db.select().from(aplicacoes)
      .where(and(eq(aplicacoes.id, id), eq(aplicacoes.userId, userId))).limit(1);
    if (!aplicacao) return NextResponse.json({ error: "Aplicação não encontrada" }, { status: 404 });

    const [aporte] = await db.select().from(aportesAplicacao)
      .where(and(eq(aportesAplicacao.id, aporteId), eq(aportesAplicacao.aplicacaoId, aplicacao.id))).limit(1);
    if (!aporte) return NextResponse.json({ error: "Aporte não encontrado" }, { status: 404 });

    // Aportes antigos podem não ter a conta gravada: usa a da aplicação
    const contaId = aporte.contaId ?? aplicacao.contaId;
    const [conta] = await db.select().from(contas)
      .where(and(eq(contas.id, contaId), eq(contas.userId, userId))).limit(1);
    if (!conta) return NextResponse.json({ error: "Conta do aporte não encontrada" }, { status: 404 });

    const valor = Number(aporte.valor);
    const nome = aplicacao.descricao || aplicacao.indexador.toUpperCase();

    if (descontado) {
      if (!aporte.historico)
        return NextResponse.json({ error: "Este aporte já foi descontado da conta" }, { status: 400 });
      if (!conta.ativo) return NextResponse.json({ error: "Conta inativa" }, { status: 400 });

      // O primeiro aporte é a própria aplicação: mesmo texto do extrato da criação
      const [primeiro] = await db.select({ id: aportesAplicacao.id }).from(aportesAplicacao)
        .where(eq(aportesAplicacao.aplicacaoId, aplicacao.id))
        .orderBy(asc(aportesAplicacao.data), asc(aportesAplicacao.createdAt)).limit(1);

      await db.transaction(async (tx) => {
        await movimentarConta(tx, {
          userId,
          contaId: conta.id,
          tipo: "saida",
          valor,
          data: aporte.data,
          descricao: `${primeiro?.id === aporte.id ? "Aplicação" : "Aporte"} — ${nome}`,
          origem: "APLICACAO",
          referenciaId: aplicacao.id,
          mensagemSaldoInsuficiente: "Saldo insuficiente na conta para descontar esse aporte",
        });
        await tx.update(aportesAplicacao)
          .set({ historico: false, contaId: conta.id })
          .where(eq(aportesAplicacao.id, aporte.id));
      });
    } else {
      if (aporte.historico)
        return NextResponse.json({ error: "Este aporte não foi descontado da conta" }, { status: 400 });

      await db.transaction(async (tx) => {
        // O lançamento do aporte: mesma conta, aplicação, data e valor. Dois aportes
        // iguais no mesmo dia têm lançamentos iguais, e qualquer um serve
        const [lancamento] = await tx.select({ id: extratoConta.id }).from(extratoConta)
          .where(and(
            eq(extratoConta.userId, userId),
            eq(extratoConta.contaId, conta.id),
            eq(extratoConta.origem, "APLICACAO"),
            eq(extratoConta.referenciaId, aplicacao.id),
            eq(extratoConta.data, aporte.data),
            eq(extratoConta.valor, valor.toFixed(2)),
          ))
          .limit(1);
        if (!lancamento)
          throw new ErroFinanceiro("Não encontrei o lançamento desse aporte no extrato da conta", 409);

        await alterarSaldo(tx, userId, conta.id, valor);
        await tx.delete(extratoConta).where(eq(extratoConta.id, lancamento.id));
        await tx.update(aportesAplicacao)
          .set({ historico: true })
          .where(eq(aportesAplicacao.id, aporte.id));
      });
    }

    return NextResponse.json({ ok: true, descontado });
  } catch (error) {
    return respostaDeErro(error, "Erro ao alterar o desconto do aporte");
  }
}
