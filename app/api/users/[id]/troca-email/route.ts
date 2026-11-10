import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { respostaDeErro } from "@/lib/rota";
import { cancelarTrocaEmail } from "@/lib/trocaEmail";
import { perfilDoUsuario } from "@/lib/perfilUsuario";

// DELETE - Desiste da troca de e-mail em aberto; o link enviado deixa de valer
export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { id } = await context.params;
    if (id !== userId) {
      return NextResponse.json(
        { error: "Você não tem permissão para editar outro usuário" },
        { status: 403 },
      );
    }

    await cancelarTrocaEmail(userId);
    return NextResponse.json(await perfilDoUsuario(userId));
  } catch (error) {
    return respostaDeErro(error, "Erro ao cancelar a troca de e-mail");
  }
}
