// app/api/contas/[id]/extrato/[extratoId]/route.ts

import { NextResponse } from "next/server";
import { db } from "@/db";
import { extratoConta, contas } from "@/db/schema";
import { and, eq, gt, or, sql } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import { respostaDeErro } from "@/lib/rota";

type RouteParams = {
  params: Promise<{ id: string; extratoId: string }>;
};

const DESCRICAO_ABERTURA = "Saldo inicial da conta";

class ErroExclusao extends Error {
  constructor(mensagem: string, readonly status: number) {
    super(mensagem);
  }
}

/**
 * DELETE - Exclui um ajuste manual do extrato.
 *
 * Só ajustes podem sair por aqui: as demais linhas têm um registro de origem
 * (transação, fatura, transferência, aplicação) e são revertidas pela rota dele.
 * O saldo muda só pelo valor do ajuste, e as linhas posteriores são deslocadas.
 */
export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { id: contaId, extratoId } = await params;

    await db.transaction(async (tx) => {
      const [conta] = await tx
        .select({ id: contas.id })
        .from(contas)
        .where(and(eq(contas.id, contaId), eq(contas.userId, userId)))
        .limit(1)
        .for("update");

      if (!conta) throw new ErroExclusao("Conta não encontrada ou acesso negado", 404);

      const [movimentacao] = await tx
        .select()
        .from(extratoConta)
        .where(
          and(
            eq(extratoConta.id, extratoId),
            eq(extratoConta.contaId, contaId),
            eq(extratoConta.userId, userId)
          )
        )
        .limit(1);

      if (!movimentacao) throw new ErroExclusao("Movimentação não encontrada", 404);

      if (movimentacao.origem !== "AJUSTE" || movimentacao.descricao === DESCRICAO_ABERTURA) {
        throw new ErroExclusao(
          "Só ajustes manuais podem ser excluídos do extrato. Exclua o lançamento de origem.",
          400
        );
      }

      const valor = Number(movimentacao.valor);
      const delta = (movimentacao.tipo === "entrada" ? -valor : valor).toFixed(2);

      await tx
        .delete(extratoConta)
        .where(and(eq(extratoConta.id, extratoId), eq(extratoConta.userId, userId)));

      await tx
        .update(extratoConta)
        .set({ saldoApos: sql`${extratoConta.saldoApos} + ${delta}::numeric` })
        .where(
          and(
            eq(extratoConta.contaId, contaId),
            eq(extratoConta.userId, userId),
            or(
              gt(extratoConta.data, movimentacao.data),
              and(
                eq(extratoConta.data, movimentacao.data),
                gt(extratoConta.createdAt, movimentacao.createdAt)
              )
            )
          )
        );

      await tx
        .update(contas)
        .set({ saldoAtual: sql`${contas.saldoAtual} + ${delta}::numeric`, updatedAt: new Date() })
        .where(and(eq(contas.id, contaId), eq(contas.userId, userId)));
    });

    return NextResponse.json({ message: "Movimentação excluída com sucesso" });
  } catch (error: unknown) {
    if (error instanceof ErroExclusao) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return respostaDeErro(error, "Erro ao excluir movimentação");
  }
}
