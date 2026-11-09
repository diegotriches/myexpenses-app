// app/api/transacoes/route.ts
import { comprasTotalmenteEstornadas } from "@/lib/estornoTransacao";
import { calcularLimiteDisponivel } from "@/lib/limiteCartao";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { transacoes, contas, cartoes, faturas } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import { ErroFinanceiro, movimentarConta } from "@/lib/movimentacaoConta";
import { garantirDono } from "@/lib/garantirDono";
import { calcularFaturaDaTransacao } from "@/utils/faturaUtils";
import { calcularIntervaloAno, lerAnoDaRequisicao } from "@/utils/periodoAno";
import { respostaDeErro } from "@/lib/rota";

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const ano = searchParams.get("ano");
    const mes = searchParams.get("mes");
    const periodoMeses = searchParams.get("periodoMeses");
    const anoCompleto  = searchParams.get("anoCompleto");

    const filtros = [eq(transacoes.userId, userId)];

    if (ano && mes) {
      const anoNum    = parseInt(ano);
      const mesNum    = parseInt(mes);
      const inicioMes = new Date(anoNum, mesNum - 1, 1);
      const fimMes    = new Date(anoNum, mesNum, 1);
      filtros.push(sql`${transacoes.data} >= ${inicioMes} AND ${transacoes.data} < ${fimMes}`);
    } else if (anoCompleto) {
      // Ano inteiro (dashboard): de janeiro até o mês atual no ano vigente,
      // de janeiro a dezembro nos anos passados
      const anoNum = lerAnoDaRequisicao(anoCompleto);
      if (anoNum === null) return NextResponse.json({ error: "Ano inválido" }, { status: 400 });
      const { inicio, fim } = calcularIntervaloAno(anoNum);
      filtros.push(sql`${transacoes.data} >= ${inicio} AND ${transacoes.data} <= ${fim}`);
    } else if (periodoMeses) {
      const numMeses = parseInt(periodoMeses);
      if (!isNaN(numMeses) && numMeses > 0 && numMeses <= 24) {
        const hoje = new Date();
        const inicioPeriodo = new Date(hoje.getFullYear(), hoje.getMonth() - numMeses + 1, 1);
        const fimPeriodo = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59, 999);
        filtros.push(sql`${transacoes.data} >= ${inicioPeriodo} AND ${transacoes.data} <= ${fimPeriodo}`);
      }
    }

    const result = await db
      .select()
      .from(transacoes)
      .where(and(...filtros))
      .orderBy(sql`${transacoes.createdAt} DESC`);

    const estornadas = await comprasTotalmenteEstornadas(db, userId, result);

    // Fatura paga trava o valor da compra; o formulário usa isso para avisar antes de salvar
    const [cartoesCredito, faturasPagas] = await Promise.all([
      db.select({ id: cartoes.id, diaFechamento: cartoes.diaFechamento }).from(cartoes)
        .where(and(eq(cartoes.userId, userId), eq(cartoes.tipo, "credito"))),
      db.select({ cartaoId: faturas.cartaoId, mes: faturas.mes, ano: faturas.ano }).from(faturas)
        .where(and(eq(faturas.userId, userId), eq(faturas.paga, true))),
    ]);
    const fechamentoPorCartao = new Map(cartoesCredito.map((c) => [c.id, c.diaFechamento || 1]));
    const pagas = new Set(faturasPagas.map((f) => `${f.cartaoId}-${f.mes}-${f.ano}`));
    const emFaturaPaga = (t: (typeof result)[number]) => {
      const fechamento = t.cartaoId ? fechamentoPorCartao.get(t.cartaoId) : undefined;
      if (t.formaPagamento !== "cartao" || !t.cartaoId || fechamento === undefined) return false;
      const { mes, ano } = calcularFaturaDaTransacao(new Date(t.data), fechamento);
      return pagas.has(`${t.cartaoId}-${mes}-${ano}`);
    };

    return NextResponse.json(result.map((t) => ({
      ...t,
      totalmenteEstornada: estornadas.has(t.id),
      emFaturaPaga: emFaturaPaga(t),
    })));
  } catch (err) {
    return respostaDeErro(err);
  }
}

// ✅ ALTERADO: só fatura PAGA bloqueia o lançamento. Fatura fechada mas ainda
// não paga aceita novos lançamentos (ex: um gasto que ficou sem registro) —
// ele entra no total daquela fatura e consome o limite do cartão.
async function verificarFaturaPaga(
  userId: string,
  cartaoId: number,
  diaFechamento: number,
  dataTransacao: string | Date
): Promise<{ bloqueado: boolean; motivo?: string }> {
  const { mes, ano } = calcularFaturaDaTransacao(dataTransacao as string, diaFechamento);

  const [faturaExistente] = await db.select({ paga: faturas.paga }).from(faturas)
    .where(and(eq(faturas.cartaoId, cartaoId), eq(faturas.userId, userId), eq(faturas.mes, mes), eq(faturas.ano, ano)))
    .limit(1);

  if (faturaExistente?.paga) {
    return { bloqueado: true, motivo: `A fatura de ${String(mes).padStart(2, "0")}/${ano} já está paga` };
  }

  return { bloqueado: false };
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const json            = await req.json();
    const transacoesArray = Array.isArray(json) ? json : [json];

    const isParcelas    = transacoesArray.length > 1 && transacoesArray[0].parcelado  === true;

    const parcelamentoId = isParcelas ? crypto.randomUUID() : null;

    const transacoesCriadas: (typeof transacoes.$inferSelect)[] = [];

    // Tudo ou nada: uma parcela recusada desfaz as anteriores
    await db.transaction(async (tx) => {
    for (let index = 0; index < transacoesArray.length; index++) {
      const trans = transacoesArray[index];

      // ── Validações ────────────────────────────────────────────────────────

      if (!trans.tipo || !["entrada", "saida"].includes(trans.tipo))
        throw new ErroFinanceiro("Tipo de transação inválido", 400);

      if (trans.tipo === "entrada" && !trans.contaId)
        throw new ErroFinanceiro("Conta é obrigatória para receitas", 400);

      if (trans.tipo === "saida" && trans.formaPagamento !== "cartao" && !trans.contaId)
        throw new ErroFinanceiro("Conta é obrigatória para despesas com dinheiro/PIX", 400);

      if (!trans.data || isNaN(new Date(trans.data).getTime()))
        throw new ErroFinanceiro("Data inválida", 400);

      if (trans.formaPagamento === "cartao" && !trans.cartaoId)
        throw new ErroFinanceiro("Cartão é obrigatório quando forma de pagamento for 'cartao'", 400);

      const valorNum = Number(trans.valor);
      if (isNaN(valorNum) || valorNum <= 0)
        throw new ErroFinanceiro("Valor inválido", 400);

      // ── Verificar conta ───────────────────────────────────────────────────

      if (trans.contaId) {
        const [conta] = await tx.select().from(contas)
          .where(and(eq(contas.id, trans.contaId), eq(contas.userId, userId))).limit(1);
        if (!conta)       throw new ErroFinanceiro("Conta não encontrada", 404);
        if (!conta.ativo) throw new ErroFinanceiro("Conta inativa", 400);
        if (trans.tipo === "saida" && trans.formaPagamento !== "cartao" && Number(conta.saldoAtual) < valorNum)
          throw new ErroFinanceiro("Saldo insuficiente", 400);
      }

      // ── Verificar cartão ──────────────────────────────────────────────────

      let cartao         = null;
      let contaParaDebito = null;

      if (trans.cartaoId) {
        [cartao] = await tx.select().from(cartoes)
          .where(and(eq(cartoes.id, Number(trans.cartaoId)), eq(cartoes.userId, userId))).limit(1).for("update");
        if (!cartao)       throw new ErroFinanceiro("Cartão não encontrado", 404);
        if (!cartao.ativo) throw new ErroFinanceiro("Cartão inativo", 400);

        if (cartao.tipo === "debito") {
          if (!cartao.contaVinculadaId)
            throw new ErroFinanceiro("Cartão de débito sem conta vinculada", 400);

          const [conta] = await tx.select().from(contas)
            .where(and(eq(contas.id, cartao.contaVinculadaId), eq(contas.userId, userId))).limit(1);
          if (!conta)       throw new ErroFinanceiro("Conta vinculada ao cartão de débito não encontrada", 404);
          if (!conta.ativo) throw new ErroFinanceiro("Conta vinculada ao cartão de débito está inativa", 400);
          if (Number(conta.saldoAtual) < valorNum)
            throw new ErroFinanceiro(`Saldo insuficiente na conta ${conta.nome}`, 400);
          contaParaDebito = conta;
        }

        if (cartao.tipo === "credito" && trans.tipo === "saida") {
          // Dentro da transação: já enxerga as parcelas anteriores desta mesma compra
          if (await calcularLimiteDisponivel(tx, cartao, userId) < valorNum)
            throw new ErroFinanceiro("Limite insuficiente no cartão de crédito", 400);

          // Bloqueia só se a fatura daquela data já estiver PAGA
          const diaFechamento = cartao.diaFechamento || 1;
          const verificacao = await verificarFaturaPaga(userId, cartao.id, diaFechamento, trans.data);
          if (verificacao.bloqueado) {
            throw new ErroFinanceiro(`${verificacao.motivo}. Estorne o pagamento da fatura ou escolha outra data.`);
          }
        }
      }

      // ── Criar transação ───────────────────────────────────────────────────

      const erroDono = await garantirDono(userId, { estabelecimentoId: trans.estabelecimentoId });
      if (erroDono) throw new ErroFinanceiro(erroDono, 404);

      const [novaTransacao] = await tx.insert(transacoes).values({
        userId,
        tipo:           trans.tipo,
        valor:          valorNum.toFixed(2),
        data:           new Date(trans.data),
        descricao:      trans.descricao     || null,
        categoria:      trans.categoria     || null,
        formaPagamento: trans.formaPagamento || "dinheiro",
        contaId:        trans.contaId       || null,
        cartaoId:       trans.cartaoId      ? Number(trans.cartaoId) : null,
        estabelecimentoId: trans.estabelecimentoId || null,

        parcelado:      isParcelas,
        parcelamentoId: isParcelas ? parcelamentoId : null,
        parcelas:       isParcelas ? transacoesArray.length : null,
        parcelaAtual:   isParcelas ? index + 1 : null,

        recorrente:     false,
        recorrenciaId:  null,
        repeticoes:     null,
      }).returning();

      transacoesCriadas.push(novaTransacao);

      // ── Processamento financeiro ──────────────────────────────────────────

      if (trans.cartaoId && cartao) {
        if (cartao.tipo === "debito" && contaParaDebito) {
          await movimentarConta(tx, {
            userId,
            contaId: contaParaDebito.id,
            tipo: "saida",
            valor: valorNum,
            data: new Date(trans.data).toISOString().split("T")[0],
            descricao: trans.descricao || `Compra no débito - ${cartao.nome}`,
            origem: "TRANSACAO_MANUAL",
            referenciaId: novaTransacao.id,
            mensagemSaldoInsuficiente: `Saldo insuficiente na conta ${contaParaDebito.nome}`,
          });
        } else if (cartao.tipo === "credito") {
          const diaFechamento = cartao.diaFechamento || 1;
          // ✅ ALTERADO: a compra entra na fatura da SUA data, mesmo que
          // fechada (antes era empurrada pra próxima aberta, o que deixava o
          // total da fatura diferente do que a exclusão/edição calcula)
          const { mes: mesFatura, ano: anoFatura } = calcularFaturaDaTransacao(trans.data as string, diaFechamento);

          const [faturaExistente] = await tx.select().from(faturas)
            .where(and(eq(faturas.cartaoId, Number(trans.cartaoId)), eq(faturas.userId, userId), eq(faturas.mes, mesFatura), eq(faturas.ano, anoFatura)))
            .limit(1)
            .for("update");

          if (faturaExistente) {
            await tx.update(faturas)
              .set({ total: (Number(faturaExistente.total) + valorNum).toFixed(2), updatedAt: new Date() })
              .where(eq(faturas.id, faturaExistente.id));
          } else {
            await tx.insert(faturas).values({ userId, cartaoId: Number(trans.cartaoId), mes: mesFatura, ano: anoFatura, total: valorNum.toFixed(2), paga: false });
          }

          await tx.update(cartoes)
            .set({ limiteDisponivel: sql`CAST(${cartoes.limiteDisponivel} AS NUMERIC) - ${valorNum}` })
            .where(and(eq(cartoes.id, Number(trans.cartaoId)), eq(cartoes.userId, userId)));
        }
      } else if (trans.contaId && trans.formaPagamento !== "cartao") {
        await movimentarConta(tx, {
          userId,
          contaId: trans.contaId,
          tipo: trans.tipo === "entrada" ? "entrada" : "saida",
          valor: valorNum,
          data: new Date(trans.data).toISOString().split("T")[0],
          descricao: trans.descricao || "Transação manual",
          origem: "TRANSACAO_MANUAL",
          referenciaId: novaTransacao.id,
          mensagemSaldoInsuficiente: trans.tipo === "saida" ? "Saldo insuficiente" : undefined,
        });
      }
    }
    });

    return NextResponse.json(
      Array.isArray(json) ? transacoesCriadas : transacoesCriadas[0],
      { status: 201 }
    );
  } catch (err) {
    return respostaDeErro(err);
  }
}