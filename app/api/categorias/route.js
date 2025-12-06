import { db } from "@/db";
import { categorias } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const rows = await db.select().from(categorias);
    return Response.json(rows);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { nome, tipo } = await req.json();

    if (!nome || !tipo) {
      return Response.json({ erro: "Nome e tipo são obrigatórios" }, { status: 400 });
    }

    const inserted = await db
      .insert(categorias)
      .values({ nome, tipo })
      .returning();

    return Response.json(inserted[0]);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
