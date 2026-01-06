import { NextResponse } from "next/server";
import { db } from "@/db";
import { contas, extratoConta } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getUserIdFromSession } from "@/lib/auth/helpers";

// GET - Buscar todas as contas do usuário logado
export async function GET() {
  try {
    // 🔐 Autenticação
    const userId = await getUserIdFromSession();

    // 🔐 Buscar APENAS contas do usuário logado
    const result = await db
      .select()
      .from(contas)
      .where(eq(contas.userId, userId))
      .orderBy(contas.nome);

    // Normalizar valores numeric para number
    const normalizadas = result.map((conta) => ({
      ...conta,
      saldoInicial: Number(conta.saldoInicial),
      saldoAtual: Number(conta.saldoAtual),
    }));

    return NextResponse.json(normalizadas);
  } catch (error) {
    console.error("Erro ao buscar contas:", error);
    
    if (error instanceof Error && error.message === "Não autenticado") {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Erro ao buscar contas" },
      { status: 500 }
    );
  }
}

// POST - Criar nova conta
export async function POST(req: Request) {
  try {
    // 🔐 Autenticação
    const userId = await getUserIdFromSession();

    const data = await req.json();

    // Validações básicas
    if (!data.nome) {
      return NextResponse.json(
        { error: "Nome é obrigatório" },
        { status: 400 }
      );
    }

    const saldoInicial = Number(data.saldoInicial ?? 0);

    if (Number.isNaN(saldoInicial)) {
      return NextResponse.json(
        { error: "Saldo inicial inválido" },
        { status: 400 }
      );
    }

    // 🔐 Criar conta COM userId em transação
    const resultado = await db.transaction(async (tx) => {
      // 1. Criar a conta
      const [novaConta] = await tx
        .insert(contas)
        .values({
          userId, // 🔐 CRÍTICO: Forçar o userId do usuário logado
          nome: data.nome,
          banco: data.banco || null,
          saldoInicial: saldoInicial.toString(),
          saldoAtual: saldoInicial.toString(),
          ativo: data.ativo ?? true,
          observacoes: data.observacoes || null,
        })
        .returning();

      // 2. Registrar saldo inicial no extrato (se diferente de zero)
      if (saldoInicial !== 0) {
        const dataAtual = new Date();
        const dataFormatada = dataAtual.toISOString().split("T")[0];

        await tx.insert(extratoConta).values({
          userId, // 🔐 Incluir userId
          contaId: novaConta.id,
          data: dataFormatada,
          tipo: saldoInicial >= 0 ? "entrada" : "saida",
          valor: Math.abs(saldoInicial).toString(),
          descricao: "Saldo inicial da conta",
          saldoApos: saldoInicial.toString(),
          origem: "AJUSTE",
        });
      }

      return novaConta;
    });

    // Normalizar para retornar
    const contaNormalizada = {
      ...resultado,
      saldoInicial: Number(resultado.saldoInicial),
      saldoAtual: Number(resultado.saldoAtual),
    };

    return NextResponse.json(contaNormalizada, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar conta:", error);

    if (error instanceof Error && error.message === "Não autenticado") {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Erro ao criar conta" },
      { status: 500 }
    );
  }
}