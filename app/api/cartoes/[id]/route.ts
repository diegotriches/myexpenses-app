import { NextResponse } from "next/server";
import { db } from "@/db";
import { cartoes } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getUserIdFromSession } from "@/lib/auth/helpers";

// GET - Buscar cartão específico
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromSession();
    const { id } = await params;

    const [cartao] = await db
      .select()
      .from(cartoes)
      .where(
        and(
          eq(cartoes.id, parseInt(id)),
          eq(cartoes.userId, userId)
        )
      )
      .limit(1);

    if (!cartao) {
      return NextResponse.json(
        { error: "Cartão não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(cartao);
  } catch (error) {
    console.error("Erro ao buscar cartão:", error);

    if (error instanceof Error && error.message === "Não autenticado") {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Erro ao buscar cartão" },
      { status: 500 }
    );
  }
}

// PUT - Atualizar cartão
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromSession();
    const { id } = await params;
    const body = await req.json();

    // 🔐 Verificar se o cartão pertence ao usuário
    const cartaoAtual = await db.query.cartoes.findFirst({
      where: and(
        eq(cartoes.id, Number(id)),
        eq(cartoes.userId, userId) // 🔐 Adicionar
      ),
    });

    if (!cartaoAtual) {
      return NextResponse.json(
        { error: "Cartão não encontrado ou acesso negado" },
        { status: 404 }
      );
    }

    const tipo = body.tipo ?? cartaoAtual.tipo;

    let novoLimite = cartaoAtual.limite ?? 0;
    let novoLimiteDisponivel = cartaoAtual.limiteDisponivel ?? 0;

    // Regra para cartão de crédito
    if (tipo === "credito") {
      if (body.limite !== undefined) {
        const limiteNum = Number(body.limite);

        if (isNaN(limiteNum) || limiteNum < 0) {
          return NextResponse.json(
            { error: "Limite inválido" },
            { status: 400 }
          );
        }

        const limiteAnterior = cartaoAtual.limite ?? 0;
        const diferenca = limiteNum - limiteAnterior;

        novoLimite = limiteNum;
        novoLimiteDisponivel = Math.max(
          novoLimiteDisponivel + diferenca,
          0
        );
      }
    } else {
      // Cartão débito não possui limite
      novoLimite = 0;
      novoLimiteDisponivel = 0;
    }

    // Validação da conta vinculada
    if (body.contaVinculadaId !== undefined) {
      if (body.contaVinculadaId !== null && typeof body.contaVinculadaId !== "string") {
        return NextResponse.json(
          { error: "Conta vinculada inválida" },
          { status: 400 }
        );
      }
    }

    const dadosAtualizacao = {
      ...(body.nome !== undefined && { nome: body.nome }),
      ...(body.tipo !== undefined && { tipo: body.tipo }),
      ...(body.bandeira !== undefined && { bandeira: body.bandeira }),
      ...(body.empresa !== undefined && { empresa: body.empresa }),

      limite: novoLimite,
      limiteDisponivel: novoLimiteDisponivel,

      ...(body.diaFechamento !== undefined && {
        diaFechamento: Number(body.diaFechamento),
      }),

      ...(body.diaVencimento !== undefined && {
        diaVencimento: Number(body.diaVencimento),
      }),

      ...(body.ativo !== undefined && { ativo: body.ativo }),
      ...(body.observacoes !== undefined && {
        observacoes: body.observacoes,
      }),

      ...(body.ultimosDigitos !== undefined && {
        ultimosDigitos: Number(body.ultimosDigitos),
      }),

      ...(body.contaVinculadaId !== undefined && {
        contaVinculadaId: body.contaVinculadaId,
      }),
    };

    // 🔐 Atualizar apenas se pertencer ao usuário
    await db
      .update(cartoes)
      .set(dadosAtualizacao)
      .where(
        and(
          eq(cartoes.id, Number(id)),
          eq(cartoes.userId, userId) // 🔐 Adicionar
        )
      );

    return NextResponse.json(
      { message: "Cartão atualizado com sucesso" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Erro ao atualizar cartão:", error);

    if (error instanceof Error && error.message === "Não autenticado") {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Erro interno ao atualizar cartão" },
      { status: 500 }
    );
  }
}

// DELETE - Deletar cartão
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromSession();
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "ID não informado." },
        { status: 400 }
      );
    }

    // 🔐 Deletar apenas se pertencer ao usuário
    const deleted = await db
      .delete(cartoes)
      .where(
        and(
          eq(cartoes.id, Number(id)),
          eq(cartoes.userId, userId) // 🔐 Adicionar
        )
      )
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json(
        { error: "Cartão não encontrado ou acesso negado" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Cartão deletado com sucesso."
    });
  } catch (error) {
    console.error("Erro ao deletar cartão:", error);

    if (error instanceof Error && error.message === "Não autenticado") {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Erro interno ao deletar cartão." },
      { status: 500 }
    );
  }
}