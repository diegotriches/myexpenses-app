// src/lib/aplicacaoEngine.ts
//
// Lógica de servidor das Aplicações: busca de taxas no BCB, recálculo
// completo (replay) de uma aplicação e execução de resgates. Usado pelo
// cron e pelas rotas de API, pra ter UM único lugar com essas regras.

import { db } from "@/db";
import {
  aplicacoes, aportesAplicacao, resgatesAplicacao, taxasDiarias,
  rendimentosAplicacao, contas, extratoConta,
} from "@/db/schema";
import { and, asc, eq, gte, lte, max, min, notInArray, sql } from "drizzle-orm";
import {
  simularAplicacao, simularResgateFifo, hojeBrt, somarDias, arredondar2,
  type ResultadoSimulacao,
} from "@/utils/aplicacaoSimulacao";
import type { Tributacao } from "@/utils/aplicacaoUtils";

// Séries SGS do Banco Central — já retornam a taxa diária em %
const SERIES_BCB = { cdi: 12, selic: 11 } as const;
type Indexador = keyof typeof SERIES_BCB;

const paraDataIso = (d: Date) => d.toISOString().split("T")[0];

function paraDataBcb(iso: string): string {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

async function buscarTaxasBcb(
  indexador: Indexador,
  inicioIso: string,
  fimIso: string
): Promise<Array<{ data: string; taxa: string }> | null> {
  try {
    const url =
      `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${SERIES_BCB[indexador]}/dados` +
      `?formato=json&dataInicial=${paraDataBcb(inicioIso)}&dataFinal=${paraDataBcb(fimIso)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) return null;

    const dados = await res.json();
    if (!Array.isArray(dados)) return null;

    return dados.map((d: { data: string; valor: string }) => {
      const [dia, mes, ano] = d.data.split("/");
      return { data: `${ano}-${mes}-${dia}`, taxa: String(d.valor) };
    });
  } catch (error) {
    console.error(`[Aplicações] Falha ao buscar taxa ${indexador} do BCB:`, error);
    return null;
  }
}

/**
 * Garante que o cache `taxas_diarias` cubra [inicio, fim]. Busca no BCB só
 * o que falta (antes do que já está em cache e/ou depois dele).
 */
export async function garantirTaxas(indexador: Indexador, inicio: string, fim: string): Promise<string> {
  const [r] = await db
    .select({ minData: min(taxasDiarias.data), maxData: max(taxasDiarias.data) })
    .from(taxasDiarias)
    .where(eq(taxasDiarias.indexador, indexador));

  const minCache = r?.minData ?? null;
  const maxCache = r?.maxData ?? null;

  const faixas: Array<[string, string]> = [];
  if (!minCache || !maxCache) {
    faixas.push([inicio, fim]);
  } else {
    // folga de 4 dias: se o início cair num fim de semana/feriado logo
    // antes do primeiro dado em cache, não há nada a buscar
    if (inicio < somarDias(minCache, -4)) faixas.push([inicio, somarDias(minCache, -1)]);
    if (maxCache < fim) faixas.push([somarDias(maxCache, 1), fim]);
  }

  if (faixas.length === 0) return "cache completo";

  let falhou = false;
  let total = 0;
  for (const [ini, fi] of faixas) {
    if (ini > fi) continue;
    const taxas = await buscarTaxasBcb(indexador, ini, fi);
    if (!taxas) { falhou = true; continue; }
    if (taxas.length > 0) {
      await db.insert(taxasDiarias)
        .values(taxas.map((t) => ({ indexador, data: t.data, taxaPercentual: t.taxa, fonte: "bcb" })))
        .onConflictDoNothing();
      total += taxas.length;
    }
  }
  return falhou ? "BCB indisponível — usou o cache" : `ok (${total} taxa(s) novas)`;
}

/**
 * Recalcula a aplicação do ZERO (todos os aportes e resgates, em ordem) e
 * grava o resultado: estado de cada lote, totais da aplicação e o
 * rendimento diário. É idempotente — rodar duas vezes dá o mesmo resultado.
 */
export async function recalcularAplicacao(aplicacaoId: string): Promise<{
  sim: ResultadoSimulacao; statusBcb: string;
} | null> {
  const [ap] = await db.select().from(aplicacoes).where(eq(aplicacoes.id, aplicacaoId)).limit(1);
  if (!ap || ap.resgatada) return null;

  const aportes = await db.select().from(aportesAplicacao)
    .where(eq(aportesAplicacao.aplicacaoId, aplicacaoId))
    .orderBy(asc(aportesAplicacao.data));
  if (aportes.length === 0) return null;

  const resgates = await db.select().from(resgatesAplicacao)
    .where(eq(resgatesAplicacao.aplicacaoId, aplicacaoId))
    .orderBy(asc(resgatesAplicacao.data));

  const hoje = hojeBrt();
  const vencIso = ap.dataVencimento ? paraDataIso(new Date(ap.dataVencimento)) : null;
  const fim = vencIso && vencIso < hoje ? vencIso : hoje;
  const inicio = aportes[0].data;

  const statusBcb = await garantirTaxas(ap.indexador as Indexador, inicio, fim);

  const taxasRows = await db.select().from(taxasDiarias)
    .where(and(
      eq(taxasDiarias.indexador, ap.indexador),
      gte(taxasDiarias.data, inicio),
      lte(taxasDiarias.data, fim),
    ))
    .orderBy(asc(taxasDiarias.data));

  const sim = simularAplicacao({
    percentual: Number(ap.percentualIndexador),
    tributacao: ap.tributacao as Tributacao,
    aportes: aportes.map((a) => ({ id: a.id, data: a.data, valor: Number(a.valor) })),
    resgates: resgates.map((r) => ({
      id: r.id, data: r.data, valorBruto: Number(r.valorBruto), total: r.tipo === "total",
    })),
    taxas: taxasRows.map((t) => ({ data: t.data, taxa: Number(t.taxaPercentual) })),
    ate: fim,
  });

  // 1. estado de cada lote
  const estadoPorId = new Map(sim.lotes.map((l) => [l.id, l]));
  for (const a of aportes) {
    const l = estadoPorId.get(a.id);
    await db.update(aportesAplicacao)
      .set({
        principalRestante: (l?.principal ?? 0).toFixed(8),
        valorAtual: (l?.valorAtual ?? 0).toFixed(8),
      })
      .where(eq(aportesAplicacao.id, a.id));
  }

  // 2. totais da aplicação
  await db.update(aplicacoes)
    .set({
      valorPrincipal: sim.principal.toFixed(2),
      valorAtual: sim.valorAtual.toFixed(8),
      updatedAt: new Date(),
    })
    .where(eq(aplicacoes.id, aplicacaoId));

  // 3. rendimento diário (upsert + remove dias que deixaram de existir)
  const linhas = sim.rendimentosDiarios.map((r) => ({
    aplicacaoId,
    data: r.data,
    valorRendimento: r.valor.toFixed(8),
    taxaAplicada: String(r.taxa),
  }));
  for (let i = 0; i < linhas.length; i += 400) {
    await db.insert(rendimentosAplicacao)
      .values(linhas.slice(i, i + 400))
      .onConflictDoUpdate({
        target: [rendimentosAplicacao.aplicacaoId, rendimentosAplicacao.data],
        set: {
          valorRendimento: sql`excluded.valor_rendimento`,
          taxaAplicada: sql`excluded.taxa_aplicada`,
        },
      });
  }
  if (linhas.length > 0) {
    await db.delete(rendimentosAplicacao).where(and(
      eq(rendimentosAplicacao.aplicacaoId, aplicacaoId),
      notInArray(rendimentosAplicacao.data, linhas.map((l) => l.data)),
    ));
  } else {
    await db.delete(rendimentosAplicacao).where(eq(rendimentosAplicacao.aplicacaoId, aplicacaoId));
  }

  // 4. resgates históricos: guarda IR/líquido calculados (os resgates reais
  // mantêm o que foi de fato creditado na conta)
  const resultadoPorResgate = new Map(sim.resgates.map((r) => [r.id, r]));
  for (const r of resgates) {
    if (!r.historico) continue;
    const s = resultadoPorResgate.get(r.id);
    if (!s) continue;
    await db.update(resgatesAplicacao)
      .set({
        impostoRetido: arredondar2(s.impostoRetido).toFixed(2),
        valorLiquido: arredondar2(s.valorLiquido).toFixed(2),
      })
      .where(eq(resgatesAplicacao.id, r.id));
  }

  return { sim, statusBcb };
}

export interface DetalheResgate {
  tipo: "parcial" | "total";
  valorBruto: number;
  rendimentoBruto: number;
  impostoRetido: number;
  valorLiquido: number;
  contaNome: string;
}

/**
 * Executa um resgate HOJE (manual, parcial/total, ou automático no
 * vencimento): calcula o IR por lote (FIFO), credita o líquido na conta,
 * registra no extrato e atualiza a aplicação.
 */
export async function executarResgate(params: {
  aplicacaoId: string;
  userId: string;
  total: boolean;
  valorBruto?: number;
  automatico?: boolean;
}): Promise<DetalheResgate> {
  const [ap] = await db.select().from(aplicacoes)
    .where(and(eq(aplicacoes.id, params.aplicacaoId), eq(aplicacoes.userId, params.userId)))
    .limit(1);
  if (!ap) throw new Error("Aplicação não encontrada");
  if (ap.resgatada) throw new Error("Esta aplicação já foi resgatada");

  const [conta] = await db.select().from(contas).where(eq(contas.id, ap.contaId)).limit(1);
  if (!conta) throw new Error("Conta não encontrada");

  // estado mais recente (com tudo que o BCB já publicou)
  const recalculo = await recalcularAplicacao(ap.id);
  if (!recalculo) throw new Error("Aplicação sem aportes");
  const lotes = recalculo.sim.lotes;

  const hoje = hojeBrt();
  const totalDisponivel = lotes.reduce((s, l) => s + l.valorAtual, 0);

  let total = params.total;
  let bruto = total ? totalDisponivel : Number(params.valorBruto);

  if (!total) {
    if (isNaN(bruto) || bruto <= 0) throw new Error("Valor de resgate inválido");
    if (bruto > totalDisponivel + 0.005) throw new Error("Valor maior que o saldo da aplicação");
    // se pediu praticamente tudo, resgata tudo (evita sobrar "poeira")
    if (totalDisponivel - bruto < 0.01) { total = true; bruto = totalDisponivel; }
  }

  const r = simularResgateFifo(lotes, bruto, hoje, ap.tributacao as Tributacao);
  const impostoRetido = arredondar2(r.impostoRetido);
  const valorLiquido = arredondar2(bruto - impostoRetido);
  const agora = new Date();

  const novoSaldo = Number(conta.saldoAtual) + valorLiquido;
  await db.update(contas)
    .set({ saldoAtual: novoSaldo.toFixed(2), updatedAt: agora })
    .where(eq(contas.id, conta.id));

  const rotulo = params.automatico ? "Resgate automático" : total ? "Resgate" : "Resgate parcial";
  await db.insert(extratoConta).values({
    userId: params.userId, contaId: conta.id,
    data: hoje, tipo: "entrada", valor: valorLiquido.toFixed(2),
    descricao: impostoRetido > 0
      ? `${rotulo} — ${ap.descricao || "Aplicação"} (IR retido: R$ ${impostoRetido.toFixed(2)})`
      : `${rotulo} — ${ap.descricao || "Aplicação"}`,
    saldoApos: novoSaldo.toFixed(2),
    origem: "RESGATE_APLICACAO", referenciaId: ap.id,
  });

  await db.insert(resgatesAplicacao).values({
    aplicacaoId: ap.id,
    data: hoje,
    valorBruto: bruto.toFixed(2),
    tipo: total ? "total" : "parcial",
    impostoRetido: impostoRetido.toFixed(2),
    valorLiquido: valorLiquido.toFixed(2),
    contaId: conta.id,
    historico: false,
  });

  if (total) {
    await db.update(aportesAplicacao)
      .set({ principalRestante: "0", valorAtual: "0" })
      .where(eq(aportesAplicacao.aplicacaoId, ap.id));

    await db.update(aplicacoes)
      .set({
        resgatada: true,
        dataResgate: agora,
        valorResgatado: valorLiquido.toFixed(2),
        impostoRetido: impostoRetido.toFixed(2),
        // valorPrincipal / valorAtual ficam com o último valor calculado
        // (é o que o histórico mostra)
        updatedAt: agora,
      })
      .where(eq(aplicacoes.id, ap.id));
  } else {
    await recalcularAplicacao(ap.id);
  }

  return {
    tipo: total ? "total" : "parcial",
    valorBruto: arredondar2(bruto),
    rendimentoBruto: arredondar2(r.rendimentoBruto),
    impostoRetido,
    valorLiquido,
    contaNome: conta.nome,
  };
}