/** Erro devolvido pela API: a mensagem vem do corpo da resposta, e o status permite tratar casos como 403. */
export class ErroApi extends Error {
  readonly status: number;

  constructor(mensagem: string, status: number) {
    super(mensagem);
    this.name = "ErroApi";
    this.status = status;
  }
}

/**
 * Faz a requisição e devolve o JSON da resposta.
 * Resposta de erro vira `ErroApi` com o `error` (ou `message`) do corpo; falha de rede segue como erro comum,
 * o que permite à tela distinguir "a API recusou" de "sem conexão".
 */
export async function requisicao<T>(url: string, init: RequestInit | undefined, mensagemPadrao: string): Promise<T> {
  const res = await fetch(url, init);
  const corpo: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const { error, message } = (corpo ?? {}) as { error?: unknown; message?: unknown };
    const mensagem = typeof error === "string" ? error : typeof message === "string" ? message : mensagemPadrao;
    throw new ErroApi(mensagem, res.status);
  }
  return corpo as T;
}

export function comJson(method: "POST" | "PUT" | "PATCH" | "DELETE", corpo: unknown): RequestInit {
  return { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) };
}

/** Mensagem do erro da API, ou a mensagem informada quando a falha foi de rede ou inesperada. */
export function mensagemDoErro(erro: unknown, mensagemSemConexao: string): string {
  return erro instanceof ErroApi ? erro.message : mensagemSemConexao;
}
