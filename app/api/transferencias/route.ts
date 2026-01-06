import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { extratoConta, contas } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getUserIdFromSession } from "@/lib/auth/helpers";

// GET - Buscar transferências do mês
export async function GET(req: NextRequest) {
  try {
    // 🔐 Autenticação
    const userId = await getUserIdFromSession();

    const { searchParams } = new URL(req.url);
    const ano = searchParams.get("ano");
    const mes = searchParams.get("mes");

    if (!ano || !mes) {
      return NextResponse.json(
        { error: "Ano e mês são obrigatórios" },
        { status: 400 }
      );
    }

    // Calcular primeiro e último dia do mês
    const mesNum = parseInt(mes);
    const anoNum = parseInt(ano);
    const primeiroDia = `${anoNum}-${String(mesNum).padStart(2, "0")}-01`;
    const ultimoDia = new Date(anoNum, mesNum, 0).getDate();
    const ultimoDiaStr = `${anoNum}-${String(mesNum).padStart(2, "0")}-${ultimoDia}`;

    // 🔐 Busca movimentações de transferência do usuário
    const movimentacoes = await db
      .select({
        id: extratoConta.id,
        referenciaId: extratoConta.referenciaId,
        contaId: extratoConta.contaId,
        contaNome: contas.nome,
        data: extratoConta.data,
        tipo: extratoConta.tipo,
        valor: extratoConta.valor,
        descricao: extratoConta.descricao,
        createdAt: extratoConta.createdAt,
      })
      .from(extratoConta)
      .innerJoin(contas, eq(extratoConta.contaId, contas.id))
      .where(
        and(
          eq(extratoConta.userId, userId), // 🔐 CRÍTICO: Filtrar por userId
          eq(extratoConta.origem, "TRANSFERENCIA"),
          sql`${extratoConta.data} >= ${primeiroDia}`,
          sql`${extratoConta.data} <= ${ultimoDiaStr}`
        )
      )
      .orderBy(sql`${extratoConta.data} DESC, ${extratoConta.createdAt} DESC`);

    // Agrupa por referenciaId (cada transferência tem 2 movimentações)
    const transferenciasMap = new Map<string, any>();

    for (const mov of movimentacoes) {
      if (!mov.referenciaId) continue;

      if (!transferenciasMap.has(mov.referenciaId)) {
        transferenciasMap.set(mov.referenciaId, {
          id: mov.referenciaId,
          data: mov.data,
          createdAt: mov.createdAt,
          valor: Number(mov.valor),
          descricao: mov.descricao,
          origem: null,
          destino: null,
        });
      }

      const transf = transferenciasMap.get(mov.referenciaId);

      if (mov.tipo === "saida") {
        transf.origem = {
          contaId: mov.contaId,
          contaNome: mov.contaNome,
        };
      } else {
        transf.destino = {
          contaId: mov.contaId,
          contaNome: mov.contaNome,
        };
      }
    }

    // Converte para array e formata
    const transferencias = Array.from(transferenciasMap.values())
      .filter(t => t.origem && t.destino)
      .map(t => ({
        id: t.id,
        contaOrigemId: t.origem.contaId,
        contaOrigemNome: t.origem.contaNome,
        contaDestinoId: t.destino.contaId,
        contaDestinoNome: t.destino.contaNome,
        valor: t.valor,
        descricao: t.descricao,
        data: t.data,
        createdAt: t.createdAt,
      }));

    return NextResponse.json(transferencias);
  } catch (error) {
    console.error("Erro ao buscar transferências:", error);

    if (error instanceof Error && error.message === "Não autenticado") {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Erro ao buscar transferências" },
      { status: 500 }
    );
  }
}

// POST - Criar transferência
export async function POST(req: NextRequest) {
  try {
    // 🔐 Autenticação
    const userId = await getUserIdFromSession();

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

    const valorNum = Number(valor);
    if (valorNum <= 0) {
      return NextResponse.json(
        { error: "Valor deve ser maior que zero" },
        { status: 400 }
      );
    }

    // Normalizar data para formato YYYY-MM-DD
    const dataFormatada = data.includes('T') 
      ? new Date(data).toISOString().split('T')[0]
      : data;

    // Executar transferência em transação
    const resultado = await db.transaction(async (tx) => {
      // 1. Verificar se ambas as contas pertencem ao usuário
      const [contaOrigem] = await tx
        .select()
        .from(contas)
        .where(
          and(
            eq(contas.id, contaOrigemId),
            eq(contas.userId, userId) // 🔐 Verificar ownership
          )
        );

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
          and(
            eq(contas.id, contaDestinoId),
            eq(contas.userId, userId) // 🔐 Verificar ownership
          )
        );

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

      // 4. Gerar ID único para a transferência
      const transferenciaId = crypto.randomUUID();

      // 5. Registrar saída na conta de origem
      await tx.insert(extratoConta).values({
        userId, // 🔐 Incluir userId
        contaId: contaOrigemId,
        data: dataFormatada,
        tipo: "saida",
        valor: valorNum.toString(),
        descricao: descricao || `Transferência para ${contaDestino.nome}`,
        saldoApos: novoSaldoOrigem.toString(),
        origem: "TRANSFERENCIA",
        referenciaId: transferenciaId,
      });

      // 6. Registrar entrada na conta de destino
      await tx.insert(extratoConta).values({
        userId, // 🔐 Incluir userId
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
          and(
            eq(contas.id, contaOrigemId),
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
            eq(contas.id, contaDestinoId),
            eq(contas.userId, userId) // 🔐 Garantir ownership
          )
        );

      return {
        id: transferenciaId,
        contaOrigemId,
        contaOrigemNome: contaOrigem.nome,
        contaDestinoId,
        contaDestinoNome: contaDestino.nome,
        valor: valorNum,
        descricao,
        data: dataFormatada,
      };
    });

    return NextResponse.json(resultado, { status: 201 });
  } catch (error: any) {
    console.error("Erro ao criar transferência:", error);

    if (error instanceof Error && error.message === "Não autenticado") {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    const errorMessages: Record<string, { message: string; status: number }> = {
      CONTA_ORIGEM_NAO_ENCONTRADA: { message: "Conta de origem não encontrada", status: 404 },
      CONTA_DESTINO_NAO_ENCONTRADA: { message: "Conta de destino não encontrada", status: 404 },
      CONTA_ORIGEM_INATIVA: { message: "Conta de origem está inativa", status: 400 },
      CONTA_DESTINO_INATIVA: { message: "Conta de destino está inativa", status: 400 },
      SALDO_INSUFICIENTE: { message: "Saldo insuficiente na conta de origem", status: 400 },
    };

    const errorInfo = errorMessages[error.message] || {
      message: "Erro ao criar transferência",
      status: 500,
    };

    return NextResponse.json(
      { error: errorInfo.message },
      { status: errorInfo.status }
    );
  }
}