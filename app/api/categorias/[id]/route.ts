import { db } from "@/db";
import { categorias } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  const id = Number(params.id);

  try {
    const { nome, tipo, icon } = await req.json();

    if (!nome || !tipo || !icon) {
      return new Response(
        JSON.stringify({ erro: "Nome, tipo e ícone são obrigatórios" }),
        { status: 400 }
      );
    }

    const updated = await db
      .update(categorias)
      .set({ nome, tipo, icon })
      .where(eq(categorias.id, id))
      .returning();

    if (updated.length === 0) {
      return new Response(JSON.stringify({ erro: "Categoria não encontrada" }), {
        status: 404,
      });
    }

    return Response.json(updated[0]);
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
    });
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const id = Number(params.id);

    if (Number.isNaN(id)) {
      return new Response(
        JSON.stringify({ erro: "ID inválido" }),
        { status: 400 }
      );
    }

    const deleted = await db
      .delete(categorias)
      .where(eq(categorias.id, id))
      .returning();

    if (deleted.length === 0) {
      return new Response(
        JSON.stringify({ erro: "Categoria não encontrada" }),
        { status: 404 }
      );
    }

    return Response.json({ mensagem: "Categoria removida com sucesso" });
  } catch (err: any) {
    console.error("DELETE /categorias/[id] ERROR:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
    });
  }
}