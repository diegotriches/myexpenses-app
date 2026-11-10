import { sql } from "drizzle-orm";
import { extratoConta } from "@/db/schema";

/**
 * Saldo histórico da conta, calculado na leitura.
 *
 * A coluna `saldo_apos` só registra o saldo no momento em que a linha foi
 * gravada: lançamento com data passada, edição e exclusão não refazem as
 * linhas posteriores. Por isso extrato e gráficos derivam o saldo das próprias
 * linhas, ancorado no saldo atual da conta (que toda movimentação mantém):
 *
 *   saldo após a linha L = saldoAtual − soma das linhas posteriores a L
 *
 * "Posterior" segue a ordem de exibição do extrato: data, criação e id.
 */

/** Valor da linha com sinal: entrada soma, saída subtrai. */
export const valorAssinado = sql<string>`case when ${extratoConta.tipo} = 'entrada' then ${extratoConta.valor} else -${extratoConta.valor} end`;

/** Soma acumulada das linhas da conta até a linha atual, na ordem do extrato (usar em subconsulta filtrada pela conta). */
export const acumuladoNaConta = sql<string>`sum(${valorAssinado}) over (order by ${extratoConta.data}, ${extratoConta.createdAt}, ${extratoConta.id})`;

export const centavos = (valor: number) => Math.round(valor * 100) / 100;

/** Saldo depois de uma linha, a partir do acumulado até ela e da soma de todas as linhas da conta. */
export function saldoAposLinha(saldoAtual: number, totalDaConta: number, acumuladoAteLinha: number): number {
  return centavos(saldoAtual - (totalDaConta - acumuladoAteLinha));
}
