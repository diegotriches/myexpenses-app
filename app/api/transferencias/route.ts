import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { extratoConta, contas } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { TransferenciasService } from "@/services/transferenciasService"

export async function GET(req: NextRequest) {
  try {
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

    // Busca todas as movimentações de transferência do período
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
      .filter(t => t.origem && t.destino) // Garante que tem ambas as partes
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
    return NextResponse.json(
      { error: "Erro ao buscar transferências" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
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

    if (valor <= 0) {
      return NextResponse.json(
        { error: "Valor deve ser maior que zero" },
        { status: 400 }
      );
    }

    // Executa transferência
    const resultado = await TransferenciasService.transferir({
      contaOrigemId,
      contaDestinoId,
      valor: Number(valor),
      descricao: descricao || undefined,
      data: new Date(data),
    });

    return NextResponse.json(resultado, { status: 201 });
  } catch (error: any) {
    console.error("Erro ao criar transferência:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao criar transferência" },
      { status: 500 }
    );
  }
}