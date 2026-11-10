import crypto from "crypto";
import { and, eq, gt, like, ne } from "drizzle-orm";
import { db } from "@/db";
import { users, verificationTokens } from "@/db/schema";
import { ErroHttp } from "@/lib/erroHttp";
import { sendEmailChangedNotice, sendEmailChangeConfirmation } from "@/lib/email";

/**
 * Troca de e-mail em duas etapas: o e-mail atual continua valendo até o dono
 * do endereço novo clicar no link. O pedido fica em `verification_tokens`, com
 * `identifier` prefixado para não se misturar aos tokens de cadastro
 * (que usam o próprio e-mail como `identifier`).
 */
const PREFIXO = "troca-email:";
const VALIDADE_MS = 24 * 60 * 60 * 1000;

const identificador = (userId: string, email: string) => `${PREFIXO}${userId}:${email}`;
const prefixoDoUsuario = (userId: string) => `${PREFIXO}${userId}:%`;

export const ehTokenDeTrocaEmail = (identifier: string) => identifier.startsWith(PREFIXO);

/** `troca-email:<userId>:<email>`; o id do usuário é um uuid, sem ":" */
function lerIdentificador(identifier: string): { userId: string; email: string } | null {
  if (!ehTokenDeTrocaEmail(identifier)) return null;
  const resto = identifier.slice(PREFIXO.length);
  const separador = resto.indexOf(":");
  if (separador <= 0) return null;
  return { userId: resto.slice(0, separador), email: resto.slice(separador + 1) };
}

async function emailEmUsoPorOutro(email: string, userId: string) {
  const [existente] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.email, email), ne(users.id, userId)))
    .limit(1);
  return !!existente;
}

/** E-mail aguardando confirmação, se houver pedido válido. */
export async function emailPendente(userId: string): Promise<string | null> {
  const [pedido] = await db
    .select({ identifier: verificationTokens.identifier })
    .from(verificationTokens)
    .where(and(like(verificationTokens.identifier, prefixoDoUsuario(userId)), gt(verificationTokens.expires, new Date())))
    .limit(1);
  return pedido ? lerIdentificador(pedido.identifier)?.email ?? null : null;
}

/** Cancela qualquer pedido de troca em aberto do usuário. */
export async function cancelarTrocaEmail(userId: string) {
  await db.delete(verificationTokens).where(like(verificationTokens.identifier, prefixoDoUsuario(userId)));
}

/**
 * Registra o pedido e envia o link para o endereço novo. Um pedido novo substitui o anterior.
 * Recusa e-mail já usado por outra conta e desfaz o pedido se o envio falhar.
 */
export async function solicitarTrocaEmail(userId: string, nome: string, novoEmail: string) {
  if (await emailEmUsoPorOutro(novoEmail, userId)) {
    throw new ErroHttp("Este e-mail já está em uso", 409);
  }

  const token = crypto.randomBytes(32).toString("hex");
  await cancelarTrocaEmail(userId);
  await db.insert(verificationTokens).values({
    identifier: identificador(userId, novoEmail),
    token,
    expires: new Date(Date.now() + VALIDADE_MS),
  });

  try {
    await sendEmailChangeConfirmation(novoEmail, nome, token);
  } catch (erro) {
    await cancelarTrocaEmail(userId);
    console.error("[troca de e-mail] falha ao enviar a confirmação:", erro);
    throw new ErroHttp("Não foi possível enviar o e-mail de confirmação. Tente novamente.", 502);
  }
}

/**
 * Aplica a troca do link. O e-mail novo já fica verificado, pois o link provou o acesso a ele.
 * O endereço antigo recebe um aviso, para o dono perceber uma troca que não fez.
 */
export async function confirmarTrocaEmail(token: string): Promise<{ email: string }> {
  const [registro] = await db
    .select()
    .from(verificationTokens)
    .where(and(eq(verificationTokens.token, token), like(verificationTokens.identifier, `${PREFIXO}%`)))
    .limit(1);

  const pedido = registro ? lerIdentificador(registro.identifier) : null;
  if (!registro || !pedido) {
    throw new ErroHttp("Link inválido ou já utilizado. Peça a troca de e-mail novamente no seu perfil.", 400);
  }
  if (new Date() > new Date(registro.expires)) {
    await db.delete(verificationTokens).where(eq(verificationTokens.token, token));
    throw new ErroHttp("Este link expirou. Peça a troca de e-mail novamente no seu perfil.", 400);
  }

  const anterior = await db.transaction(async (tx) => {
    const [usuario] = await tx
      .select({ email: users.email, name: users.name })
      .from(users)
      .where(eq(users.id, pedido.userId))
      .limit(1)
      .for("update");
    if (!usuario) throw new ErroHttp("Usuário não encontrado", 404);

    // Outra conta pode ter usado o endereço depois do pedido
    const [ocupado] = await tx
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, pedido.email), ne(users.id, pedido.userId)))
      .limit(1);
    if (ocupado) throw new ErroHttp("Este e-mail passou a ser usado por outra conta.", 409);

    await tx.update(users).set({ email: pedido.email, emailVerified: new Date() }).where(eq(users.id, pedido.userId));
    await tx.delete(verificationTokens).where(like(verificationTokens.identifier, prefixoDoUsuario(pedido.userId)));
    return usuario;
  });

  if (anterior.email !== pedido.email) {
    try {
      await sendEmailChangedNotice(anterior.email, anterior.name || "Usuário", pedido.email);
    } catch (erro) {
      // A troca já foi feita; o aviso é só uma cortesia
      console.error("[troca de e-mail] falha ao avisar o endereço antigo:", erro);
    }
  }

  return { email: pedido.email };
}
