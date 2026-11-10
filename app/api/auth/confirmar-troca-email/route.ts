import { NextResponse } from "next/server";
import { respostaDeErro } from "@/lib/rota";
import { confirmarTrocaEmail } from "@/lib/trocaEmail";

/**
 * POST /api/auth/confirmar-troca-email  { token }
 *
 * Aplica a troca pedida no perfil. É pública: o token do link prova o acesso ao
 * endereço novo, então funciona mesmo aberto em outro aparelho, sem sessão.
 * POST (e não GET) para que a pré-visualização do link no cliente de e-mail não confirme sozinha.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { token?: unknown };
    const token = typeof body.token === "string" ? body.token.trim() : "";
    if (!token) {
      return NextResponse.json({ error: "Token não informado" }, { status: 400 });
    }

    const { email } = await confirmarTrocaEmail(token);
    return NextResponse.json({ message: "E-mail alterado com sucesso!", email });
  } catch (error) {
    return respostaDeErro(error, "Erro ao confirmar a troca de e-mail. Tente novamente.");
  }
}
