// lib/garantirDono.ts
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { cartoes, contas, estabelecimentos } from "@/db/schema";

interface Referencias {
  contaId?: string | null;
  cartaoId?: string | number | null;
  estabelecimentoId?: string | null;
}

/**
 * Confere se os ids vindos do cliente pertencem ao usuário.
 * Devolve a mensagem de erro (para responder 404) ou null se estiver tudo certo.
 * Ids vazios são ignorados: cada rota decide o que é obrigatório.
 */
export async function garantirDono(userId: string, refs: Referencias): Promise<string | null> {
  if (refs.contaId) {
    const [conta] = await db.select({ id: contas.id }).from(contas)
      .where(and(eq(contas.id, refs.contaId), eq(contas.userId, userId))).limit(1);
    if (!conta) return "Conta não encontrada";
  }

  if (refs.cartaoId) {
    const cartaoId = Number(refs.cartaoId);
    if (!Number.isInteger(cartaoId)) return "Cartão não encontrado";
    const [cartao] = await db.select({ id: cartoes.id }).from(cartoes)
      .where(and(eq(cartoes.id, cartaoId), eq(cartoes.userId, userId))).limit(1);
    if (!cartao) return "Cartão não encontrado";
  }

  if (refs.estabelecimentoId) {
    const [estabelecimento] = await db.select({ id: estabelecimentos.id }).from(estabelecimentos)
      .where(and(eq(estabelecimentos.id, refs.estabelecimentoId), eq(estabelecimentos.userId, userId))).limit(1);
    if (!estabelecimento) return "Estabelecimento não encontrado";
  }

  return null;
}
