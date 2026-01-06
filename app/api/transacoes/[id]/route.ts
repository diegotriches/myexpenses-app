import { NextResponse } from "next/server";
import { db } from "@/db";
import { transacoes } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getUserIdFromSession } from "@/lib/auth/helpers";

// PUT - Atualizar transação
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 🔐 Autenticação
    const userId = await getUserIdFromSession();
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const json = await req.json();
    const { modoEdicao } = json;

    // EDIÇÃO DE UMA ÚNICA TRANSAÇÃO
    if (modoEdicao === "unica") {
      // 🔐 Verificar ownership antes de atualizar
      const [transacaoExistente] = await db
        .select()
        .from(transacoes)
        .where(
          and(
            eq(transacoes.id, id),
            eq(transacoes.userId, userId)
          )
        )
        .limit(1);

      if (!transacaoExistente) {
        return NextResponse.json(
          { error: "Transação não encontrada ou acesso negado" },
          { status: 404 }
        );
      }

      // Atualizar
      const [updated] = await db
        .update(transacoes)
        .set({
          tipo: json.tipo,
          descricao: json.descricao,
          valor: String(json.valor),
          data: json.data,
          categoria: json.categoria,
          contaId: json.contaId,
          formaPagamento: json.formaPagamento,
          cartaoId: json.formaPagamento === "cartao" ? json.cartaoId : null,
        })
        .where(
          and(
            eq(transacoes.id, id),
            eq(transacoes.userId, userId) // 🔐 Garantir ownership
          )
        )
        .returning();

      return NextResponse.json(updated);
    }

    // EDIÇÃO DE TODAS AS PARCELAS
    if (modoEdicao === "todas_parcelas") {
      if (!json.parcelamentoId) {
        return NextResponse.json(
          { error: "parcelamentoId é obrigatório" },
          { status: 400 }
        );
      }

      // 🔐 Buscar parcelas do usuário
      const transacoesParceladas = await db
        .select()
        .from(transacoes)
        .where(
          and(
            eq(transacoes.parcelamentoId, json.parcelamentoId),
            eq(transacoes.userId, userId) // 🔐 Filtrar por userId
          )
        );

      if (!transacoesParceladas.length) {
        return NextResponse.json(
          { error: "Parcelamento não encontrado" },
          { status: 404 }
        );
      }

      const valorParcela = Number(json.valor) / json.parcelas;

      const atualizadas = [];

      for (const t of transacoesParceladas) {
        const [updated] = await db
          .update(transacoes)
          .set({
            tipo: json.tipo,
            descricao: json.descricao,
            valor: String(valorParcela),
            categoria: json.categoria,
            contaId: json.contaId,
            formaPagamento: json.formaPagamento,
            cartaoId:
              json.formaPagamento === "cartao" ? json.cartaoId : null,

            parcelado: true,
            parcelas: json.parcelas,
            parcelaAtual: t.parcelaAtual,
            parcelamentoId: json.parcelamentoId,
          })
          .where(
            and(
              eq(transacoes.id, t.id),
              eq(transacoes.userId, userId) // 🔐 Garantir ownership
            )
          )
          .returning();

        if (updated) atualizadas.push(updated);
      }

      return NextResponse.json(atualizadas);
    }

    // FALLBACK
    return NextResponse.json(
      { error: "Modo de edição inválido" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Erro ao atualizar transação:", error);

    if (error instanceof Error && error.message === "Não autenticado") {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: error.message ?? "Erro ao atualizar transação" },
      { status: 500 }
    );
  }
}

// DELETE - Deletar transação
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 🔐 Autenticação
    const userId = await getUserIdFromSession();
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "ID inválido." }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const tipo = searchParams.get("tipo");
    const tiposPermitidos = ["unica", "todas_parcelas", "toda_recorrencia"];

    if (tipo && !tiposPermitidos.includes(tipo)) {
      return NextResponse.json({ error: "Tipo inválido." }, { status: 400 });
    }

    // 🔐 Buscar transação e verificar ownership
    const [mov] = await db
      .select()
      .from(transacoes)
      .where(
        and(
          eq(transacoes.id, id),
          eq(transacoes.userId, userId) // 🔐 Verificar ownership
        )
      )
      .limit(1);

    if (!mov) {
      return NextResponse.json(
        { error: "Transação não encontrada ou acesso negado" },
        { status: 404 }
      );
    }

    // Bloqueio de transferência
    if (mov.transferenciaId) {
      return NextResponse.json(
        { error: "Esta transação faz parte de uma transferência. Use exclusão de transferências." },
        { status: 400 }
      );
    }

    // Deletar conforme o tipo
    if (!tipo || tipo === "unica") {
      await db
        .delete(transacoes)
        .where(
          and(
            eq(transacoes.id, id),
            eq(transacoes.userId, userId) // 🔐 Garantir ownership
          )
        );
    } else if (tipo === "todas_parcelas" && mov.parcelamentoId) {
      await db
        .delete(transacoes)
        .where(
          and(
            eq(transacoes.parcelamentoId, mov.parcelamentoId),
            eq(transacoes.userId, userId) // 🔐 Garantir ownership
          )
        );
    } else if (tipo === "toda_recorrencia" && mov.recorrenciaId) {
      await db
        .delete(transacoes)
        .where(
          and(
            eq(transacoes.recorrenciaId, mov.recorrenciaId),
            eq(transacoes.userId, userId) // 🔐 Garantir ownership
          )
        );
    }

    return NextResponse.json({ sucesso: true });
  } catch (err: any) {
    console.error("Erro ao deletar transação:", err);

    if (err instanceof Error && err.message === "Não autenticado") {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro desconhecido" },
      { status: 500 }
    );
  }
}