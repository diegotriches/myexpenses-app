import { and, eq, gte, lt, sum } from "drizzle-orm";
import { db } from "@/db";
import { adiantamentosFatura, cartoes, faturas, transacoes } from "@/db/schema";
import { calcularPeriodoFatura, faturaEstaFechada, valorNaFatura } from "@/utils/faturaUtils";
import { proximaFaturaNaoPaga } from "@/lib/estornoTransacao";
import { hojeBrt } from "@/utils/aplicacaoSimulacao";

/**
 * Crédito de fatura (total negativo, por estorno maior que as compras do ciclo).
 *
 * Quando a fatura fecha com crédito, o crédito passa para a próxima fatura não
 * paga: os estornos da fatura, do mais recente ao mais antigo, são redatados
 * para o início do ciclo de destino até zerar a de origem. Estorno maior que o
 * que falta é dividido em dois, como no próprio lançamento do estorno, então a
 * soma estornada de cada compra não muda. A fatura de origem, zerada, é
 * encerrada como paga, sem conta de pagamento.
 */

export interface ResultadoMigracao {
  faturaId: number;
  cartaoId: number;
  origem: string; // MM/AAAA
  destino: string;
  centavosMovidos: number;
  encerrada: boolean;
}

const paraCentavos = (valor: string | number) => Math.round(Number(valor) * 100);
const mesSeguinte = (mes: number, ano: number) => (mes === 12 ? { mes: 1, ano: ano + 1 } : { mes: mes + 1, ano });
const rotulo = (mes: number, ano: number) => `${String(mes).padStart(2, "0")}/${ano}`;

/** Migra o crédito de uma fatura, se ela estiver fechada, não paga e com crédito. Devolve null quando não há o que fazer. */
export async function migrarCreditoDaFatura(faturaId: number): Promise<ResultadoMigracao | null> {
  return db.transaction(async (tx) => {
    const [fatura] = await tx.select().from(faturas).where(eq(faturas.id, faturaId)).limit(1).for("update");
    if (!fatura || fatura.paga) return null;

    const [cartao] = await tx
      .select()
      .from(cartoes)
      .where(and(eq(cartoes.id, fatura.cartaoId), eq(cartoes.userId, fatura.userId)))
      .limit(1);
    if (!cartao || cartao.tipo !== "credito") return null;

    const diaFechamento = cartao.diaFechamento || 1;
    if (!faturaEstaFechada(fatura.mes, fatura.ano, diaFechamento)) return null;

    // Saldo real do ciclo, pelas transações (o total gravado pode estar defasado)
    const { inicio, fim } = calcularPeriodoFatura(fatura.mes, fatura.ano, diaFechamento);
    const doCiclo = await tx
      .select()
      .from(transacoes)
      .where(and(
        eq(transacoes.cartaoId, cartao.id),
        eq(transacoes.userId, fatura.userId),
        gte(transacoes.data, inicio),
        lt(transacoes.data, fim),
      ));
    const [adiantado] = await tx
      .select({ total: sum(adiantamentosFatura.valor) })
      .from(adiantamentosFatura)
      .where(and(eq(adiantamentosFatura.faturaId, fatura.id), eq(adiantamentosFatura.userId, fatura.userId)));

    const saldo = doCiclo.reduce((s, t) => s + paraCentavos(valorNaFatura(t)), 0) - paraCentavos(adiantado?.total ?? 0);
    if (saldo >= 0) return null;
    const credito = -saldo;

    const depois = mesSeguinte(fatura.mes, fatura.ano);
    const destino = await proximaFaturaNaoPaga(
      tx, fatura.userId, cartao.id, depois.mes, depois.ano,
      "Não foi encontrada uma fatura em aberto para receber o crédito.",
    );
    const inicioDestino = calcularPeriodoFatura(destino.mes, destino.ano, diaFechamento).inicio;

    // Estornos do mais recente ao mais antigo
    const estornos = doCiclo
      .filter((t) => t.tipo === "estorno")
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime() || b.id.localeCompare(a.id));

    let falta = credito;
    for (const e of estornos) {
      if (falta <= 0) break;
      const valor = paraCentavos(e.valor);
      if (valor <= falta) {
        await tx.update(transacoes).set({ data: inicioDestino, updatedAt: new Date() }).where(eq(transacoes.id, e.id));
        falta -= valor;
        continue;
      }
      // Divide: fica na origem o que as compras do ciclo absorvem; o resto vai para o destino
      await tx.update(transacoes).set({ valor: ((valor - falta) / 100).toFixed(2), updatedAt: new Date() }).where(eq(transacoes.id, e.id));
      await tx.insert(transacoes).values({
        userId: e.userId,
        tipo: "estorno",
        valor: (falta / 100).toFixed(2),
        data: inicioDestino,
        descricao: e.descricao,
        categoria: e.categoria,
        formaPagamento: "cartao",
        contaId: null,
        cartaoId: e.cartaoId,
        estabelecimentoId: e.estabelecimentoId,
        estornoDeId: e.estornoDeId,
        parcelado: false,
        recorrente: false,
      });
      falta = 0;
    }

    const movido = credito - falta;
    if (movido === 0) return null;

    // Origem: o saldo sobe pelo que saiu; zerada, é encerrada
    const saldoOrigem = saldo + movido;
    const encerrada = saldoOrigem === 0;
    await tx
      .update(faturas)
      .set({
        total: (saldoOrigem / 100).toFixed(2),
        ...(encerrada && { paga: true, dataPagamento: hojeBrt(), contaPagamentoId: null }),
        updatedAt: new Date(),
      })
      .where(eq(faturas.id, fatura.id));

    // Destino: o crédito abate o total (ou abre a fatura já com crédito)
    const [alvo] = await tx
      .select()
      .from(faturas)
      .where(and(
        eq(faturas.cartaoId, cartao.id),
        eq(faturas.userId, fatura.userId),
        eq(faturas.mes, destino.mes),
        eq(faturas.ano, destino.ano),
      ))
      .limit(1)
      .for("update");
    if (alvo) {
      await tx
        .update(faturas)
        .set({ total: ((paraCentavos(alvo.total) - movido) / 100).toFixed(2), updatedAt: new Date() })
        .where(eq(faturas.id, alvo.id));
    } else {
      await tx.insert(faturas).values({
        userId: fatura.userId,
        cartaoId: cartao.id,
        mes: destino.mes,
        ano: destino.ano,
        total: (-movido / 100).toFixed(2),
        paga: false,
      });
    }

    return {
      faturaId: fatura.id,
      cartaoId: cartao.id,
      origem: rotulo(fatura.mes, fatura.ano),
      destino: rotulo(destino.mes, destino.ano),
      centavosMovidos: movido,
      encerrada,
    };
  });
}

/** Percorre as faturas não pagas com total negativo e migra o crédito das que já fecharam. */
export async function migrarCreditosDeFaturas() {
  const candidatas = await db
    .select({ id: faturas.id })
    .from(faturas)
    .where(and(eq(faturas.paga, false), lt(faturas.total, "0")));

  const migradas: ResultadoMigracao[] = [];
  const erros: { faturaId: number; motivo: string }[] = [];
  for (const { id } of candidatas) {
    try {
      const resultado = await migrarCreditoDaFatura(id);
      if (resultado) migradas.push(resultado);
    } catch (erro) {
      erros.push({ faturaId: id, motivo: erro instanceof Error ? erro.message : String(erro) });
    }
  }
  return { verificadas: candidatas.length, migradas, erros };
}
