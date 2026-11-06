import { NextResponse } from "next/server";
import { db } from "@/db";
import { categorias, transacoes, recorrencias } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import {
  ehCategoriaDestino,
  tiposDeMovimentacao,
  outraCategoriaCobre,
  contarUso,
  garantirCategoriaDestino,
} from "@/utils/categoriaUtils";

// GET - Buscar categoria específica
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 🔐 Autenticação
    const userId = await getUserId();

    if (!userId) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    const { id } = await params;

    // 🔐 Buscar categoria do usuário
    const [categoria] = await db
      .select()
      .from(categorias)
      .where(
        and(
          eq(categorias.id, id),
          eq(categorias.userId, userId)
        )
      )
      .limit(1);

    if (!categoria) {
      return NextResponse.json(
        { error: "Categoria não encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(categoria);
  } catch (err: any) {
    console.error("Erro ao buscar categoria:", err);

    return NextResponse.json(
      { error: err.message || "Erro ao buscar categoria" },
      { status: 500 }
    );
  }
}

// PUT - Atualizar categoria
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 🔐 Autenticação
    const userId = await getUserId();

    if (!userId) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const { nome, tipo, icone } = body;

    // Validações
    if (!nome || !tipo || !icone) {
      return NextResponse.json(
        { error: "Nome, tipo e ícone são obrigatórios" },
        { status: 400 }
      );
    }

    // Validar tipo
    if (tipo !== "entrada" && tipo !== "saida" && tipo !== "ambos") {
      return NextResponse.json(
        { error: "Tipo deve ser 'entrada', 'saida' ou 'ambos'" },
        { status: 400 }
      );
    }

    // 🔐 Atualizar APENAS se pertencer ao usuário
    const [updated] = await db
      .update(categorias)
      .set({
        nome,
        tipo,
        icone,
      })
      .where(
        and(
          eq(categorias.id, id),
          eq(categorias.userId, userId) // 🔐 Verificar ownership
        )
      )
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: "Categoria não encontrada ou acesso negado" },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("Erro ao atualizar categoria:", err);

    return NextResponse.json(
      { error: err.message || "Erro ao atualizar categoria" },
      { status: 500 }
    );
  }
}

// DELETE - Deletar categoria
//
// ✅ NOVO: antes de apagar, move as movimentações (e os modelos de
// recorrência) que usam essa categoria para "Outras despesas" ou "Outras
// receitas", conforme o tipo de cada movimentação. A categoria só é apagada
// DEPOIS de tudo movido: se algo falhar no meio, a categoria continua
// existindo e dá para tentar de novo (mover é idempotente).
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 🔐 Autenticação
    const userId = await getUserId();

    if (!userId) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    const { id } = await params;

    // 🔐 Buscar APENAS se pertencer ao usuário
    const [categoria] = await db
      .select()
      .from(categorias)
      .where(
        and(
          eq(categorias.id, id),
          eq(categorias.userId, userId) // 🔐 Verificar ownership
        )
      )
      .limit(1);

    if (!categoria) {
      return NextResponse.json(
        { error: "Categoria não encontrada ou acesso negado" },
        { status: 404 }
      );
    }

    // "Outras despesas"/"Outras receitas" são o destino das demais — não
    // dá pra excluí-las, senão as movimentações ficariam sem pra onde ir
    if (ehCategoriaDestino(categoria.nome)) {
      return NextResponse.json(
        {
          error: `A categoria "${categoria.nome}" recebe as movimentações das categorias excluídas e não pode ser removida.`,
        },
        { status: 400 }
      );
    }

    let transacoesMovidas = 0;
    let recorrenciasMovidas = 0;
    const destinos: string[] = [];

    for (const tipoMov of tiposDeMovimentacao(categoria)) {
      // Outra categoria de mesmo nome ainda cobre esse tipo: nada a mover
      if (await outraCategoriaCobre(userId, categoria, tipoMov)) continue;

      // Só cria/usa a categoria de destino se houver algo pra mover
      const uso = await contarUso(userId, categoria.nome, tipoMov);
      if (uso.transacoes === 0 && uso.recorrencias === 0) continue;

      const destino = await garantirCategoriaDestino(userId, tipoMov);
      destinos.push(destino.nome);

      const movidas = await db
        .update(transacoes)
        .set({ categoria: destino.nome, updatedAt: new Date() })
        .where(and(
          eq(transacoes.userId, userId),
          eq(transacoes.categoria, categoria.nome),
          eq(transacoes.tipo, tipoMov),
        ))
        .returning({ id: transacoes.id });
      transacoesMovidas += movidas.length;

      // Os modelos de recorrência também: senão as transações geradas daqui
      // pra frente nasceriam com uma categoria que não existe mais
      const recMovidas = await db
        .update(recorrencias)
        .set({ categoria: destino.nome, updatedAt: new Date() })
        .where(and(
          eq(recorrencias.userId, userId),
          eq(recorrencias.categoria, categoria.nome),
          eq(recorrencias.tipo, tipoMov),
        ))
        .returning({ id: recorrencias.id });
      recorrenciasMovidas += recMovidas.length;
    }

    // 🔐 Só agora apaga a categoria
    await db
      .delete(categorias)
      .where(
        and(
          eq(categorias.id, id),
          eq(categorias.userId, userId) // 🔐 Verificar ownership
        )
      );

    return NextResponse.json({
      message: "Categoria removida com sucesso",
      transacoesMovidas,
      recorrenciasMovidas,
      destinos,
    });
  } catch (err: any) {
    console.error("Erro ao deletar categoria:", err);

    return NextResponse.json(
      { error: err.message || "Erro ao deletar categoria" },
      { status: 500 }
    );
  }
}