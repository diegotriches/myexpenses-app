import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { contas, extratoConta } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getUserIdFromSession } from "@/lib/auth/helpers";

// POST - Ajustar saldo da conta
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 🔐 Autenticação
    const userId = await getUserIdFromSession();
    const { id: contaId } = await params;

    const { valor, descricao } = await req.json();

    // Validações
    if (valor === undefined || valor === null) {
      return NextResponse.json(
        { error: "Valor é obrigatório" },
        { status: 400 }
      );
    }

    const valorNum = Number(valor);
    if (Number.isNaN(valorNum)) {
      return NextResponse.json(
        { error: "Valor inválido" },
        { status: 400 }
      );
    }

    if (valorNum === 0) {
      return NextResponse.json(
        { error: "Valor não pode ser zero" },
        { status: 400 }
      );
    }

    // Executar em transação
    const resultado = await db.transaction(async (tx) => {
      // 1. Buscar conta e verificar ownership
      const [contaAtual] = await tx
        .select()
        .from(contas)
        .where(
          and(
            eq(contas.id, contaId),
            eq(contas.userId, userId) // 🔐 Verificar ownership
          )
        );

      if (!contaAtual) {
        throw new Error("CONTA_NAO_ENCONTRADA");
      }

      const saldoAnterior = Number(contaAtual.saldoAtual);
      const novoSaldo = saldoAnterior + valorNum;

      // 2. Registrar no extrato
      const dataAtual = new Date();
      const dataFormatada = dataAtual.toISOString().split("T")[0];

      await tx.insert(extratoConta).values({
        userId, // 🔐 Incluir userId
        contaId: contaId,
        data: dataFormatada,
        tipo: valorNum >= 0 ? "entrada" : "saida",
        valor: Math.abs(valorNum).toString(),
        descricao: descricao || "Ajuste de saldo",
        saldoApos: novoSaldo.toString(),
        origem: "AJUSTE",
      });

      // 3. Atualizar saldo da conta
      await tx
        .update(contas)
        .set({
          saldoAtual: novoSaldo.toString(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(contas.id, contaId),
            eq(contas.userId, userId) // 🔐 Garantir ownership
          )
        );

      return {
        contaId,
        saldoAnterior,
        novoSaldo,
        ajuste: valorNum,
      };
    });

    return NextResponse.json(resultado);
  } catch (error: any) {
    console.error("Erro ao ajustar saldo:", error);

    if (error instanceof Error && error.message === "Não autenticado") {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    if (error.message === "CONTA_NAO_ENCONTRADA") {
      return NextResponse.json(
        { error: "Conta não encontrada ou acesso negado" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Erro ao ajustar saldo" },
      { status: 500 }
    );
  }
}