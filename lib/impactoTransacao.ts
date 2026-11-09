// lib/impactoTransacao.ts
//
// Efeito financeiro de uma transação: conta (dinheiro/PIX), conta vinculada
// (débito) ou fatura + limite (crédito). Criar, editar, excluir e converter
// passam por aqui, para aplicar e reverter serem sempre simétricos.

import { and, eq, or, sql } from "drizzle-orm";
import {
  adiantamentosFatura,
  antecipacoesParcela,
  cartoes,
  extratoConta,
  faturas,
  transacoes,
} from "@/db/schema";
import { calcularFaturaDaTransacao } from "@/utils/faturaUtils";
import { alterarSaldo, movimentarConta, type TransacaoBanco } from "@/lib/movimentacaoConta";

type Transacao = typeof transacoes.$inferSelect;
type Fatura = typeof faturas.$inferSelect;
type CamposImpacto = Pick<Transacao, "tipo" | "valor" | "data" | "formaPagamento" | "contaId" | "cartaoId">;

const diaIso = (data: Date | string) => new Date(data).toISOString().slice(0, 10);

async function buscarCartao(tx: TransacaoBanco, userId: string, cartaoId: number) {
  const [cartao] = await tx
    .select()
    .from(cartoes)
    .where(and(eq(cartoes.id, cartaoId), eq(cartoes.userId, userId)))
    .limit(1)
    .for("update");
  return cartao;
}

async function buscarFaturaDoMes(tx: TransacaoBanco, userId: string, cartaoId: number, mes: number, ano: number) {
  const [fatura] = await tx
    .select()
    .from(faturas)
    .where(and(eq(faturas.cartaoId, cartaoId), eq(faturas.userId, userId), eq(faturas.mes, mes), eq(faturas.ano, ano)))
    .limit(1)
    .for("update");
  return fatura;
}

/**
 * Grava o novo total da fatura. Só a apaga se ficou zerada e nada depende dela:
 * apagar levaria junto, em cascata, adiantamentos e antecipações já lançados.
 */
export async function ajustarTotalFatura(
  tx: TransacaoBanco,
  fatura: Fatura,
  novoTotal: number,
  novoLimiteExtra: number = Number(fatura.limiteExtraAoPagar ?? 0),
) {
  if (novoTotal <= 0 && novoLimiteExtra <= 0 && !fatura.paga) {
    const adiantamentos = await tx.$count(adiantamentosFatura, eq(adiantamentosFatura.faturaId, fatura.id));
    const antecipacoes = await tx.$count(antecipacoesParcela, eq(antecipacoesParcela.faturaAtualId, fatura.id));
    if (adiantamentos === 0 && antecipacoes === 0) {
      await tx.delete(faturas).where(eq(faturas.id, fatura.id));
      return;
    }
  }

  await tx
    .update(faturas)
    .set({
      total: Math.max(0, novoTotal).toFixed(2),
      limiteExtraAoPagar: novoLimiteExtra.toFixed(2),
      updatedAt: new Date(),
    })
    .where(eq(faturas.id, fatura.id));
}

export async function aplicarImpacto(tx: TransacaoBanco, t: Transacao, userId: string) {
  const valor = Number(t.valor);

  if (t.cartaoId && t.formaPagamento === "cartao") {
    const cartao = await buscarCartao(tx, userId, t.cartaoId);
    if (!cartao) return;

    if (cartao.tipo === "debito" && cartao.contaVinculadaId) {
      await movimentarConta(tx, {
        userId,
        contaId: cartao.contaVinculadaId,
        tipo: "saida",
        valor,
        data: diaIso(t.data),
        descricao: t.descricao || `Compra no débito - ${cartao.nome}`,
        origem: "TRANSACAO_MANUAL",
        referenciaId: t.id,
      });
    } else if (cartao.tipo === "credito") {
      const { mes, ano } = calcularFaturaDaTransacao(new Date(t.data), cartao.diaFechamento || 1);
      const fatura = await buscarFaturaDoMes(tx, userId, t.cartaoId, mes, ano);

      if (fatura) {
        await tx
          .update(faturas)
          .set({ total: (Number(fatura.total) + valor).toFixed(2), updatedAt: new Date() })
          .where(eq(faturas.id, fatura.id));
      } else {
        await tx.insert(faturas).values({ userId, cartaoId: t.cartaoId, mes, ano, total: valor.toFixed(2), paga: false });
      }

      await tx
        .update(cartoes)
        .set({ limiteDisponivel: sql`CAST(${cartoes.limiteDisponivel} AS NUMERIC) - ${valor}` })
        .where(eq(cartoes.id, t.cartaoId));
    }
    return;
  }

  if (t.contaId) {
    await movimentarConta(tx, {
      userId,
      contaId: t.contaId,
      tipo: t.tipo === "entrada" ? "entrada" : "saida",
      valor,
      data: diaIso(t.data),
      descricao: t.descricao || "Transação manual",
      origem: "TRANSACAO_MANUAL",
      referenciaId: t.id,
    });
  }
}

export async function reverterImpacto(tx: TransacaoBanco, t: Transacao, userId: string) {
  const valor = Number(t.valor);

  if (t.cartaoId && t.formaPagamento === "cartao") {
    const cartao = await buscarCartao(tx, userId, t.cartaoId);
    if (cartao?.tipo === "debito" && cartao.contaVinculadaId) {
      await alterarSaldo(tx, userId, cartao.contaVinculadaId, valor);
    } else if (cartao?.tipo === "credito") {
      const { mes, ano } = calcularFaturaDaTransacao(new Date(t.data), cartao.diaFechamento || 1);
      const fatura = await buscarFaturaDoMes(tx, userId, t.cartaoId, mes, ano);
      if (fatura) await ajustarTotalFatura(tx, fatura, Number(fatura.total) - valor);

      await tx
        .update(cartoes)
        .set({ limiteDisponivel: sql`CAST(${cartoes.limiteDisponivel} AS NUMERIC) + ${valor}` })
        .where(eq(cartoes.id, t.cartaoId));
    }
  } else if (t.contaId) {
    await alterarSaldo(tx, userId, t.contaId, t.tipo === "entrada" ? -valor : valor);
  }

  await tx
    .delete(extratoConta)
    .where(and(eq(extratoConta.referenciaId, t.id), eq(extratoConta.userId, userId)));
}

/** Indica se a edição altera dinheiro; mudar só descrição ou categoria não altera. */
export function mudaImpacto(antiga: CamposImpacto, nova: CamposImpacto): boolean {
  if (antiga.tipo !== nova.tipo || antiga.formaPagamento !== nova.formaPagamento) return true;
  if (Number(antiga.valor).toFixed(2) !== Number(nova.valor).toFixed(2)) return true;
  if (diaIso(antiga.data) !== diaIso(nova.data)) return true;
  return nova.formaPagamento === "cartao"
    ? Number(antiga.cartaoId ?? 0) !== Number(nova.cartaoId ?? 0)
    : (antiga.contaId ?? null) !== (nova.contaId ?? null);
}

/** Reverte a versão antiga e aplica a nova; sem mudança de valor, só atualiza o texto do extrato. */
export async function atualizarImpacto(tx: TransacaoBanco, antiga: Transacao, nova: Transacao, userId: string) {
  if (mudaImpacto(antiga, nova)) {
    await reverterImpacto(tx, antiga, userId);
    await aplicarImpacto(tx, nova, userId);
    return;
  }

  if (nova.descricao) {
    await tx
      .update(extratoConta)
      .set({ descricao: nova.descricao })
      .where(and(eq(extratoConta.referenciaId, nova.id), eq(extratoConta.userId, userId)));
  }
}

export async function transacaoEmFaturaPaga(
  tx: TransacaoBanco,
  userId: string,
  t: Pick<Transacao, "formaPagamento" | "cartaoId" | "data">,
): Promise<boolean> {
  if (t.formaPagamento !== "cartao" || !t.cartaoId) return false;

  const [cartao] = await tx
    .select({ tipo: cartoes.tipo, diaFechamento: cartoes.diaFechamento })
    .from(cartoes)
    .where(and(eq(cartoes.id, t.cartaoId), eq(cartoes.userId, userId)))
    .limit(1);
  if (!cartao || cartao.tipo !== "credito") return false;

  const { mes, ano } = calcularFaturaDaTransacao(new Date(t.data), cartao.diaFechamento || 1);
  const [fatura] = await tx
    .select({ paga: faturas.paga })
    .from(faturas)
    .where(and(eq(faturas.cartaoId, t.cartaoId), eq(faturas.userId, userId), eq(faturas.mes, mes), eq(faturas.ano, ano)))
    .limit(1);

  return fatura?.paga === true;
}

/** Antecipação ainda desfazível (fatura não paga) que envolve a transação ou o seu parcelamento. */
export async function buscarAntecipacaoBloqueante(
  tx: TransacaoBanco,
  userId: string,
  t: { id: string; parcelamentoId: string | null },
) {
  const condicoes = [eq(antecipacoesParcela.transacaoSinteticaId, t.id)];
  if (t.parcelamentoId) condicoes.push(eq(antecipacoesParcela.parcelamentoId, t.parcelamentoId));

  const candidatas = await tx
    .select()
    .from(antecipacoesParcela)
    .where(and(eq(antecipacoesParcela.userId, userId), or(...condicoes)));

  for (const antecipacao of candidatas) {
    const [fatura] = await tx
      .select({ paga: faturas.paga })
      .from(faturas)
      .where(eq(faturas.id, antecipacao.faturaAtualId))
      .limit(1);
    if (fatura && !fatura.paga) return antecipacao;
  }
  return null;
}
