import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { transferencias, extratoConta, contas } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import { lerValorPositivo } from "@/lib/validators/financeiro";
import { respostaDeErro } from "@/lib/rota";

// GET - Buscar transferências do período
export async function GET(req: NextRequest) {
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

    const { searchParams } = new URL(req.url);
    const ano = searchParams.get("ano");
    const mes = searchParams.get("mes");
    const contaOrigemId = searchParams.get("contaOrigemId");
    const contaDestinoId = searchParams.get("contaDestinoId");

    // Construir condições WHERE
    const conditions = [eq(transferencias.userId, userId)];

    if (ano && mes) {
      const mesNum = parseInt(mes);
      const anoNum = parseInt(ano);
      const primeiroDia = `${anoNum}-${String(mesNum).padStart(2, "0")}-01`;
      const ultimoDia = new Date(anoNum, mesNum, 0).getDate();
      const ultimoDiaStr = `${anoNum}-${String(mesNum).padStart(2, "0")}-${ultimoDia}`;

      conditions.push(
        sql`${transferencias.data} >= ${primeiroDia}`,
        sql`${transferencias.data} <= ${ultimoDiaStr}`
      );
    }

    if (contaOrigemId) {
      conditions.push(eq(transferencias.contaOrigemId, contaOrigemId));
    }

    if (contaDestinoId) {
      conditions.push(eq(transferencias.contaDestinoId, contaDestinoId));
    }

    // 🔐 Buscar transferências com JOIN nas contas
    const resultado = await db
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
      .where(and(...conditions))
      .orderBy(sql`${transferencias.data} DESC, ${transferencias.createdAt} DESC`);

    // Transformar para o formato esperado pelo frontend
    const transferenciasFormatadas = resultado.map((t) => ({
      id: t.id,
      userId: t.userId,
      contaOrigemId: t.contaOrigemId,
      contaDestinoId: t.contaDestinoId,
      valor: t.valor,
      data: t.data,
      descricao: t.descricao,
      createdAt: t.createdAt,
      contaOrigem: {
        id: t.contaOrigemId,
        nome: t.contaOrigemNome,
        banco: t.contaOrigemBanco,
      },
      contaDestino: {
        id: t.contaDestinoId,
        nome: t.contaDestinoNome,
        banco: t.contaDestinoBanco,
      },
    }));

    return NextResponse.json(transferenciasFormatadas);
  } catch (error) {
    return respostaDeErro(error);
  }
}

// POST - Criar transferência
export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const { contaOrigemId, contaDestinoId, valor, descricao, data } = body;

    // Validações
    if (!contaOrigemId || !contaDestinoId || !valor || !data) {
      return NextResponse.json(
        { error: "Dados incompletos" },
        { status: 400 }
      );
    }

    if (contaOrigemId === contaDestinoId) {
      return NextResponse.json(
        { error: "Conta de origem e destino não podem ser iguais" },
        { status: 400 }
      );
    }

    const valorNum = lerValorPositivo(valor);
    if (valorNum === null) {
      return NextResponse.json(
        { error: "Valor deve ser maior que zero" },
        { status: 400 }
      );
    }

    // Normalizar data para formato YYYY-MM-DD
    const dataFormatada = data.includes("T")
      ? new Date(data).toISOString().split("T")[0]
      : data;

    // Executar transferência em transação atômica
    const resultado = await db.transaction(async (tx) => {
      // 1. Verificar se ambas as contas pertencem ao usuário
      const [contaOrigem] = await tx
        .select()
        .from(contas)
        .where(
          and(eq(contas.id, contaOrigemId), eq(contas.userId, userId))
        )
        .for("update");

      if (!contaOrigem) {
        throw new Error("CONTA_ORIGEM_NAO_ENCONTRADA");
      }

      if (!contaOrigem.ativo) {
        throw new Error("CONTA_ORIGEM_INATIVA");
      }

      const [contaDestino] = await tx
        .select()
        .from(contas)
        .where(
          and(eq(contas.id, contaDestinoId), eq(contas.userId, userId))
        )
        .for("update");

      if (!contaDestino) {
        throw new Error("CONTA_DESTINO_NAO_ENCONTRADA");
      }

      if (!contaDestino.ativo) {
        throw new Error("CONTA_DESTINO_INATIVA");
      }

      // 2. Verificar saldo da conta de origem
      const saldoOrigem = Number(contaOrigem.saldoAtual);
      if (saldoOrigem < valorNum) {
        throw new Error("SALDO_INSUFICIENTE");
      }

      // 3. Calcular novos saldos
      const novoSaldoOrigem = saldoOrigem - valorNum;
      const saldoDestino = Number(contaDestino.saldoAtual);
      const novoSaldoDestino = saldoDestino + valorNum;

      // 4. Inserir na tabela transferencias
      const [transferenciaInserida] = await tx
        .insert(transferencias)
        .values({
          userId,
          contaOrigemId,
          contaDestinoId,
          valor: valorNum.toString(),
          data: dataFormatada,
          descricao: descricao || null,
        })
        .returning();

      const transferenciaId = transferenciaInserida.id;

      // 5. Registrar saída na conta de origem (extrato)
      await tx.insert(extratoConta).values({
        userId,
        contaId: contaOrigemId,
        data: dataFormatada,
        tipo: "saida",
        valor: valorNum.toString(),
        descricao: descricao || `Transferência para ${contaDestino.nome}`,
        saldoApos: novoSaldoOrigem.toString(),
        origem: "TRANSFERENCIA",
        referenciaId: transferenciaId,
      });

      // 6. Registrar entrada na conta de destino (extrato)
      await tx.insert(extratoConta).values({
        userId,
        contaId: contaDestinoId,
        data: dataFormatada,
        tipo: "entrada",
        valor: valorNum.toString(),
        descricao: descricao || `Transferência de ${contaOrigem.nome}`,
        saldoApos: novoSaldoDestino.toString(),
        origem: "TRANSFERENCIA",
        referenciaId: transferenciaId,
      });

      // 7. Atualizar saldos das contas
      await tx
        .update(contas)
        .set({
          saldoAtual: novoSaldoOrigem.toString(),
          updatedAt: new Date(),
        })
        .where(
          and(eq(contas.id, contaOrigemId), eq(contas.userId, userId))
        );

      await tx
        .update(contas)
        .set({
          saldoAtual: novoSaldoDestino.toString(),
          updatedAt: new Date(),
        })
        .where(
          and(eq(contas.id, contaDestinoId), eq(contas.userId, userId))
        );

      return {
        id: transferenciaId,
        userId,
        contaOrigemId,
        contaDestinoId,
        valor: valorNum,
        data: dataFormatada,
        descricao: descricao || null,
        createdAt: transferenciaInserida.createdAt,
        contaOrigem: {
          id: contaOrigem.id,
          nome: contaOrigem.nome,
          banco: contaOrigem.banco,
        },
        contaDestino: {
          id: contaDestino.id,
          nome: contaDestino.nome,
          banco: contaDestino.banco,
        },
      };
    });

    return NextResponse.json(resultado, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar transferência:", error);

    const errorMessages: Record<string, { message: string; status: number }> =
      {
        CONTA_ORIGEM_NAO_ENCONTRADA: {
          message: "Conta de origem não encontrada",
          status: 404,
        },
        CONTA_DESTINO_NAO_ENCONTRADA: {
          message: "Conta de destino não encontrada",
          status: 404,
        },
        CONTA_ORIGEM_INATIVA: {
          message: "Conta de origem está inativa",
          status: 400,
        },
        CONTA_DESTINO_INATIVA: {
          message: "Conta de destino está inativa",
          status: 400,
        },
        SALDO_INSUFICIENTE: {
          message: "Saldo insuficiente na conta de origem",
          status: 400,
        },
      };

    const errorInfo = error instanceof Error ? errorMessages[error.message] : undefined;
    if (!errorInfo) return respostaDeErro(error, "Erro ao criar transferência");

    return NextResponse.json(
      { error: errorInfo.message },
      { status: errorInfo.status }
    );
  }
}