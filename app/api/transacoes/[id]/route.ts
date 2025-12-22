import { NextResponse } from "next/server";
import { db } from "@/db";
import { transacoes } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const json = await req.json();
    const { modoEdicao } = json;

    // EDIÇÃO DE UMA ÚNICA TRANSAÇÃO
    if (modoEdicao === "unica") {
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
        .where(eq(transacoes.id, id))
        .returning();

      return NextResponse.json(updated);
    }

    // EDIÇÃO DE TODAS AS PARCELAS
    if (modoEdicao === "todas_parcelas") {
      const transacoesParceladas = await db
        .select()
        .from(transacoes)
        .where(eq(transacoes.parcelamentoId, json.parcelamentoId));

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
          .where(eq(transacoes.id, t.id))
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
    return NextResponse.json(
      { error: error.message ?? "Erro ao atualizar transação" },
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
    if (!id)
      return NextResponse.json({ error: "ID inválido." }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const tipo = searchParams.get("tipo");
    const tiposPermitidos = ["unica", "todas_parcelas", "toda_recorrencia"];

    if (tipo && !tiposPermitidos.includes(tipo))
      return NextResponse.json({ error: "Tipo inválido." }, { status: 400 });

    const [mov] = await db.select().from(transacoes).where(eq(transacoes.id, id)).limit(1);
    if (!mov) return NextResponse.json({ error: "Transação não encontrada" }, { status: 404 });

    // Bloqueio de transferência
    if (mov.transferenciaId)
      return NextResponse.json(
        { error: "Esta transação faz parte de uma transferência. Use exclusão de transferências." },
        { status: 400 }
      );

    if (!tipo || tipo === "unica") {
      await db.delete(transacoes).where(eq(transacoes.id, id));
    } else if (tipo === "todas_parcelas" && mov.parcelamentoId) {
      await db.delete(transacoes).where(eq(transacoes.parcelamentoId, mov.parcelamentoId));
    } else if (tipo === "toda_recorrencia" && mov.recorrenciaId) {
      await db.delete(transacoes).where(eq(transacoes.recorrenciaId, mov.recorrenciaId));
    }

    return NextResponse.json({ sucesso: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro desconhecido" },
      { status: 500 }
    );
  }
}