import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { getUserId } from "@/lib/auth";
import { ErroHttp } from "@/lib/erroHttp";

export { ErroHttp };

const MENSAGEM_PADRAO = "Não foi possível concluir a operação. Tente novamente.";

/**
 * Resposta de erro no formato único `{ error }`.
 * `ErroHttp` (inclui `ErroFinanceiro`) e validação Zod chegam ao usuário como estão;
 * o resto fica só no log do servidor, e o cliente recebe a mensagem padrão da rota.
 */
export function respostaDeErro(erro: unknown, mensagemPadrao: string = MENSAGEM_PADRAO): NextResponse {
  if (erro instanceof ErroHttp) {
    return NextResponse.json({ error: erro.message }, { status: erro.status });
  }
  if (erro instanceof ZodError) {
    return NextResponse.json({ error: erro.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
  }
  console.error(mensagemPadrao, erro);
  return NextResponse.json({ error: mensagemPadrao }, { status: 500 });
}

export function naoAutenticado(): NextResponse {
  return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
}

type ContextoRota<P> = { params: Promise<P> };

/**
 * Envolve um handler autenticado: responde 401 sem sessão, resolve `params`
 * e converte qualquer exceção com `respostaDeErro`. Uso em rota nova:
 *
 *   export const GET = rota(async (req, { userId, params }) => { ... }, "Erro ao carregar X");
 */
export function rota<P = Record<string, never>>(
  handler: (req: NextRequest, contexto: { userId: string; params: P }) => Promise<Response>,
  mensagemPadrao?: string,
) {
  return async (req: NextRequest, contexto: ContextoRota<P>): Promise<Response> => {
    try {
      const userId = await getUserId();
      if (!userId) return naoAutenticado();
      const params = contexto?.params ? await contexto.params : ({} as P);
      return await handler(req, { userId, params });
    } catch (erro) {
      return respostaDeErro(erro, mensagemPadrao);
    }
  };
}
