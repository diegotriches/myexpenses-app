import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { respostaDeErro } from "@/lib/rota";
import { perfilDoUsuario } from "@/lib/perfilUsuario";

export async function GET() {
  try {
    const userId = await getUserId();

    if (!userId) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    const perfil = await perfilDoUsuario(userId);

    if (!perfil) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(perfil);
  } catch (error) {
    return respostaDeErro(error, "Erro ao buscar usuário");
  }
}