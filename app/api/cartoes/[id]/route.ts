import { db } from "@/db";
import { cartoes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  console.log("=== DEBUG PUT /api/cartoes/[id] ===");

  const { id } = await context.params;
  const body = await req.json();

  try {
    const cartaoAtual = await db.query.cartoes.findFirst({
      where: eq(cartoes.id, Number(id)),
    });

    if (!cartaoAtual) {
      return NextResponse.json(
        { error: "Cartão não encontrado" },
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

    await db
      .update(cartoes)
      .set(dadosAtualizacao)
      .where(eq(cartoes.id, Number(id)));

    return NextResponse.json(
      { message: "Cartão atualizado com sucesso" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Erro ao atualizar cartão:", error);
    return NextResponse.json(
      { error: "Erro interno ao atualizar cartão" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request, 
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "ID não informado." }, 
        { status: 400 }
      );
    }

    await db.delete(cartoes).where(eq(cartoes.id, Number(id)));

    return NextResponse.json({ 
      message: "Cartão deletado com sucesso." 
    });
  } catch (error) {
    console.error("Erro ao deletar cartão:", error);
    return NextResponse.json(
      { error: "Erro interno ao deletar cartão." }, 
      { status: 500 }
    );
  }
}