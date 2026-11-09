/**
 * Erro com mensagem destinada ao usuário e status HTTP.
 * Rotas devolvem a mensagem como está; qualquer outro erro vira mensagem genérica (ver `respostaDeErro`).
 */
export class ErroHttp extends Error {
  constructor(mensagem: string, readonly status: number = 400) {
    super(mensagem);
    this.name = "ErroHttp";
  }
}
