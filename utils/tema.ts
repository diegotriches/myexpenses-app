// Alternância rápida de tema (botão do menu e da página inicial).
//
// Alternar sempre gravava "claro" ou "escuro" fixo: um clique bastava para o
// app deixar de acompanhar o sistema, e só a página Ajustes devolvia o modo
// "Sistema". Agora, quando o tema de destino é o mesmo do sistema, o app volta
// a seguir o sistema em vez de fixá-lo.

export type Tema = "light" | "dark" | "system";
type TemaVisivel = "light" | "dark";

const ehVisivel = (t: string | undefined): t is TemaVisivel => t === "light" || t === "dark";

/** Tema a gravar ao clicar em alternar, a partir do tema na tela e do tema do sistema. */
export function proximoTema(resolvido: string | undefined, sistema: string | undefined): Tema {
  const destino: TemaVisivel = resolvido === "dark" ? "light" : "dark";
  return ehVisivel(sistema) && destino === sistema ? "system" : destino;
}

/** Texto do botão para o tema que o clique vai aplicar. */
export function rotuloAlternarTema(resolvido: string | undefined, sistema: string | undefined): string {
  const proximo = proximoTema(resolvido, sistema);
  if (proximo === "system") return "Seguir o tema do sistema";
  return proximo === "dark" ? "Modo escuro" : "Modo claro";
}
