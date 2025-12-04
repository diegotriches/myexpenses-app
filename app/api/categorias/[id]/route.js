import { db } from "@/db/db";
import { categorias } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(req, { params }) {
  try {
    const { id } = params;
    const { nome, tipo } = await req.json();

    const updated = await db
      .update(categorias)
      .set({ nome, tipo })
      .where(eq(categorias.id, Number(id)))
      .returning();

    if (!updated.length) {
      return Response.json({ error: "Categoria não encontrada" }, { status: 404 });
    }

    return Response.json(updated[0]);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const { id } = params;

    const deleted = await db
      .delete(categorias)
      .where(eq(categorias.id, Number(id)))
      .returning();

    if (!deleted.length) {
      return Response.json({ error: "Categoria não encontrada" }, { status: 404 });
    }

    return Response.json({ sucesso: true, id: Number(id) });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
