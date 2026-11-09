// lib/movimentacaoConta.ts
//
// Único caminho para alterar o saldo de uma conta. Sempre dentro de uma
// transação: trava a linha da conta, de modo que operações simultâneas
// esperem a anterior, e grava saldo e extrato juntos.

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { contas, extratoConta } from "@/db/schema";
import { ErroHttp } from "@/lib/erroHttp";

export type TransacaoBanco = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type LeitorBanco = Pick<typeof db | TransacaoBanco, "select">;

type OrigemExtrato = (typeof extratoConta.$inferInsert)["origem"];

/** Erro de regra de negócio: desfaz a transação e vira resposta HTTP na rota. */
export class ErroFinanceiro extends ErroHttp {}

const centavos = (n: number) => Math.round(n * 100) / 100;

/**
 * Aplica um delta ao saldo, sem extrato (reversões apagam a linha original).
 * Devolve null se a conta não existir mais.
 */
export async function alterarSaldo(tx: TransacaoBanco, userId: string, contaId: string, delta: number) {
  const [conta] = await tx
    .select()
    .from(contas)
    .where(and(eq(contas.id, contaId), eq(contas.userId, userId)))
    .limit(1)
    .for("update");

  if (!conta) return null;

  const saldoApos = centavos(Number(conta.saldoAtual) + delta);
  await tx
    .update(contas)
    .set({ saldoAtual: saldoApos.toFixed(2), updatedAt: new Date() })
    .where(eq(contas.id, contaId));

  return { conta, saldoApos };
}

interface Movimentacao {
  userId: string;
  contaId: string;
  tipo: "entrada" | "saida";
  valor: number;
  data: string; // YYYY-MM-DD
  descricao: string;
  origem: OrigemExtrato;
  referenciaId: string | null;
  /** Quando informada, recusa a operação se o saldo ficaria negativo. */
  mensagemSaldoInsuficiente?: string;
}

export async function movimentarConta(tx: TransacaoBanco, m: Movimentacao) {
  const resultado = await alterarSaldo(tx, m.userId, m.contaId, m.tipo === "entrada" ? m.valor : -m.valor);
  if (!resultado) throw new ErroFinanceiro("Conta não encontrada", 404);

  if (m.mensagemSaldoInsuficiente && resultado.saldoApos < 0) {
    throw new ErroFinanceiro(m.mensagemSaldoInsuficiente);
  }

  await tx.insert(extratoConta).values({
    userId: m.userId,
    contaId: m.contaId,
    data: m.data,
    tipo: m.tipo,
    valor: m.valor.toFixed(2),
    descricao: m.descricao,
    saldoApos: resultado.saldoApos.toFixed(2),
    origem: m.origem,
    referenciaId: m.referenciaId,
  });

  return resultado;
}
