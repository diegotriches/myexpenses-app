import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { transferencias, extratoConta, contas } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import { hojeBrt } from "@/utils/aplicacaoSimulacao";

// Tipagem dos params da rota
type RouteParams = {
  params: Promise<{ id: string }>;
};

// GET - Buscar transferência por ID
export async function GET(
  req: NextRequest,
  { params }: RouteParams
) {
  try {
    // 🔐 Autenticação
    const userId = await getUserId();

    // ✅ VALIDAÇÃO: Retorna 401 se não autenticado
    if (!userId) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "ID da transferência é obrigatório" },
        { status: 400 }
      );
    }

    // 🔐 Buscar transferência com JOIN nas contas
    const [resultado] = await db
      .select({
        id: transferencias.id,
        userId: transferencias.userId,
        contaOrigemId: transferencias.contaOrigemId,
        contaDestinoId: transferencias.contaDestinoId,
        valor: transferencias.valor,
        data: transferencias.data,
        descricao: transferencias.descricao,
        createdAt: transferencias.createdAt,
        // JOIN conta origem
        contaOrigemNome: sql<string>`co.nome`,
        contaOrigemBanco: sql<string>`co.banco`,
        // JOIN conta destino
        contaDestinoNome: sql<string>`cd.nome`,
        contaDestinoBanco: sql<string>`cd.banco`,
      })
      .from(transferencias)
      .leftJoin(
        sql`contas co`,
        sql`${transferencias.contaOrigemId} = co.id`
      )
      .leftJoin(
        sql`contas cd`,
        sql`${transferencias.contaDestinoId} = cd.id`
      )
      .where(
        and(
          eq(transferencias.id, id),
          eq(transferencias.userId, userId) // 🔐 Verificar ownership
        )
      );

    if (!resultado) {
      return NextResponse.json(
        { error: "Transferência não encontrada" },
        { status: 404 }
      );
    }

    // Formatar resposta
    const transferencia = {
      id: resultado.id,
      userId: resultado.userId,
      contaOrigemId: resultado.contaOrigemId,
      contaDestinoId: resultado.contaDestinoId,
      valor: resultado.valor,
      data: resultado.data,
      descricao: resultado.descricao,
      createdAt: resultado.createdAt,
      contaOrigem: {
        id: resultado.contaOrigemId,
        nome: resultado.contaOrigemNome,
        banco: resultado.contaOrigemBanco,
      },
      contaDestino: {
        id: resultado.contaDestinoId,
        nome: resultado.contaDestinoNome,
        banco: resultado.contaDestinoBanco,
      },
    };

    return NextResponse.json(transferencia);
  } catch (error) {
    console.error("Erro ao buscar transferência:", error);
    const message = error instanceof Error ? error.message : "Erro ao buscar transferência";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE - Remover transferência (estornar)
export async function DELETE(
  req: NextRequest,
  { params }: RouteParams
) {
  try {
    // 🔐 Autenticação
    const userId = await getUserId();

    // ✅ VALIDAÇÃO: Retorna 401 se não autenticado
    if (!userId) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    const { id: transferenciaId } = await params;

    if (!transferenciaId) {
      return NextResponse.json(
        { error: "ID da transferência é obrigatório" },
        { status: 400 }
      );
    }

    // Executar estorno em transação atômica
    await db.transaction(async (tx) => {
      // 1. Buscar a transferência
      const [transferencia] = await tx
        .select()
        .from(transferencias)
        .where(
          and(
            eq(transferencias.id, transferenciaId),
            eq(transferencias.userId, userId) // 🔐 Verificar ownership
          )
        );

      if (!transferencia) {
        throw new Error("TRANSFERENCIA_NAO_ENCONTRADA");
      }

      const valorTransferencia = Number(transferencia.valor);

      // 2. Buscar contas envolvidas
      const [contaOrigem] = await tx
        .select()
        .from(contas)
        .where(
          and(
            eq(contas.id, transferencia.contaOrigemId),
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
            eq(contas.id, transferencia.contaDestinoId),
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
      const dataAtual = hojeBrt();

      // 6. Registrar estorno: entrada na conta de origem
      await tx.insert(extratoConta).values({
        userId,
        contaId: transferencia.contaOrigemId,
        data: dataAtual,
        tipo: "entrada",
        valor: valorTransferencia.toString(),
        descricao: `Estorno - ${transferencia.descricao || `Transferência para ${contaDestino.nome}`}`,
        saldoApos: novoSaldoOrigem.toString(),
        origem: "ESTORNO",
        referenciaId: estornoId,
      });

      // 7. Registrar estorno: saída na conta de destino
      await tx.insert(extratoConta).values({
        userId,
        contaId: transferencia.contaDestinoId,
        data: dataAtual,
        tipo: "saida",
        valor: valorTransferencia.toString(),
        descricao: `Estorno - ${transferencia.descricao || `Transferência de ${contaOrigem.nome}`}`,
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
            eq(contas.id, transferencia.contaOrigemId),
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
            eq(contas.id, transferencia.contaDestinoId),
            eq(contas.userId, userId) // 🔐 Garantir ownership
          )
        );

      // 9. Remover a transferência da tabela
      await tx
        .delete(transferencias)
        .where(
          and(
            eq(transferencias.id, transferenciaId),
            eq(transferencias.userId, userId) // 🔐 Garantir ownership
          )
        );
    });

    return NextResponse.json(
      { message: "Transferência removida com sucesso" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Erro ao remover transferência:", error);

    const errorMessages: Record<string, { message: string; status: number }> =
      {
        TRANSFERENCIA_NAO_ENCONTRADA: {
          message: "Transferência não encontrada",
          status: 404,
        },
        CONTA_ORIGEM_NAO_ENCONTRADA: {
          message: "Conta de origem não encontrada",
          status: 404,
        },
        CONTA_DESTINO_NAO_ENCONTRADA: {
          message: "Conta de destino não encontrada",
          status: 404,
        },
        SALDO_INSUFICIENTE_PARA_ESTORNO: {
          message: "Saldo insuficiente na conta de destino para estornar",
          status: 400,
        },
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