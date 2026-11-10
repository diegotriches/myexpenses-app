// lib/estornoTransacao.ts
//
// Estorno de compra no cartão de crédito: um crédito vinculado à compra, que
// reduz a fatura sem passar pela conta. O efeito na fatura e no limite fica em
// lib/impactoTransacao.ts, junto com os demais lançamentos.

import { and, eq, inArray } from "drizzle-orm";
import { cartoes, faturas, transacoes } from "@/db/schema";
import { calcularFaturaDaTransacao, calcularPeriodoFatura } from "@/utils/faturaUtils";
import { ErroFinanceiro, type LeitorBanco, type TransacaoBanco } from "@/lib/movimentacaoConta";
import {
  aplicarImpacto,
  buscarAntecipacaoBloqueante,
  possuiEstorno,
  reverterImpacto,
  transacaoEmFaturaPaga,
} from "@/lib/impactoTransacao";
import { formatarMoeda } from "@/utils/formatadores";

type Transacao = typeof transacoes.$inferSelect;
type Cartao = typeof cartoes.$inferSelect;

export interface LancamentoEstorno {
  mes: number;
  ano: number;
  centavos: number;
  data: string; // YYYY-MM-DD
}

export interface ContextoEstorno {
  compra: Transacao;
  cartao: Cartao;
  grupo: Transacao[]; // as parcelas da compra, ou só ela
  parcelado: boolean;
  estornadoPorId: Map<string, number>; // centavos já estornados de cada parcela
  centavosCompra: number; // desta linha: em parcelada, o valor da parcela
  centavosEstornados: number;
  centavosDisponiveis: number;
}

const paraCentavos = (valor: string | number) => Math.round(Number(valor) * 100);
const diaIso = (data: Date | string) => new Date(data).toISOString().slice(0, 10);
const mesSeguinte = (mes: number, ano: number) => (mes === 12 ? { mes: 1, ano: ano + 1 } : { mes: mes + 1, ano });

async function buscarFatura(leitor: LeitorBanco, userId: string, cartaoId: number, mes: number, ano: number) {
  const [fatura] = await leitor
    .select()
    .from(faturas)
    .where(and(eq(faturas.cartaoId, cartaoId), eq(faturas.userId, userId), eq(faturas.mes, mes), eq(faturas.ano, ano)))
    .limit(1);
  return fatura;
}

/** A fatura do mês informado ou, se estiver paga, a próxima não paga (também usada pelas recorrências). */
export async function proximaFaturaNaoPaga(
  leitor: LeitorBanco,
  userId: string,
  cartaoId: number,
  mes: number,
  ano: number,
  mensagemSemFatura = "Não foi encontrada uma fatura em aberto para lançar o estorno.",
) {
  let atual = { mes, ano };
  for (let i = 0; i < 36; i++) {
    const fatura = await buscarFatura(leitor, userId, cartaoId, atual.mes, atual.ano);
    if (!fatura?.paga) return { ...atual, fatura };
    atual = mesSeguinte(atual.mes, atual.ano);
  }
  throw new ErroFinanceiro(mensagemSemFatura);
}

/**
 * Define em quais faturas o estorno entra: a da data ou, se estiver paga, a
 * próxima aberta. O que passar do total da fatura vira crédito na seguinte.
 * A fatura é definida pela data do lançamento, por isso um valor movido de
 * fatura fica datado no início do ciclo de destino.
 */
export async function planejarLancamentos(
  leitor: LeitorBanco,
  userId: string,
  cartao: Cartao,
  centavos: number,
  data: string,
): Promise<LancamentoEstorno[]> {
  const diaFechamento = cartao.diaFechamento || 1;
  const inicioDoCiclo = (mes: number, ano: number) =>
    calcularPeriodoFatura(mes, ano, diaFechamento).inicio.toISOString().slice(0, 10);

  const daData = calcularFaturaDaTransacao(data, diaFechamento);
  const alvo = await proximaFaturaNaoPaga(leitor, userId, cartao.id, daData.mes, daData.ano);
  const movida = alvo.mes !== daData.mes || alvo.ano !== daData.ano;
  const dataAlvo = movida ? inicioDoCiclo(alvo.mes, alvo.ano) : data;

  const capacidade = alvo.fatura ? Math.max(0, paraCentavos(alvo.fatura.total)) : 0;
  if (capacidade === 0 || centavos <= capacidade) {
    return [{ mes: alvo.mes, ano: alvo.ano, centavos, data: dataAlvo }];
  }

  const depois = mesSeguinte(alvo.mes, alvo.ano);
  const seguinte = await proximaFaturaNaoPaga(leitor, userId, cartao.id, depois.mes, depois.ano);
  return [
    { mes: alvo.mes, ano: alvo.ano, centavos: capacidade, data: dataAlvo },
    { mes: seguinte.mes, ano: seguinte.ano, centavos: centavos - capacidade, data: inicioDoCiclo(seguinte.mes, seguinte.ano) },
  ];
}

export async function carregarContexto(
  leitor: LeitorBanco,
  userId: string,
  compraId: string,
): Promise<ContextoEstorno> {
  const [compra] = await leitor
    .select()
    .from(transacoes)
    .where(and(eq(transacoes.id, compraId), eq(transacoes.userId, userId)))
    .limit(1);
  if (!compra) throw new ErroFinanceiro("Compra não encontrada", 404);

  if (compra.tipo !== "saida" || compra.formaPagamento !== "cartao" || !compra.cartaoId) {
    throw new ErroFinanceiro("Só compras no cartão de crédito podem ser estornadas.");
  }

  const [cartao] = await leitor
    .select()
    .from(cartoes)
    .where(and(eq(cartoes.id, compra.cartaoId), eq(cartoes.userId, userId)))
    .limit(1);
  if (!cartao || cartao.tipo !== "credito") {
    throw new ErroFinanceiro("Só compras no cartão de crédito podem ser estornadas.");
  }

  const parcelado = !!compra.parcelado && !!compra.parcelamentoId;
  const grupo = parcelado
    ? await leitor.select().from(transacoes)
        .where(and(eq(transacoes.parcelamentoId, compra.parcelamentoId!), eq(transacoes.userId, userId)))
    : [compra];

  const estornos = await leitor
    .select({ estornoDeId: transacoes.estornoDeId, valor: transacoes.valor })
    .from(transacoes)
    .where(and(eq(transacoes.userId, userId), inArray(transacoes.estornoDeId, grupo.map((t) => t.id))));

  const estornadoPorId = new Map<string, number>();
  for (const e of estornos) {
    if (e.estornoDeId) estornadoPorId.set(e.estornoDeId, (estornadoPorId.get(e.estornoDeId) ?? 0) + paraCentavos(e.valor));
  }

  const centavosCompra = paraCentavos(compra.valor);
  const centavosEstornados = estornadoPorId.get(compra.id) ?? 0;

  return {
    compra,
    cartao,
    grupo,
    parcelado,
    estornadoPorId,
    centavosCompra,
    centavosEstornados,
    centavosDisponiveis: Math.max(0, centavosCompra - centavosEstornados),
  };
}

/** O que ainda falta estornar de cada parcela já paga. */
export function restantesDasPagas(pagas: Transacao[], estornadoPorId: Map<string, number>) {
  return pagas
    .map((parcela) => ({ parcela, centavos: Math.max(0, paraCentavos(parcela.valor) - (estornadoPorId.get(parcela.id) ?? 0)) }))
    .filter((r) => r.centavos > 0);
}

/** Para a prévia e o cancelamento: separa as parcelas já quitadas das demais. */
export async function separarParcelas(leitor: LeitorBanco, userId: string, grupo: Transacao[]) {
  const pagas: Transacao[] = [];
  const emAberto: Transacao[] = [];
  for (const parcela of grupo) {
    (await transacaoEmFaturaPaga(leitor, userId, parcela) ? pagas : emAberto).push(parcela);
  }
  return { pagas, emAberto };
}

/** Ids das linhas 100% estornadas; cada parcela é avaliada por si. */
export async function comprasTotalmenteEstornadas(
  leitor: LeitorBanco,
  userId: string,
  lista: Pick<Transacao, "id" | "tipo" | "valor">[],
): Promise<Set<string>> {
  const compras = lista.filter((t) => t.tipo === "saida");
  if (!compras.length) return new Set();

  const estornos = await leitor
    .select({ estornoDeId: transacoes.estornoDeId, valor: transacoes.valor })
    .from(transacoes)
    .where(and(eq(transacoes.userId, userId), inArray(transacoes.estornoDeId, compras.map((t) => t.id))));

  const estornado = new Map<string, number>();
  for (const e of estornos) {
    if (e.estornoDeId) estornado.set(e.estornoDeId, (estornado.get(e.estornoDeId) ?? 0) + paraCentavos(e.valor));
  }

  return new Set(compras.filter((t) => (estornado.get(t.id) ?? 0) >= paraCentavos(t.valor)).map((t) => t.id));
}

interface DadosEstorno {
  compra: Transacao;
  cartao: Cartao;
  centavos: number;
  data: string;
  motivo: string | null;
  userId: string;
}

async function lancarEstorno(tx: TransacaoBanco, d: DadosEstorno) {
  // Identifica a origem: com várias parcelas estornadas, o nome sozinho não distingue as linhas
  const origem = calcularFaturaDaTransacao(new Date(d.compra.data), d.cartao.diaFechamento || 1);
  const parcela = d.compra.parcelado ? ` · parcela ${d.compra.parcelaAtual}/${d.compra.parcelas}` : "";
  const detalhe = `${parcela} · fatura ${String(origem.mes).padStart(2, "0")}/${origem.ano}`;
  const descricao = `Estorno de: ${d.compra.descricao || "compra"}${detalhe}${d.motivo ? ` (${d.motivo})` : ""}`;
  const lancamentos = await planejarLancamentos(tx, d.userId, d.cartao, d.centavos, d.data);

  for (const lancamento of lancamentos) {
    const [criado] = await tx.insert(transacoes).values({
      userId: d.userId,
      tipo: "estorno",
      valor: (lancamento.centavos / 100).toFixed(2),
      data: new Date(lancamento.data),
      descricao,
      categoria: d.compra.categoria,
      formaPagamento: "cartao",
      contaId: null,
      cartaoId: d.cartao.id,
      estabelecimentoId: d.compra.estabelecimentoId,
      estornoDeId: d.compra.id,
      parcelado: false,
      recorrente: false,
    }).returning();

    await aplicarImpacto(tx, criado, d.userId);
  }

  return lancamentos;
}

function validarData(data: string, compra: Transacao, hoje: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || isNaN(new Date(data).getTime())) {
    throw new ErroFinanceiro("Data inválida.");
  }
  if (data > hoje) throw new ErroFinanceiro("A data do estorno não pode ser futura.");
  if (!compra.parcelado && data < diaIso(compra.data)) {
    throw new ErroFinanceiro("A data do estorno não pode ser anterior à da compra.");
  }
}

interface EntradaEstorno {
  userId: string;
  compraId: string;
  centavos: number;
  data: string;
  hoje: string;
  motivo: string | null;
}

export async function estornarPorValor(tx: TransacaoBanco, e: EntradaEstorno) {
  // Serializa estornos simultâneos da mesma compra, para o teto valer
  await tx.select({ id: transacoes.id }).from(transacoes)
    .where(and(eq(transacoes.id, e.compraId), eq(transacoes.userId, e.userId))).limit(1).for("update");

  const contexto = await carregarContexto(tx, e.userId, e.compraId);
  validarData(e.data, contexto.compra, e.hoje);

  if (await buscarAntecipacaoBloqueante(tx, e.userId, contexto.compra)) {
    throw new ErroFinanceiro("Esta compra tem uma antecipação pendente. Desfaça a antecipação antes de estornar.");
  }
  if (e.centavos <= 0) throw new ErroFinanceiro("Informe o valor do estorno.");
  if (e.centavos > contexto.centavosDisponiveis) {
    throw new ErroFinanceiro(`O valor passa do disponível para estorno (${formatarMoeda(contexto.centavosDisponiveis / 100)}).`);
  }

  return lancarEstorno(tx, {
    compra: contexto.compra,
    cartao: contexto.cartao,
    centavos: e.centavos,
    data: e.data,
    motivo: e.motivo,
    userId: e.userId,
  });
}

/** Cancela a compra parcelada: exclui o que não foi pago e estorna o que já foi. */
export async function cancelarCompraParcelada(tx: TransacaoBanco, e: Omit<EntradaEstorno, "centavos">) {
  await tx.select({ id: transacoes.id }).from(transacoes)
    .where(and(eq(transacoes.id, e.compraId), eq(transacoes.userId, e.userId))).limit(1).for("update");

  const contexto = await carregarContexto(tx, e.userId, e.compraId);
  validarData(e.data, contexto.compra, e.hoje);

  if (!contexto.parcelado) throw new ErroFinanceiro("Só compras parceladas podem ser canceladas por aqui.");
  if (await buscarAntecipacaoBloqueante(tx, e.userId, contexto.compra)) {
    throw new ErroFinanceiro("Esta compra tem uma antecipação pendente. Desfaça a antecipação antes de cancelar.");
  }

  if (await possuiEstorno(tx, e.userId, contexto.grupo.map((t) => t.id))) {
    throw new ErroFinanceiro("Esta compra já tem estorno lançado. Exclua os estornos antes de cancelar a compra.");
  }

  const { pagas, emAberto } = await separarParcelas(tx, e.userId, contexto.grupo);

  for (const parcela of emAberto) await reverterImpacto(tx, parcela, e.userId);
  if (emAberto.length) {
    await tx.delete(transacoes)
      .where(and(inArray(transacoes.id, emAberto.map((t) => t.id)), eq(transacoes.userId, e.userId)));
  }

  // Um estorno por parcela paga, para cada uma ficar vinculada ao que lhe cabe
  const lancamentos: LancamentoEstorno[] = [];
  for (const { parcela, centavos } of restantesDasPagas(pagas, contexto.estornadoPorId)) {
    lancamentos.push(...await lancarEstorno(tx, {
      compra: parcela,
      cartao: contexto.cartao,
      centavos,
      data: e.data,
      motivo: e.motivo,
      userId: e.userId,
    }));
  }

  return { parcelasExcluidas: emAberto.length, lancamentos };
}
