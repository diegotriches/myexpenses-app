import { NextResponse } from "next/server";
import { db } from "@/db";
import { contas } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import { respostaDeErro } from "@/lib/rota";

// ✅ NOVO: Tipos para os parâmetros
type RouteParams = {
  params: Promise<{ id: string }>;
};

// GET - Buscar conta específica
export async function GET(req: Request, { params }: RouteParams) {
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

    // 🔐 Buscar conta do usuário
    const [conta] = await db
      .select()
      .from(contas)
      .where(and(eq(contas.id, id), eq(contas.userId, userId)))
      .limit(1);

    if (!conta) {
      return NextResponse.json({ error: "Conta não encontrada" }, { status: 404 });
    }

    // Normalizar valores
    const contaNormalizada = {
      ...conta,
      saldoInicial: Number(conta.saldoInicial),
      saldoAtual: Number(conta.saldoAtual),
    };

    return NextResponse.json(contaNormalizada);
  } catch (error) {
    return respostaDeErro(error);
  }
}

// PUT - Atualizar conta
export async function PUT(req: Request, { params }: RouteParams) {
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
    const data = await req.json();

    // ✅ NOVO: Bloquear edição de campos sensíveis
    // Do payload só são lidos os campos editáveis, listados abaixo
    const { saldoAtual, ...payload } = data;

    // ✅ NOVO: Validação explícita
    if (saldoAtual !== undefined) {
      return NextResponse.json(
        {
          error:
            "O campo 'saldoAtual' não pode ser editado diretamente. Use o endpoint /ajustar-saldo para modificar o saldo.",
        },
        { status: 400 }
      );
    }

    // 🔐 Verificar se a conta existe e pertence ao usuário
    const [contaExistente] = await db
      .select()
      .from(contas)
      .where(and(eq(contas.id, id), eq(contas.userId, userId)))
      .limit(1);

    if (!contaExistente) {
      return NextResponse.json(
        { error: "Conta não encontrada ou acesso negado" },
        { status: 404 }
      );
    }

    // Mudar o saldo inicial deixaria saldo e extrato inconsistentes
    if (payload.saldoInicial !== undefined && Number(payload.saldoInicial) !== Number(contaExistente.saldoInicial)) {
      return NextResponse.json(
        { error: "O saldo inicial não pode ser alterado. Use o ajuste de saldo." },
        { status: 400 }
      );
    }

    // Preparar dados para atualização
    const dadosAtualizacao: {
      updatedAt: Date;
      nome?: string;
      banco?: string | null;
      ativo?: boolean;
      observacoes?: string | null;
    } = {
      updatedAt: new Date(),
    };

    if (payload.nome !== undefined) dadosAtualizacao.nome = payload.nome;
    if (payload.banco !== undefined) {
      dadosAtualizacao.banco = payload.banco?.trim() || null;
    }
    if (payload.ativo !== undefined) dadosAtualizacao.ativo = payload.ativo;
    if (payload.observacoes !== undefined) {
      dadosAtualizacao.observacoes = payload.observacoes?.trim() || null;
    }

    // 🔐 Atualizar APENAS se pertencer ao usuário
    const [contaAtualizada] = await db
      .update(contas)
      .set(dadosAtualizacao)
      .where(and(eq(contas.id, id), eq(contas.userId, userId)))
      .returning();

    // Normalizar valores
    const contaNormalizada = {
      ...contaAtualizada,
      saldoInicial: Number(contaAtualizada.saldoInicial),
      saldoAtual: Number(contaAtualizada.saldoAtual),
    };

    return NextResponse.json(contaNormalizada);
  } catch (error) {
    return respostaDeErro(error);
  }
}

// DELETE - Excluir conta definitivamente
//
// As chaves estrangeiras de transacoes, faturas e adiantamentos_fatura usam
// ON DELETE SET NULL (ver schema-conta-exclusao.sql). Por isso um único DELETE
// faz tudo de forma atômica:
//   • transações, faturas e adiantamentos ficam no histórico, sem conta vinculada
//   • extrato, aplicações (com aportes/resgates/rendimentos) e transferências
//     da conta são apagados em cascata
// Para só tirar a conta de uso mantendo tudo, use PUT { ativo: false }.
export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const userId = await getUserId();

    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { id } = await params;

    const [deleted] = await db
      .delete(contas)
      .where(and(eq(contas.id, id), eq(contas.userId, userId)))
      .returning();

    if (!deleted) {
      return NextResponse.json(
        { error: "Conta não encontrada ou acesso negado" },
        { status: 404 }
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return respostaDeErro(error);
  }
}