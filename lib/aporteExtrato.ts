// lib/aporteExtrato.ts
//
// Lançamento de um aporte de aplicação no extrato da conta. O lançamento não
// guarda o id do aporte (o referenciaId é o da aplicação), então ele é achado
// por conta + origem APLICACAO + aplicação + data + valor. Dois aportes iguais
// no mesmo dia têm lançamentos iguais, e qualquer um serve.
//
// Usado por: descontar/desfazer desconto, editar e excluir aporte e excluir
// aplicação. Sempre dentro de db.transaction.

import { and, eq, gte } from "drizzle-orm";
import { aportesAplicacao, contas, extratoConta, resgatesAplicacao } from "@/db/schema";
import { alterarSaldo, ErroFinanceiro, type LeitorBanco, type TransacaoBanco } from "@/lib/movimentacaoConta";

interface AporteNoExtrato {
  userId: string;
  aplicacaoId: string;
  contaId: string;
  data: string; // AAAA-MM-DD
  valor: number;
}

const fmtData = (iso: string) => iso.split("-").reverse().join("/");

/**
 * Desfaz o lançamento de um aporte que saiu da conta: devolve o valor ao saldo
 * e apaga a linha do extrato. Devolve a descrição da linha (para relançar com o
 * mesmo texto). Conta que não existe mais: nada a devolver (null).
 */
export async function desfazerLancamentoAporte(tx: TransacaoBanco, a: AporteNoExtrato): Promise<string | null> {
  const [conta] = await tx.select({ id: contas.id }).from(contas)
    .where(and(eq(contas.id, a.contaId), eq(contas.userId, a.userId))).limit(1);
  if (!conta) return null;

  const [lancamento] = await tx.select({ id: extratoConta.id, descricao: extratoConta.descricao }).from(extratoConta)
    .where(and(
      eq(extratoConta.userId, a.userId),
      eq(extratoConta.contaId, a.contaId),
      eq(extratoConta.origem, "APLICACAO"),
      eq(extratoConta.referenciaId, a.aplicacaoId),
      eq(extratoConta.data, a.data),
      eq(extratoConta.valor, a.valor.toFixed(2)),
    ))
    .limit(1);
  if (!lancamento)
    throw new ErroFinanceiro(`Não encontrei no extrato da conta o lançamento do aporte de ${fmtData(a.data)}`, 409);

  await alterarSaldo(tx, a.userId, a.contaId, a.valor);
  await tx.delete(extratoConta).where(eq(extratoConta.id, lancamento.id));
  return lancamento.descricao;
}

/**
 * Há resgate na data do aporte ou depois? Esse resgate já creditou na conta um
 * valor e um IR calculados com os aportes que existiam; mudar ou tirar o aporte
 * deixaria o resgate em desacordo com o que entrou na conta.
 */
export async function temResgateDesde(db: LeitorBanco, aplicacaoId: string, data: string): Promise<boolean> {
  const [r] = await db.select({ id: resgatesAplicacao.id }).from(resgatesAplicacao)
    .where(and(eq(resgatesAplicacao.aplicacaoId, aplicacaoId), gte(resgatesAplicacao.data, data)))
    .limit(1);
  return !!r;
}

/** Data do primeiro aporte (vira a data da aplicação depois de editar ou excluir aporte) */
export async function dataPrimeiroAporte(db: LeitorBanco, aplicacaoId: string): Promise<string | null> {
  const lista = await db.select({ data: aportesAplicacao.data }).from(aportesAplicacao)
    .where(eq(aportesAplicacao.aplicacaoId, aplicacaoId));
  return lista.reduce<string | null>((min, x) => (min === null || x.data < min ? x.data : min), null);
}
