// lib/limiteCartao.ts
//
// Fonte única do limite do cartão: limite total menos as faturas não pagas.
// A coluna cartoes.limite_disponivel continua sendo gravada, mas não é mais lida.

import { and, eq, sum } from "drizzle-orm";
import { db } from "@/db";
import { faturas } from "@/db/schema";
import type { TransacaoBanco } from "@/lib/movimentacaoConta";

type Leitor = Pick<typeof db | TransacaoBanco, "select">;

interface CartaoLimite {
  id: number;
  tipo: string;
  limite: string | number | null;
}

export async function calcularLimiteUsado(leitor: Leitor, cartaoId: number, userId: string): Promise<number> {
  const [resultado] = await leitor
    .select({ total: sum(faturas.total) })
    .from(faturas)
    .where(and(eq(faturas.cartaoId, cartaoId), eq(faturas.userId, userId), eq(faturas.paga, false)));
  return Number(resultado?.total ?? 0);
}

/** Pode ser negativo (recorrências não bloqueiam por limite); as telas limitam a zero. */
export async function calcularLimiteDisponivel(leitor: Leitor, cartao: CartaoLimite, userId: string): Promise<number> {
  const limite = Number(cartao.limite ?? 0);
  if (cartao.tipo !== "credito") return limite;
  const usado = await calcularLimiteUsado(leitor, cartao.id, userId);
  return Math.round((limite - usado) * 100) / 100;
}
