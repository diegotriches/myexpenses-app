import { db } from "@/db";
import { cartoes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  console.log("=== DEBUG PUT /api/cartoes/[id] ===");

  const { id } = await context.params;

  const body = await req.json();

  console.log("id:", id);
  console.log("body:", body);

  try {
    await db.update(cartoes)
      .set({
        nome: body.nome,
        tipo: body.tipo,
        bandeira: body.bandeira,
        empresa: body.empresa,
        limite: body.limite,
        diaFechamento: body.diaFechamento,
        diaVencimento: body.diaVencimento,
        cor: body.cor,
        ativo: body.ativo,
        observacoes: body.observacoes,
        ultimosDigitos: body.ultimosDigitos
      })
      .where(eq(cartoes.id, Number(id)));

    return new Response(JSON.stringify({ message: "Cartão atualizado com sucesso" }), { status: 200 });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: "Erro ao atualizar cartão" }), { status: 500 });
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: "ID não informado." }, { status: 400 });
    }

    await db.delete(cartoes).where(eq(cartoes.id, Number(id)));

    return NextResponse.json({ message: "Cartão deletado com sucesso." });
  } catch (error) {
    console.error("Erro ao deletar cartão:", error);
    return NextResponse.json({ error: "Erro interno ao deletar cartão." }, { status: 500 });
  }
}