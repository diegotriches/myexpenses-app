// app/api/cartoes/[id]/fatura/route.ts
import { calcularLimiteDisponivel } from "@/lib/limiteCartao";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { transacoes, faturas, contas, cartoes, notificacoes, adiantamentosFatura } from "@/db/schema";
import { eq, and, gte, lt, sql, sum } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import { ErroFinanceiro, movimentarConta } from "@/lib/movimentacaoConta";
import { hojeBrt } from "@/utils/aplicacaoSimulacao";
import { calcularDataVencimento } from "@/utils/faturaUtils";

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { id }   = await params;
    const cartaoId = Number(id);
    const { searchParams } = new URL(req.url);
    const ano = Number(searchParams.get("ano"));
    const mes = Number(searchParams.get("mes"));

    if (!cartaoId || isNaN(ano) || isNaN(mes) || mes < 1 || mes > 12)
      return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });

    const [cartao] = await db.select().from(cartoes)
      .where(and(eq(cartoes.id, cartaoId), eq(cartoes.userId, userId)));

    if (!cartao) return NextResponse.json({ error: "Cartão não encontrado ou acesso negado" }, { status: 404 });

    const diaFechamento = cartao.diaFechamento || 1;

    const anoMesAnterior      = mes === 1 ? ano - 1 : ano;
    const mesAnterior         = mes === 1 ? 12 : mes - 1;
    const ultimoDiaMesAnterior = new Date(Date.UTC(anoMesAnterior, mesAnterior, 0)).getUTCDate();
    const diaInicio           = Math.min(diaFechamento, ultimoDiaMesAnterior);
    const inicio              = new Date(Date.UTC(anoMesAnterior, mesAnterior - 1, diaInicio, 0, 0, 0));
    const ultimoDiaMesAtual   = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
    const diaFim              = Math.min(diaFechamento, ultimoDiaMesAtual);
    const fimExclusivo        = new Date(Date.UTC(ano, mes - 1, diaFim, 0, 0, 0));

    const transacoesDoMes = await db.select().from(transacoes)
      .where(and(
        eq(transacoes.cartaoId, cartaoId),
        eq(transacoes.userId,   userId),
        gte(transacoes.data, inicio),
        lt(transacoes.data,  fimExclusivo)
      ))
      .orderBy(transacoes.data);

    const [fatura] = await db.select().from(faturas)
      .where(and(
        eq(faturas.cartaoId, cartaoId),
        eq(faturas.userId,   userId),
        eq(faturas.ano,      ano),
        eq(faturas.mes,      mes)
      ));

    const totalCalculado = transacoesDoMes.reduce((acc, t) => acc + Number(t.valor), 0);

    let faturaAtual = fatura;

    // Cria fatura se não existe mas há transações
    if (!fatura && transacoesDoMes.length > 0) {
      const [novaFatura] = await db.insert(faturas).values({
        userId, cartaoId, ano, mes,
        total: totalCalculado.toFixed(2),
        paga: false, dataPagamento: null,
      }).returning();
      faturaAtual = novaFatura;
    }

    // ✅ CORRIGIDO: só atualiza o total se a fatura não tiver adiantamentos.
    // Se houver adiantamentos, o total já foi reduzido intencionalmente —
    // sobrescrever com totalCalculado apagaria os adiantamentos.
    if (faturaAtual && !faturaAtual.paga) {
      const [somaAdiantamentos] = await db
        .select({ total: sum(adiantamentosFatura.valor) })
        .from(adiantamentosFatura)
        .where(and(
          eq(adiantamentosFatura.faturaId, faturaAtual.id),
          eq(adiantamentosFatura.userId,   userId)
        ));

      const totalAdiantado = Number(somaAdiantamentos?.total ?? 0);
      const totalComDesconto = totalCalculado - totalAdiantado;

      // Só sincroniza se não há adiantamentos (caso o total esteja desatualizado
      // por adição/remoção de transações)
      if (totalAdiantado === 0 && Number(faturaAtual.total) !== totalCalculado) {
        [faturaAtual] = await db.update(faturas)
          .set({ total: totalCalculado.toFixed(2), updatedAt: new Date() })
          .where(and(eq(faturas.id, faturaAtual.id), eq(faturas.userId, userId)))
          .returning();
      }

      // Se houver adiantamentos mas o total base mudou (nova transação adicionada),
      // recalcula: total base - adiantamentos
      if (totalAdiantado > 0 && Math.abs(Number(faturaAtual.total) - totalComDesconto) > 0.01) {
        [faturaAtual] = await db.update(faturas)
          .set({ total: Math.max(0, totalComDesconto).toFixed(2), updatedAt: new Date() })
          .where(and(eq(faturas.id, faturaAtual.id), eq(faturas.userId, userId)))
          .returning();
      }
    }

    const porCategoria: Record<string, number> = {};
    transacoesDoMes.forEach((t) => {
      const cat = t.categoria || "Sem categoria";
      porCategoria[cat] = (porCategoria[cat] || 0) + Number(t.valor);
    });

    const diaVencimento  = cartao.diaVencimento || 1;
    const dataVencimento = calcularDataVencimento(mes, ano, diaVencimento);
    const dataVencimentoStr = dataVencimento.toISOString().split("T")[0];

    const hoje = new Date();
    let status: "PAGA" | "EM_ABERTO" | "ATRASADA";
    if (faturaAtual?.paga)        status = "PAGA";
    else if (hoje > dataVencimento) status = "ATRASADA";
    else                            status = "EM_ABERTO";

    return NextResponse.json({
      fatura: faturaAtual ? {
        id:               faturaAtual.id,
        cartaoId,
        mes,
        ano,
        total:            Number(faturaAtual.total),
        paga:             faturaAtual.paga,
        dataPagamento:    faturaAtual.dataPagamento,
        contaPagamentoId: faturaAtual.contaPagamentoId,
        dataVencimento:   dataVencimentoStr,
        status,
      } : null,
      cartao: {
        id:              cartao.id,
        nome:            cartao.nome,
        limite:          Number(cartao.limite),
        limiteDisponivel: Math.max(0, await calcularLimiteDisponivel(db, cartao, userId)),
        diaFechamento:   cartao.diaFechamento,
        diaVencimento:   cartao.diaVencimento,
      },
      periodo: {
        inicio:    inicio.toISOString().split("T")[0],
        fim:       new Date(ano, mes - 1, diaFim - 1, 23, 59, 59).toISOString().split("T")[0],
        descricao: `${inicio.toLocaleDateString("pt-BR")} - ${new Date(ano, mes - 1, diaFim - 1).toLocaleDateString("pt-BR")}`,
      },
      transacoes:      transacoesDoMes.map(t => ({ ...t, valor: Number(t.valor) })),
      porCategoria,
      totalTransacoes: totalCalculado,
    });
  } catch (error) {
    console.error("Erro ao buscar fatura:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao buscar fatura" }, { status: 500 });
  }
}

// ── POST (pagar fatura) ───────────────────────────────────────────────────────
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { id }   = await params;
    const cartaoId = Number(id);
    if (!cartaoId) return NextResponse.json({ error: "Cartão inválido" }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const ano = Number(searchParams.get("ano"));
    const mes = Number(searchParams.get("mes"));
    if (isNaN(ano) || isNaN(mes) || mes < 1 || mes > 12)
      return NextResponse.json({ error: "Ano ou mês inválido" }, { status: 400 });

    const { contaId, dataPagamento } = await req.json();
    if (!contaId || !/^[0-9a-f-]{36}$/i.test(contaId))
      return NextResponse.json({ error: "Conta inválida" }, { status: 400 });

    const dataPgto    = dataPagamento ? new Date(dataPagamento) : new Date();
    const dataPgtoStr = dataPagamento ? dataPgto.toISOString().split("T")[0] : hojeBrt();

    // 1. Buscar fatura
    const [fatura] = await db.select().from(faturas)
      .where(and(eq(faturas.cartaoId, cartaoId), eq(faturas.userId, userId), eq(faturas.ano, ano), eq(faturas.mes, mes)));

    if (!fatura) return NextResponse.json({ error: "Fatura não encontrada" }, { status: 404 });
    if (fatura.paga) return NextResponse.json({ error: "Fatura já foi paga" }, { status: 400 });

    // ✅ valorAPagar continua sendo o total da fatura (já com eventuais
    // antecipações somadas); valorLiberado inclui também o limiteExtraAoPagar
    // guardado pelas antecipações (a diferença do desconto)
    const valorAPagar    = Number(fatura.total);
    const limiteExtra    = Number(fatura.limiteExtraAoPagar ?? 0);
    const valorLiberado  = valorAPagar + limiteExtra;

    // Total zero só é aceito quando adiantamentos cobriram a fatura inteira:
    // ela é marcada como paga sem novo débito na conta.
    if (valorAPagar <= 0) {
      const [adiantamento] = await db.select({ id: adiantamentosFatura.id }).from(adiantamentosFatura)
        .where(and(eq(adiantamentosFatura.faturaId, fatura.id), eq(adiantamentosFatura.userId, userId)))
        .limit(1);
      if (!adiantamento) return NextResponse.json({ error: "Fatura sem saldo a pagar" }, { status: 400 });
    }

    // 2. Buscar conta
    const [conta] = await db.select().from(contas)
      .where(and(eq(contas.id, contaId), eq(contas.userId, userId)));

    if (!conta)       return NextResponse.json({ error: "Conta não encontrada" }, { status: 404 });
    if (!conta.ativo) return NextResponse.json({ error: "Conta inativa não pode realizar pagamentos" }, { status: 400 });

    // 3. Buscar cartão
    const [cartao] = await db.select().from(cartoes)
      .where(and(eq(cartoes.id, cartaoId), eq(cartoes.userId, userId)));

    if (!cartao) return NextResponse.json({ error: "Cartão não encontrado" }, { status: 404 });

    await db.transaction(async (tx) => {
      // Trava a fatura: um segundo clique espera aqui e recebe "já foi paga"
      const [atual] = await tx.select().from(faturas).where(eq(faturas.id, fatura.id)).limit(1).for("update");
      if (!atual || atual.paga) throw new ErroFinanceiro("Fatura já foi paga");
      if (Number(atual.total) !== valorAPagar) {
        throw new ErroFinanceiro("A fatura foi alterada. Recarregue a página e tente novamente.", 409);
      }

      // 4 e 5. Debita a conta e registra no extrato
      if (valorAPagar > 0) {
        await movimentarConta(tx, {
          userId, contaId,
          tipo:        "saida",
          valor:       valorAPagar,
          data:        dataPgtoStr,
          descricao:   `Pagamento fatura ${cartao.nome} - ${String(mes).padStart(2, "0")}/${ano}`,
          origem:      "PAGAMENTO_FATURA",
          referenciaId: fatura.id.toString(),
          mensagemSaldoInsuficiente: "Saldo insuficiente para pagamento da fatura",
        });
      }

      // 6. Liberar limite do cartão — valor pago + limite extra de antecipações
      await tx.update(cartoes)
        .set({ limiteDisponivel: sql`CAST(${cartoes.limiteDisponivel} AS NUMERIC) + ${valorLiberado}` })
        .where(and(eq(cartoes.id, cartaoId), eq(cartoes.userId, userId)));

      // 7. Marcar fatura como paga
      await tx.update(faturas)
        .set({ paga: true, dataPagamento: dataPgtoStr, contaPagamentoId: contaId, updatedAt: new Date() })
        .where(eq(faturas.id, fatura.id));

      // 8. Notificação
      await tx.insert(notificacoes).values({
        userId,
        tipo:       "FATURA_PAGA",
        severidade: "success",
        titulo:     `Fatura ${cartao.nome} paga com sucesso!`,
        mensagem:   `Fatura de ${String(mes).padStart(2, "0")}/${ano} no valor de R$ ${valorAPagar.toFixed(2)} foi paga em ${dataPgto.toLocaleDateString("pt-BR")}.`,
        link:       `/cartoes/${cartaoId}/fatura?mes=${mes}&ano=${ano}`,
        metadata:   { cartaoId: String(cartaoId), mes: String(mes), ano: String(ano), total: String(valorAPagar) },
      });
    });

    // 9. Retornar dados
    const diaFechamento      = cartao.diaFechamento || 1;
    const anoMesAnterior     = mes === 1 ? ano - 1 : ano;
    const mesAnterior        = mes === 1 ? 12 : mes - 1;
    const ultimoDiaMesAnt    = new Date(Date.UTC(anoMesAnterior, mesAnterior, 0)).getUTCDate();
    const diaInicio          = Math.min(diaFechamento, ultimoDiaMesAnt);
    const inicio             = new Date(Date.UTC(anoMesAnterior, mesAnterior - 1, diaInicio, 0, 0, 0));
    const ultimoDiaMesAtual  = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
    const diaFim             = Math.min(diaFechamento, ultimoDiaMesAtual);
    const fimExclusivo       = new Date(Date.UTC(ano, mes - 1, diaFim, 0, 0, 0));

    const transacoesDoMes = await db.select().from(transacoes)
      .where(and(eq(transacoes.cartaoId, cartaoId), eq(transacoes.userId, userId), gte(transacoes.data, inicio), lt(transacoes.data, fimExclusivo)))
      .orderBy(transacoes.data);

    const porCategoria: Record<string, number> = {};
    transacoesDoMes.forEach((t) => {
      const cat = t.categoria || "Sem categoria";
      porCategoria[cat] = (porCategoria[cat] || 0) + Number(t.valor);
    });

    const diaVencimento  = cartao.diaVencimento || 1;
    const dataVencimento = calcularDataVencimento(mes, ano, diaVencimento);

    return NextResponse.json({
      fatura: {
        id: fatura.id, cartaoId, mes, ano,
        total:            valorAPagar,
        paga:             true,
        dataPagamento:    dataPgtoStr,
        contaPagamentoId: contaId,
        dataVencimento:   dataVencimento.toISOString().split("T")[0],
        status:           "PAGA" as const,
      },
      cartao: {
        id: cartao.id, nome: cartao.nome,
        limite:           Number(cartao.limite),
        limiteDisponivel: Math.max(0, await calcularLimiteDisponivel(db, cartao, userId)),
        diaFechamento:    cartao.diaFechamento,
        diaVencimento:    cartao.diaVencimento,
      },
      periodo: {
        inicio:    inicio.toISOString().split("T")[0],
        fim:       new Date(ano, mes - 1, diaFim - 1, 23, 59, 59).toISOString().split("T")[0],
        descricao: `${inicio.toLocaleDateString("pt-BR")} - ${new Date(ano, mes - 1, diaFim - 1).toLocaleDateString("pt-BR")}`,
      },
      transacoes:      transacoesDoMes.map(t => ({ ...t, valor: Number(t.valor) })),
      porCategoria,
      totalTransacoes: valorAPagar,
    });
  } catch (error: any) {
    if (error instanceof ErroFinanceiro) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Erro ao pagar fatura:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao pagar fatura" }, { status: 500 });
  }
}

// ── DELETE (estornar pagamento) ───────────────────────────────────────────────
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { id }   = await params;
    const cartaoId = Number(id);
    if (!cartaoId) return NextResponse.json({ error: "Cartão inválido" }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const ano = Number(searchParams.get("ano"));
    const mes = Number(searchParams.get("mes"));
    if (isNaN(ano) || isNaN(mes) || mes < 1 || mes > 12)
      return NextResponse.json({ error: "Ano ou mês inválido" }, { status: 400 });

    const [fatura] = await db.select().from(faturas)
      .where(and(eq(faturas.cartaoId, cartaoId), eq(faturas.userId, userId), eq(faturas.ano, ano), eq(faturas.mes, mes)));

    if (!fatura)       return NextResponse.json({ error: "Fatura não encontrada" }, { status: 404 });
    if (!fatura.paga)  return NextResponse.json({ error: "Fatura não está paga" }, { status: 400 });

    const totalFatura    = Number(fatura.total);
    // Fatura quitada só por adiantamentos não debitou conta: não há o que devolver
    const contaEstorno   = totalFatura > 0 ? fatura.contaPagamentoId : null;
    if (totalFatura > 0 && !contaEstorno) return NextResponse.json({ error: "Conta de pagamento não identificada" }, { status: 400 });
    const limiteExtra    = Number(fatura.limiteExtraAoPagar ?? 0);
    const valorAReverter = totalFatura + limiteExtra;

    const [cartao] = await db.select().from(cartoes)
      .where(and(eq(cartoes.id, cartaoId), eq(cartoes.userId, userId)));

    if (!cartao) return NextResponse.json({ error: "Cartão não encontrado" }, { status: 404 });

    await db.transaction(async (tx) => {
      // Trava a fatura para o estorno não acontecer duas vezes
      const [atual] = await tx.select().from(faturas).where(eq(faturas.id, fatura.id)).limit(1).for("update");
      if (!atual || !atual.paga) throw new ErroFinanceiro("Fatura não está paga");

      if (contaEstorno) {
        await movimentarConta(tx, {
          userId,
          contaId:     contaEstorno,
          tipo:        "entrada",
          valor:       totalFatura,
          data:        hojeBrt(),
          descricao:   `Estorno pagamento fatura ${cartao.nome} - ${String(mes).padStart(2, "0")}/${ano}`,
          origem:      "ESTORNO",
          referenciaId: fatura.id.toString(),
        });
      }

      // ✅ Reverte o limite pelo valor TOTAL liberado no pagamento
      // (totalFatura + limiteExtra), não só totalFatura
      await tx.update(cartoes)
        .set({ limiteDisponivel: sql`CAST(${cartoes.limiteDisponivel} AS NUMERIC) - ${valorAReverter}` })
        .where(and(eq(cartoes.id, cartaoId), eq(cartoes.userId, userId)));

      await tx.update(faturas)
        .set({ paga: false, dataPagamento: null, contaPagamentoId: null, updatedAt: new Date() })
        .where(eq(faturas.id, fatura.id));
    });

    const diaFechamento      = cartao.diaFechamento || 1;
    const anoMesAnterior     = mes === 1 ? ano - 1 : ano;
    const mesAnterior        = mes === 1 ? 12 : mes - 1;
    const ultimoDiaMesAnt    = new Date(Date.UTC(anoMesAnterior, mesAnterior, 0)).getUTCDate();
    const diaInicio          = Math.min(diaFechamento, ultimoDiaMesAnt);
    const inicio             = new Date(Date.UTC(anoMesAnterior, mesAnterior - 1, diaInicio, 0, 0, 0));
    const ultimoDiaMesAtual  = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
    const diaFim             = Math.min(diaFechamento, ultimoDiaMesAtual);
    const fimExclusivo       = new Date(Date.UTC(ano, mes - 1, diaFim, 0, 0, 0));

    const transacoesDoMes = await db.select().from(transacoes)
      .where(and(eq(transacoes.cartaoId, cartaoId), eq(transacoes.userId, userId), gte(transacoes.data, inicio), lt(transacoes.data, fimExclusivo)))
      .orderBy(transacoes.data);

    const porCategoria: Record<string, number> = {};
    transacoesDoMes.forEach((t) => {
      const cat = t.categoria || "Sem categoria";
      porCategoria[cat] = (porCategoria[cat] || 0) + Number(t.valor);
    });

    const diaVencimento  = cartao.diaVencimento || 1;
    const dataVencimento = calcularDataVencimento(mes, ano, diaVencimento);
    const hoje           = new Date();
    const status         = hoje > dataVencimento ? "ATRASADA" : "EM_ABERTO";

    return NextResponse.json({
      fatura: {
        id: fatura.id, cartaoId, mes, ano,
        total:            totalFatura,
        paga:             false,
        dataPagamento:    null,
        contaPagamentoId: null,
        dataVencimento:   dataVencimento.toISOString().split("T")[0],
        status:           status as "ATRASADA" | "EM_ABERTO",
      },
      cartao: {
        id: cartao.id, nome: cartao.nome,
        limite:           Number(cartao.limite),
        limiteDisponivel: Math.max(0, await calcularLimiteDisponivel(db, cartao, userId)),
        diaFechamento:    cartao.diaFechamento,
        diaVencimento:    cartao.diaVencimento,
      },
      periodo: {
        inicio:    inicio.toISOString().split("T")[0],
        fim:       new Date(ano, mes - 1, diaFim - 1, 23, 59, 59).toISOString().split("T")[0],
        descricao: `${inicio.toLocaleDateString("pt-BR")} - ${new Date(ano, mes - 1, diaFim - 1).toLocaleDateString("pt-BR")}`,
      },
      transacoes:      transacoesDoMes.map(t => ({ ...t, valor: Number(t.valor) })),
      porCategoria,
      totalTransacoes: totalFatura,
    });
  } catch (error: any) {
    if (error instanceof ErroFinanceiro) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Erro ao estornar pagamento:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao estornar pagamento" }, { status: 500 });
  }
}