/** Texto de um erro capturado em `catch` (o valor é `unknown`: pode não ser um Error). */
export function textoDoErro(erro: unknown, padrao = "Erro desconhecido"): string {
  if (erro instanceof Error && erro.message) return erro.message;
  if (typeof erro === "string" && erro) return erro;
  return padrao;
}

/** Código do erro do Postgres (ex.: "23503" para FK), inclusive quando o Drizzle o embrulha em `cause`. */
export function codigoDoErro(erro: unknown): string | undefined {
  for (let atual = erro, i = 0; atual && typeof atual === "object" && i < 3; i++) {
    if ("code" in atual && typeof atual.code === "string") return atual.code;
    atual = "cause" in atual ? atual.cause : undefined;
  }
  return undefined;
}
