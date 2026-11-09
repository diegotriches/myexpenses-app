// src/app/api/contas/[id]/ajustar-saldo/route.ts

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { contas, extratoConta } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import { hojeBrt } from "@/utils/aplicacaoSimulacao";

// ✅ NOVO: Tipos para os parâmetros
type RouteParams = {
  params: Promise<{ id: string }>;
};

// POST - Ajustar saldo da conta
export async function POST(req: NextRequest, { params }: RouteParams) {
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

    // ✅ NOVO: Executar em transação e retornar Conta completa
    const contaAtualizada = await db.transaction(async (tx) => {
      // 1. Buscar conta e verificar ownership
      const [contaAtual] = await tx
        .select()
        .from(contas)
        .where(and(eq(contas.id, contaId), eq(contas.userId, userId)))
        .limit(1);

      if (!contaAtual) {
        throw new Error("CONTA_NAO_ENCONTRADA");
      }

      const saldoAnterior = Number(contaAtual.saldoAtual);
      const novoSaldo = saldoAnterior + valorNum;

      // 2. Registrar no extrato
      const dataFormatada = hojeBrt();

      await tx.insert(extratoConta).values({
        userId,
        contaId: contaId,
        data: dataFormatada,
        tipo: valorNum >= 0 ? "entrada" : "saida",
        valor: Math.abs(valorNum).toString(),
        descricao: descricao || "Ajuste de saldo",
        saldoApos: novoSaldo.toString(),
        origem: "AJUSTE",
      });

      // 3. Atualizar saldo da conta
      const [resultado] = await tx
        .update(contas)
        .set({
          saldoAtual: novoSaldo.toString(),
          updatedAt: new Date(),
        })
        .where(and(eq(contas.id, contaId), eq(contas.userId, userId)))
        .returning();

      return resultado;
    });

    // ✅ NOVO: Normalizar e retornar Conta completa (padrão do projeto)
    const contaNormalizada = {
      ...contaAtualizada,
      saldoInicial: Number(contaAtualizada.saldoInicial),
      saldoAtual: Number(contaAtualizada.saldoAtual),
    };

    return NextResponse.json(contaNormalizada);
  } catch (error: any) {
    console.error("Erro ao ajustar saldo:", error);

    if (error.message === "CONTA_NAO_ENCONTRADA") {
      return NextResponse.json(
        { error: "Conta não encontrada ou acesso negado" },
        { status: 404 }
      );
    }

    const message = error instanceof Error ? error.message : "Erro ao ajustar saldo";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}