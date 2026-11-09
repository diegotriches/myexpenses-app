// app/api/contas/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { contas, extratoConta } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import { hojeBrt } from "@/utils/aplicacaoSimulacao";

// GET - Buscar todas as contas do usuário logado
export async function GET() {
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
    const message = error instanceof Error ? error.message : "Erro ao buscar contas";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST - Criar nova conta
export async function POST(req: Request) {
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

    // 1. Criar a conta
    const [novaConta] = await db
      .insert(contas)
      .values({
        userId, // 🔐 CRÍTICO: Forçar o userId do usuário logado
        nome: data.nome,
        banco: data.banco?.trim() || null, // Mantém valor se não estiver vazio
        saldoInicial: saldoInicial.toString(),
        saldoAtual: saldoInicial.toString(),
        ativo: data.ativo ?? true,
        observacoes: data.observacoes?.trim() || null, // Remove espaços em branco
      })
      .returning();

    // 2. Registrar saldo inicial no extrato (se diferente de zero)
    if (saldoInicial !== 0) {
      try {
        // Formatar data como YYYY-MM-DD (string)
        const dataFormatada = hojeBrt();

        await db.insert(extratoConta).values({
          userId, // ✅ userId é obrigatório no schema
          contaId: novaConta.id,
          data: dataFormatada, // ✅ date aceita string YYYY-MM-DD
          tipo: saldoInicial >= 0 ? "entrada" : "saida",
          valor: Math.abs(saldoInicial).toString(),
          descricao: "Saldo inicial da conta",
          saldoApos: saldoInicial.toString(), // ✅ Campo correto do schema
          origem: "AJUSTE", // ✅ Enum: "AJUSTE" está no extratoOrigemEnum
          referenciaId: null,
        });
      } catch (extratoError) {
        // Se falhar ao criar extrato, deletar a conta criada para manter consistência
        console.error("❌ Erro ao criar extrato, revertendo criação da conta:", extratoError);
        
        await db
          .delete(contas)
          .where(eq(contas.id, novaConta.id))
          .catch((deleteError) => {
            console.error("❌ Erro ao reverter criação da conta:", deleteError);
          });

        throw new Error("Erro ao registrar saldo inicial no extrato");
      }
    }

    // Normalizar para retornar
    const contaNormalizada = {
      ...novaConta,
      saldoInicial: Number(novaConta.saldoInicial),
      saldoAtual: Number(novaConta.saldoAtual),
    };

    return NextResponse.json(contaNormalizada, { status: 201 });
  } catch (error) {
    console.error("❌ Erro detalhado ao criar conta:", error);

    // Retornar mensagem de erro mais específica
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}