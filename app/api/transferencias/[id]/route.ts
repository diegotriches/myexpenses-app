import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { extratoConta, contas } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getUserIdFromSession } from "@/lib/auth/helpers";

// DELETE - Remover transferência (estornar)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 🔐 Autenticação
    const userId = await getUserIdFromSession();
    const { id: transferenciaId } = await params;

    if (!transferenciaId) {
      return NextResponse.json(
        { error: "ID da transferência é obrigatório" },
        { status: 400 }
      );
    }

    // Executar estorno em transação
    await db.transaction(async (tx) => {
      // 1. Buscar as 2 movimentações da transferência (saída e entrada)
      const movimentacoes = await tx
        .select()
        .from(extratoConta)
        .where(
          and(
            eq(extratoConta.referenciaId, transferenciaId),
            eq(extratoConta.userId, userId), // 🔐 Verificar ownership
            eq(extratoConta.origem, "TRANSFERENCIA")
          )
        );

      if (movimentacoes.length !== 2) {
        throw new Error("TRANSFERENCIA_NAO_ENCONTRADA");
      }

      // Identificar saída e entrada
      const saida = movimentacoes.find(m => m.tipo === "saida");
      const entrada = movimentacoes.find(m => m.tipo === "entrada");

      if (!saida || !entrada) {
        throw new Error("TRANSFERENCIA_INVALIDA");
      }

      const valorTransferencia = Number(saida.valor);

      // 2. Buscar contas envolvidas
      const [contaOrigem] = await tx
        .select()
        .from(contas)
        .where(
          and(
            eq(contas.id, saida.contaId),
            eq(contas.userId, userId) // 🔐 Verificar ownership
          )
        );

      if (!contaOrigem) {
        throw new Error("CONTA_ORIGEM_NAO_ENCONTRADA");
      }

      const [contaDestino] = await tx
        .select()
        .from(contas)
        .where(
          and(
            eq(contas.id, entrada.contaId),
            eq(contas.userId, userId) // 🔐 Verificar ownership
          )
        );

      if (!contaDestino) {
        throw new Error("CONTA_DESTINO_NAO_ENCONTRADA");
      }

      // 3. Calcular novos saldos (reverter a transferência)
      const saldoAtualOrigem = Number(contaOrigem.saldoAtual);
      const novoSaldoOrigem = saldoAtualOrigem + valorTransferencia; // Devolver o dinheiro

      const saldoAtualDestino = Number(contaDestino.saldoAtual);
      const novoSaldoDestino = saldoAtualDestino - valorTransferencia; // Retirar o dinheiro

      // 4. Verificar se a conta de destino tem saldo para estornar
      if (novoSaldoDestino < 0) {
        throw new Error("SALDO_INSUFICIENTE_PARA_ESTORNO");
      }

      // 5. Criar ID para o estorno
      const estornoId = crypto.randomUUID();
      const dataAtual = new Date().toISOString().split('T')[0];

      // 6. Registrar estorno: entrada na conta de origem
      await tx.insert(extratoConta).values({
        userId, // 🔐 Incluir userId
        contaId: saida.contaId,
        data: dataAtual,
        tipo: "entrada",
        valor: valorTransferencia.toString(),
        descricao: `Estorno de transferência - ${saida.descricao}`,
        saldoApos: novoSaldoOrigem.toString(),
        origem: "ESTORNO",
        referenciaId: estornoId,
      });

      // 7. Registrar estorno: saída na conta de destino
      await tx.insert(extratoConta).values({
        userId, // 🔐 Incluir userId
        contaId: entrada.contaId,
        data: dataAtual,
        tipo: "saida",
        valor: valorTransferencia.toString(),
        descricao: `Estorno de transferência - ${entrada.descricao}`,
        saldoApos: novoSaldoDestino.toString(),
        origem: "ESTORNO",
        referenciaId: estornoId,
      });

      // 8. Atualizar saldos das contas
      await tx
        .update(contas)
        .set({
          saldoAtual: novoSaldoOrigem.toString(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(contas.id, saida.contaId),
            eq(contas.userId, userId) // 🔐 Garantir ownership
          )
        );

      await tx
        .update(contas)
        .set({
          saldoAtual: novoSaldoDestino.toString(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(contas.id, entrada.contaId),
            eq(contas.userId, userId) // 🔐 Garantir ownership
          )
        );

      // 9. Remover as movimentações originais da transferência
      await tx
        .delete(extratoConta)
        .where(
          and(
            eq(extratoConta.referenciaId, transferenciaId),
            eq(extratoConta.userId, userId) // 🔐 Garantir ownership
          )
        );
    });

    return NextResponse.json(
      { message: "Transferência removida com sucesso" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Erro ao remover transferência:", error);

    if (error instanceof Error && error.message === "Não autenticado") {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    const errorMessages: Record<string, { message: string; status: number }> = {
      TRANSFERENCIA_NAO_ENCONTRADA: { message: "Transferência não encontrada", status: 404 },
      TRANSFERENCIA_INVALIDA: { message: "Transferência inválida", status: 400 },
      CONTA_ORIGEM_NAO_ENCONTRADA: { message: "Conta de origem não encontrada", status: 404 },
      CONTA_DESTINO_NAO_ENCONTRADA: { message: "Conta de destino não encontrada", status: 404 },
      SALDO_INSUFICIENTE_PARA_ESTORNO: { message: "Saldo insuficiente na conta de destino para estornar", status: 400 },
    };

    const errorInfo = errorMessages[error.message] || {
      message: "Erro ao remover transferência",
      status: 500,
    };

    return NextResponse.json(
      { error: errorInfo.message },
      { status: errorInfo.status }
    );
  }
}