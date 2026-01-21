// src/app/api/contas/[id]/extrato/[extratoId]/route.ts

import { NextResponse } from "next/server";
import { db } from "@/db";
import { extratoConta, contas } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getUserId } from "@/lib/auth";

type RouteParams = {
  params: Promise<{ id: string; extratoId: string }>;
};

/**
 * DELETE - Excluir movimentação do extrato
 * 
 * ⚠️ ATENÇÃO: Ao excluir uma movimentação do extrato:
 * 1. Remove o lançamento do extrato
 * 2. Recalcula o saldo da conta
 * 3. Atualiza o saldoApos de todas as movimentações posteriores
 */
export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    // 🔐 Autenticação
    const userId = await getUserId();

    if (!userId) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    const { id: contaId, extratoId } = await params;

    // Executar em transação para garantir consistência
    await db.transaction(async (tx) => {
      // 1. Verificar se a conta existe e pertence ao usuário
      const [conta] = await tx
        .select()
        .from(contas)
        .where(and(eq(contas.id, contaId), eq(contas.userId, userId)))
        .limit(1);

      if (!conta) {
        throw new Error("CONTA_NAO_ENCONTRADA");
      }

      // 2. Buscar a movimentação que será excluída
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

      if (!movimentacao) {
        throw new Error("MOVIMENTACAO_NAO_ENCONTRADA");
      }

      // ⚠️ Verificar se é uma movimentação que pode ser excluída
      // Não permitir excluir movimentações geradas por transações
      // (transações têm registro próprio e devem ser excluídas pela rota de transações)
      const origemProtegida = [
        "TRANSACAO_MANUAL",
        "PAGAMENTO_FATURA"
      ] as const;

      if (origemProtegida.includes(movimentacao.origem as any)) {
        throw new Error(
          `Não é possível excluir esta movimentação diretamente. ` +
          `Exclua a transação original.`
        );
      }

      // Array para armazenar IDs das contas que precisam recalcular saldo
      const contasParaRecalcular = new Set([contaId]);
      const movimentacoesParaExcluir = new Set([extratoId]);

      // Se for transferência, precisamos excluir AMBAS as movimentações vinculadas
      if (movimentacao.origem === "TRANSFERENCIA" && movimentacao.referenciaId) {
        // Buscar a OUTRA movimentação que tem o MESMO referenciaId (transferência par)
        const movimentacoesPar = await tx
          .select()
          .from(extratoConta)
          .where(
            and(
              eq(extratoConta.referenciaId, movimentacao.referenciaId),
              eq(extratoConta.userId, userId),
              eq(extratoConta.origem, "TRANSFERENCIA")
            )
          );

        // Adicionar todas as movimentações com mesmo referenciaId (exceto a atual)
        for (const mov of movimentacoesPar) {
          if (mov.id !== extratoId) {
            contasParaRecalcular.add(mov.contaId);
            movimentacoesParaExcluir.add(mov.id);
          }
        }
      }

      // 3. Excluir TODAS as movimentações identificadas
      for (const movId of Array.from(movimentacoesParaExcluir)) {
        await tx
          .delete(extratoConta)
          .where(
            and(
              eq(extratoConta.id, movId),
              eq(extratoConta.userId, userId)
            )
          );
      }

      // 4. Recalcular saldos de TODAS as contas afetadas
      for (const contaIdAtual of Array.from(contasParaRecalcular)) {
        // Buscar dados da conta
        const [contaAtual] = await tx
          .select()
          .from(contas)
          .where(
            and(
              eq(contas.id, contaIdAtual),
              eq(contas.userId, userId)
            )
          )
          .limit(1);

        if (!contaAtual) continue;

        // Buscar todas as movimentações da conta (ordenadas)
        const movimentacoesConta = await tx
          .select()
          .from(extratoConta)
          .where(
            and(
              eq(extratoConta.contaId, contaIdAtual),
              eq(extratoConta.userId, userId)
            )
          )
          .orderBy(extratoConta.data, extratoConta.createdAt);

        // Recalcular saldos de todas as movimentações
        let saldoAtual = Number(contaAtual.saldoInicial);

        for (const mov of movimentacoesConta) {
          const valorMov = Number(mov.valor);
          
          if (mov.tipo === "entrada") {
            saldoAtual += valorMov;
          } else {
            saldoAtual -= valorMov;
          }

          // Atualizar saldoApos da movimentação
          await tx
            .update(extratoConta)
            .set({ saldoApos: saldoAtual.toString() })
            .where(eq(extratoConta.id, mov.id));
        }

        // Atualizar saldo final da conta
        await tx
          .update(contas)
          .set({
            saldoAtual: saldoAtual.toString(),
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(contas.id, contaIdAtual),
              eq(contas.userId, userId)
            )
          );
      }
    });

    return NextResponse.json({ 
      message: "Movimentação excluída com sucesso" 
    });

  } catch (error: any) {
    console.error("Erro ao excluir movimentação:", error);

    if (error.message === "CONTA_NAO_ENCONTRADA") {
      return NextResponse.json(
        { error: "Conta não encontrada ou acesso negado" },
        { status: 404 }
      );
    }

    if (error.message === "MOVIMENTACAO_NAO_ENCONTRADA") {
      return NextResponse.json(
        { error: "Movimentação não encontrada" },
        { status: 404 }
      );
    }

    if (error.message.includes("Não é possível excluir")) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    const message = error instanceof Error 
      ? error.message 
      : "Erro ao excluir movimentação";
    
    return NextResponse.json({ error: message }, { status: 500 });
  }
}