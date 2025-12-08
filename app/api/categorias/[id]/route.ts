import { db } from "@/db";
import { categorias } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
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
      .where(eq(categorias.id, Number(params.id)))
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
  context: { params: { id: string } }
) {
  console.log("DEBUG: context =", context);
  console.log("DEBUG: params =", context?.params);
  console.log("DEBUG: id =", context?.params?.id);

  return new Response(
    JSON.stringify({
      debugParams: context?.params,
      idRecebido: context?.params?.id,
      idConvertido: Number(context?.params?.id),
    }),
    { status: 200 }
  );
}
