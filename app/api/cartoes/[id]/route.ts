// app/api/cartoes/[id]/route.ts
import { calcularLimiteDisponivel } from "@/lib/limiteCartao";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { cartoes, contas } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import { respostaDeErro } from "@/lib/rota";

// GET - Buscar cartão específico
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();

    if (!userId) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

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

    const limiteDisponivel = await calcularLimiteDisponivel(db, cartao, userId);
    return NextResponse.json({ ...cartao, limiteDisponivel: limiteDisponivel.toFixed(2) });
  } catch (error) {
    return respostaDeErro(error);
  }
}

// PUT - Atualizar cartão
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();

    if (!userId) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await req.json();

    const cartaoAtual = await db.query.cartoes.findFirst({
      where: and(
        eq(cartoes.id, Number(id)),
        eq(cartoes.userId, userId)
      ),
    });

    if (!cartaoAtual) {
      return NextResponse.json(
        { error: "Cartão não encontrado ou acesso negado" },
        { status: 404 }
      );
    }

    const tipo = body.tipo ?? cartaoAtual.tipo;

    if (tipo === "debito") {
      const contaVinculadaId = body.contaVinculadaId ?? cartaoAtual.contaVinculadaId;

      if (!contaVinculadaId) {
        return NextResponse.json(
          { error: "Cartão de débito precisa estar vinculado a uma conta" },
          { status: 400 }
        );
      }

      const [contaVinculada] = await db
        .select()
        .from(contas)
        .where(
          and(
            eq(contas.id, contaVinculadaId),
            eq(contas.userId, userId)
          )
        )
        .limit(1);

      if (!contaVinculada) {
        return NextResponse.json(
          { error: "Conta vinculada não encontrada" },
          { status: 404 }
        );
      }

      if (!contaVinculada.ativo) {
        return NextResponse.json(
          { error: "A conta vinculada está inativa" },
          { status: 400 }
        );
      }
    }

    if (body.contaVinculadaId && body.contaVinculadaId !== cartaoAtual.contaVinculadaId) {
      const [contaVinculada] = await db
        .select()
        .from(contas)
        .where(
          and(
            eq(contas.id, body.contaVinculadaId),
            eq(contas.userId, userId)
          )
        )
        .limit(1);

      if (!contaVinculada) {
        return NextResponse.json(
          { error: "Conta vinculada não encontrada" },
          { status: 404 }
        );
      }

      if (!contaVinculada.ativo) {
        return NextResponse.json(
          { error: "A conta vinculada está inativa" },
          { status: 400 }
        );
      }
    }

    let novoLimite = Number(cartaoAtual.limite ?? 0);
    let novoLimiteDisponivel = Number(cartaoAtual.limiteDisponivel ?? 0);

    if (tipo === "credito") {
      if (body.limite !== undefined) {
        const limiteNum = typeof body.limite === "string"
          ? parseFloat(body.limite)
          : Number(body.limite);

        if (isNaN(limiteNum) || limiteNum < 0) {
          return NextResponse.json(
            { error: "Limite inválido" },
            { status: 400 }
          );
        }

        const limiteAnterior = Number(cartaoAtual.limite ?? 0);
        const diferenca = limiteNum - limiteAnterior;

        novoLimite = limiteNum;
        novoLimiteDisponivel = Math.max(novoLimiteDisponivel + diferenca, 0);
      }
    } else {
      novoLimite = 0;
      novoLimiteDisponivel = 0;
    }

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

      limite: novoLimite.toFixed(2),
      limiteDisponivel: novoLimiteDisponivel.toFixed(2),

      ...(body.diaFechamento !== undefined && {
        diaFechamento: tipo === "credito" ? Number(body.diaFechamento) : null,
      }),

      ...(body.diaVencimento !== undefined && {
        diaVencimento: tipo === "credito" ? Number(body.diaVencimento) : null,
      }),

      ...(body.ativo !== undefined && { ativo: body.ativo }),
      ...(body.observacoes !== undefined && { observacoes: body.observacoes }),
      ...(body.ultimosDigitos !== undefined && {
        ultimosDigitos: Number(body.ultimosDigitos),
      }),
      ...(body.contaVinculadaId !== undefined && {
        contaVinculadaId: body.contaVinculadaId,
      }),
    };

    if (tipo === "debito" && cartaoAtual.tipo === "credito") {
      dadosAtualizacao.limite = "0";
      dadosAtualizacao.limiteDisponivel = "0";
      dadosAtualizacao.diaFechamento = null;
      dadosAtualizacao.diaVencimento = null;
    }

    await db
      .update(cartoes)
      .set(dadosAtualizacao)
      .where(
        and(
          eq(cartoes.id, Number(id)),
          eq(cartoes.userId, userId)
        )
      );

    return NextResponse.json(
      { message: "Cartão atualizado com sucesso" },
      { status: 200 }
    );
  } catch (error) {
    return respostaDeErro(error);
  }
}

// DELETE - Deletar cartão
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();

    if (!userId) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "ID não informado." },
        { status: 400 }
      );
    }

    const deleted = await db
      .delete(cartoes)
      .where(
        and(
          eq(cartoes.id, Number(id)),
          eq(cartoes.userId, userId)
        )
      )
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json(
        { error: "Cartão não encontrado ou acesso negado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Cartão deletado com sucesso." });

  } catch (error: any) {
    // Constraint de FK — cartão tem movimentações vinculadas
    const isConstraintError =
      error?.code === "23503" ||
      error?.message?.includes("foreign key") ||
      error?.message?.includes("violates foreign key constraint") ||
      error?.message?.includes("constraint");

    if (isConstraintError) {
      return NextResponse.json(
        {
          error: "Este cartão possui movimentações e não pode ser excluído.",
          code: "HAS_TRANSACTIONS",
        },
        { status: 409 }
      );
    }

    return respostaDeErro(error, "Erro ao excluir cartão.");
  }
}