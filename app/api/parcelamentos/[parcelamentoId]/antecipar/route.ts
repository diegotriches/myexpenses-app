import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { transacoes, cartoes, faturas, antecipacoesParcela } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import { calcularFaturaDaTransacao } from "@/utils/faturaUtils";
import { ErroFinanceiro } from "@/lib/movimentacaoConta";
import { ajustarTotalFatura, possuiEstorno } from "@/lib/impactoTransacao";
import { respostaDeErro } from "@/lib/rota";

/**
 * POST /api/parcelamentos/[parcelamentoId]/antecipar
 *
 * Antecipa as ÚLTIMAS N parcelas ainda não vencidas de um parcelamento no
 * cartão de crédito.
 *
 * ✅ NOVO: em vez de sempre criar uma transação separada pra representar
 * o valor antecipado, tenta MESCLAR esse valor numa parcela do próprio
 * parcelamento que já pertença à fatura atual e ainda não tenha ocorrido
 * (data > hoje) — assim as duas aparecem como uma linha só em
 * Movimentações, em vez de duas transações "soltas". Só cria uma linha
 * nova quando não existe candidata (nunca mescla em algo já ocorrido —
 * isso alteraria histórico já fechado).
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ parcelamentoId: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { parcelamentoId } = await context.params;
    const body = await req.json();
    const quantidadeParcelas = Number(body.quantidadeParcelas);
    const desconto = body.desconto !== undefined ? Number(body.desconto) : 0;

    if (!Number.isInteger(quantidadeParcelas) || quantidadeParcelas < 1) {
      return NextResponse.json({ error: "quantidadeParcelas deve ser um número inteiro maior que 0" }, { status: 400 });
    }
    if (isNaN(desconto) || desconto < 0) {
      return NextResponse.json({ error: "desconto inválido" }, { status: 400 });
    }

    const todasParcelas = await db
      .select()
      .from(transacoes)
      .where(and(eq(transacoes.parcelamentoId, parcelamentoId), eq(transacoes.userId, userId)))
      .orderBy(desc(transacoes.parcelaAtual));

    if (todasParcelas.length === 0) {
      return NextResponse.json({ error: "Parcelamento não encontrado" }, { status: 404 });
    }

    const representante = todasParcelas[todasParcelas.length - 1]; // menor parcelaAtual

    if (representante.formaPagamento !== "cartao" || !representante.cartaoId) {
      return NextResponse.json(
        { error: "Antecipação disponível apenas para compras parceladas no cartão" },
        { status: 400 }
      );
    }

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    // Ordenado por parcelaAtual desc (maior primeiro) — parcelasFuturas[0]
    // é a última do plano, parcelasFuturas[length-1] é a próxima a vencer
    const parcelasFuturas = todasParcelas.filter((t) => new Date(t.data) > hoje);

    if (parcelasFuturas.length === 0) {
      return NextResponse.json({ error: "Não há parcelas futuras para antecipar" }, { status: 400 });
    }
    // ✅ Não precisa reservar 1 parcela como "referência" — a fatura atual
    // é calculada direto a partir de hoje. Dá pra antecipar TODAS as
    // parcelas futuras de uma vez, inclusive a que seria a próxima a vencer.
    if (quantidadeParcelas > parcelasFuturas.length) {
      return NextResponse.json(
        { error: `Só há ${parcelasFuturas.length} parcela(s) ainda não vencida(s) para antecipar` },
        { status: 400 }
      );
    }

    // Últimas N do plano = as primeiras N deste array (já ordenado desc)
    const parcelasAntecipar = parcelasFuturas.slice(0, quantidadeParcelas);
    const idsAntecipados = new Set(parcelasAntecipar.map((p) => p.id));

    const [cartao] = await db.select().from(cartoes)
      .where(and(eq(cartoes.id, representante.cartaoId), eq(cartoes.userId, userId))).limit(1);
    if (!cartao) return NextResponse.json({ error: "Cartão não encontrado" }, { status: 404 });

    const diaFechamento = cartao.diaFechamento || 1;

    const cartaoIdAntecipacao = representante.cartaoId;

    const resposta = await db.transaction(async (tx) => {
    // 1. Remove as N parcelas antecipadas de suas faturas futuras
    if (await possuiEstorno(tx, userId, parcelasAntecipar.map((p) => p.id))) {
      throw new ErroFinanceiro("Uma das parcelas tem estorno lançado. Exclua o estorno antes de antecipar.");
    }

    // A fatura atual recebe o valor: se já foi paga, ele nunca seria cobrado
    const faturaDeHoje = calcularFaturaDaTransacao(hoje, diaFechamento);
    const [jaPaga] = await tx.select({ paga: faturas.paga }).from(faturas)
      .where(and(eq(faturas.cartaoId, cartaoIdAntecipacao), eq(faturas.userId, userId), eq(faturas.mes, faturaDeHoje.mes), eq(faturas.ano, faturaDeHoje.ano)))
      .limit(1);
    if (jaPaga?.paga) throw new ErroFinanceiro("A fatura atual já está paga. Não é possível lançar a antecipação nela.");

    let valorFaceAntecipado = 0;
    const snapshotParcelasRemovidas: Array<{
      parcelaAtual: number | null; valor: string; data: string;
      descricao: string | null; categoria: string | null;
      estabelecimentoId: string | null; mes: number; ano: number;
    }> = [];

    for (const parcela of parcelasAntecipar) {
      const valor = Number(parcela.valor);
      valorFaceAntecipado += valor;

      const { mes: mesFatura, ano: anoFatura } = calcularFaturaDaTransacao(new Date(parcela.data), diaFechamento);

      snapshotParcelasRemovidas.push({
        parcelaAtual: parcela.parcelaAtual,
        valor: parcela.valor,
        data: new Date(parcela.data).toISOString(),
        descricao: parcela.descricao,
        categoria: parcela.categoria,
        estabelecimentoId: parcela.estabelecimentoId,
        mes: mesFatura,
        ano: anoFatura,
      });

      const [faturaFutura] = await tx.select().from(faturas)
        .where(and(eq(faturas.cartaoId, cartaoIdAntecipacao), eq(faturas.userId, userId), eq(faturas.mes, mesFatura), eq(faturas.ano, anoFatura)))
        .limit(1)
        .for("update");

      if (faturaFutura?.paga) throw new ErroFinanceiro("Uma das parcelas está em uma fatura já paga. Estorne o pagamento antes de antecipar.");
      if (faturaFutura) await ajustarTotalFatura(tx, faturaFutura, Number(faturaFutura.total) - valor);

      await tx.delete(transacoes).where(and(eq(transacoes.id, parcela.id), eq(transacoes.userId, userId)));
    }

    // 2. Determina a fatura atual — a partir de HOJE, não de nenhuma
    // parcela específica
    const { mes: mesAtual, ano: anoAtual } = calcularFaturaDaTransacao(hoje, diaFechamento);

    let [faturaAtual] = await tx.select().from(faturas)
      .where(and(eq(faturas.cartaoId, cartaoIdAntecipacao), eq(faturas.userId, userId), eq(faturas.mes, mesAtual), eq(faturas.ano, anoAtual)))
      .limit(1);

    const valorComDesconto = Math.max(0, valorFaceAntecipado - desconto);

    if (!faturaAtual) {
      [faturaAtual] = await tx.insert(faturas).values({
        userId,
        cartaoId: cartaoIdAntecipacao,
        mes: mesAtual,
        ano: anoAtual,
        total: valorComDesconto.toFixed(2),
        limiteExtraAoPagar: desconto.toFixed(2),
        paga: false,
      }).returning();
    } else {
      await tx.update(faturas).set({
        total: (Number(faturaAtual.total) + valorComDesconto).toFixed(2),
        limiteExtraAoPagar: (Number(faturaAtual.limiteExtraAoPagar ?? 0) + desconto).toFixed(2),
        updatedAt: new Date(),
      }).where(eq(faturas.id, faturaAtual.id));
    }

    // 3. ✅ NOVO: procura uma parcela candidata pra MESCLAR o valor —
    // precisa ser: do mesmo parcelamento, NÃO estar entre as recém
    // antecipadas, ainda não ter ocorrido (data > hoje), e pertencer à
    // mesma fatura atual (mesAtual/anoAtual). Nunca mescla em algo já
    // ocorrido — isso alteraria um registro histórico já fechado.
    const candidatosMerge = todasParcelas.filter(
      (t) => !idsAntecipados.has(t.id) && new Date(t.data) > hoje
    );

    let transacaoParaMerge: (typeof todasParcelas)[number] | null = null;
    for (const cand of candidatosMerge) {
      const { mes, ano } = calcularFaturaDaTransacao(new Date(cand.data), diaFechamento);
      if (mes === mesAtual && ano === anoAtual) { transacaoParaMerge = cand; break; }
    }

    let transacaoSinteticaId: string;
    let valorOriginalTransacaoMesclada: string | null = null;

    if (transacaoParaMerge) {
      // ✅ Mescla — soma o valor antecipado na parcela existente, em vez
      // de criar uma linha nova
      valorOriginalTransacaoMesclada = transacaoParaMerge.valor;
      const novoValor = Number(transacaoParaMerge.valor) + valorComDesconto;
      const [atualizada] = await tx.update(transacoes)
        .set({
          valor: novoValor.toFixed(2),
          descricao: `${transacaoParaMerge.descricao || representante.descricao || "Compra parcelada"} (+ antecipação de ${quantidadeParcelas} parcela(s))`,
          updatedAt: new Date(),
        })
        .where(and(eq(transacoes.id, transacaoParaMerge.id), eq(transacoes.userId, userId)))
        .returning();
      transacaoSinteticaId = atualizada.id;
    } else {
      // Sem candidata — cria uma transação própria pra representar o
      // valor antecipado (mesmo comportamento de antes)
      const [nova] = await tx.insert(transacoes).values({
        userId,
        tipo: "saida",
        valor: valorComDesconto.toFixed(2),
        data: hoje,
        descricao: `${representante.descricao || "Compra parcelada"} — antecipação de ${quantidadeParcelas} parcela(s)`,
        categoria: representante.categoria,
        formaPagamento: "cartao",
        cartaoId: cartaoIdAntecipacao,
        estabelecimentoId: representante.estabelecimentoId,
        parcelado: false,
        recorrente: false,
      }).returning();
      transacaoSinteticaId = nova.id;
    }

    // 4. Atualiza o total de parcelas declarado nas linhas remanescentes
    const totalOriginal = representante.parcelas ?? todasParcelas.length;
    const novoTotal = totalOriginal - quantidadeParcelas;
    await tx.update(transacoes)
      .set({ parcelas: novoTotal, updatedAt: new Date() })
      .where(and(eq(transacoes.parcelamentoId, parcelamentoId), eq(transacoes.userId, userId)));

    // 5. Grava o registro de auditoria — permite desfazer a antecipação
    // enquanto a fatura atual não tiver sido paga
    const [antecipacao] = await tx.insert(antecipacoesParcela).values({
      userId,
      parcelamentoId,
      cartaoId: cartaoIdAntecipacao,
      faturaAtualId: faturaAtual.id,
      transacaoSinteticaId,
      valorOriginalTransacaoMesclada,
      quantidadeAntecipada: quantidadeParcelas,
      valorFaceAntecipado: valorFaceAntecipado.toFixed(2),
      desconto: desconto.toFixed(2),
      valorComDesconto: valorComDesconto.toFixed(2),
      totalParcelasOriginal: totalOriginal,
      parcelasRemovidas: snapshotParcelasRemovidas,
    }).returning();

    return {
      antecipacaoId: antecipacao.id,
      quantidadeAntecipada: quantidadeParcelas,
      valorFaceAntecipado,
      desconto,
      valorLancadoNaFaturaAtual: valorComDesconto,
      mesclada: !!transacaoParaMerge,
      faturaAtual: { mes: mesAtual, ano: anoAtual },
      novoTotalParcelas: novoTotal,
    };
    });

    return NextResponse.json(resposta);
  } catch (error) {
    return respostaDeErro(error, "Erro ao antecipar parcelas");
  }
}