import { db } from "@/db";
import { categorias } from "@/db/schema";

export async function GET() {
  try {
    const rows = await db.select().from(categorias);
    return Response.json(rows);
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
    });
  }
}

export async function POST(req: Request) {
  try {
    const { nome, tipo, icon } = await req.json();

    if (!nome || !tipo || !icon) {
      return new Response(
        JSON.stringify({
          erro: "Nome, tipo e ícone são obrigatórios",
        }),
        { status: 400 }
      );
    }

    const inserted = await db
      .insert(categorias)
      .values({ nome, tipo, icon })
      .returning();

    return Response.json(inserted[0]);
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
    });
  }
}