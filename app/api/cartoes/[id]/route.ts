import { NextResponse } from "next/server";
import { db } from "@/db";
import { cartoes } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getUserId } from "@/lib/auth";

// GET - Buscar cartão específico
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();

    // ✅ VALIDAÇÃO: Retorna 401 se não autenticado
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

    return NextResponse.json(cartao);
  } catch (error) {
    console.error("Erro ao buscar cartão:", error);
    const message = error instanceof Error ? error.message : "Erro ao buscar cartão";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT - Atualizar cartão
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();

    // ✅ VALIDAÇÃO: Retorna 401 se não autenticado
    if (!userId) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await req.json();

    // 🔐 Verificar se o cartão pertence ao usuário
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

    // ✅ CORRIGIDO: Converter string para number
    let novoLimite = Number(cartaoAtual.limite ?? 0);
    let novoLimiteDisponivel = Number(cartaoAtual.limiteDisponivel ?? 0);

    // Regra para cartão de crédito
    if (tipo === "credito") {
      if (body.limite !== undefined) {
        // ✅ CORRIGIDO: Aceitar string ou number
        const limiteNum = typeof body.limite === "string" 
          ? parseFloat(body.limite) 
          : Number(body.limite);

        if (isNaN(limiteNum) || limiteNum < 0) {
          return NextResponse.json(
            { error: "Limite inválido" },
            { status: 400 }
          );
        }

        // ✅ CORRIGIDO: Usar valores já convertidos para number
        const limiteAnterior = Number(cartaoAtual.limite ?? 0);
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

      // ✅ CORRIGIDO: Converter para string com 2 casas decimais
      limite: novoLimite.toFixed(2),
      limiteDisponivel: novoLimiteDisponivel.toFixed(2),

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
          eq(cartoes.userId, userId)
        )
      );

    return NextResponse.json(
      { message: "Cartão atualizado com sucesso" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Erro ao atualizar cartão:", error);
    const message = error instanceof Error ? error.message : "Erro interno ao atualizar cartão";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE - Deletar cartão
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();

    // ✅ VALIDAÇÃO: Retorna 401 se não autenticado
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

    // 🔐 Deletar apenas se pertencer ao usuário
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

    return NextResponse.json({
      message: "Cartão deletado com sucesso."
    });
  } catch (error) {
    console.error("Erro ao deletar cartão:", error);
    const message = error instanceof Error ? error.message : "Erro interno ao deletar cartão.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}