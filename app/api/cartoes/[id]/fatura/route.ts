// app/api/cartoes/[id]/fatura/route.ts

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { transacoes, faturas, contas, extratoConta, cartoes, notificacoes } from "@/db/schema";
import { eq, and, gte, lt, sql } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import { calcularDataVencimento } from "@/utils/faturaUtils";

// ========================================
// GET - Buscar fatura do mês
// ========================================
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { id } = await params;
    const cartaoId = Number(id);

    const { searchParams } = new URL(req.url);
    const ano = Number(searchParams.get("ano"));
    const mes = Number(searchParams.get("mes"));

    if (!cartaoId || isNaN(ano) || isNaN(mes) || mes < 1 || mes > 12) {
      return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
    }

    const [cartao] = await db
      .select()
      .from(cartoes)
      .where(and(eq(cartoes.id, cartaoId), eq(cartoes.userId, userId)));

    if (!cartao) {
      return NextResponse.json({ error: "Cartão não encontrado ou acesso negado" }, { status: 404 });
    }

    const diaFechamento = cartao.diaFechamento || 1;

    // ── Período da fatura ──────────────────────────────────────────────────
    // Regra: transações do dia de fechamento do mês anterior (inclusive)
    //        até o dia ANTES do fechamento do mês atual (exclusive o dia de fechamento)
    //
    // Ex: fatura março, fecha dia 9
    //   inicio = 09/fev (inclusive) — primeiro dia do ciclo
    //   fim    = 09/mar (exclusive) — dia do fechamento NÃO pertence a esta fatura
    //
    // Usa < (lt) em vez de <= (lte) no fim para excluir o dia de fechamento,
    // que já pertence à fatura do próximo mês.

    const anoMesAnterior = mes === 1 ? ano - 1 : ano;
    const mesAnterior    = mes === 1 ? 12 : mes - 1;
    const ultimoDiaMesAnterior = new Date(Date.UTC(anoMesAnterior, mesAnterior, 0)).getUTCDate();
    const diaInicio = Math.min(diaFechamento, ultimoDiaMesAnterior);

    // Constrói datas em UTC puro para evitar distorção de fuso
    // O campo data no banco é timestamp with timezone salvo em UTC
    const inicio = new Date(Date.UTC(anoMesAnterior, mesAnterior - 1, diaInicio, 0, 0, 0));

    // fim exclusivo em UTC: meia-noite UTC do dia de fechamento (não inclui esse dia)
    const ultimoDiaMesAtual = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
    const diaFim = Math.min(diaFechamento, ultimoDiaMesAtual);
    const fimExclusivo = new Date(Date.UTC(ano, mes - 1, diaFim, 0, 0, 0));


    const transacoesDoMes = await db
      .select()
      .from(transacoes)
      .where(
        and(
          eq(transacoes.cartaoId, cartaoId),
          eq(transacoes.userId, userId),
          gte(transacoes.data, inicio),
          lt(transacoes.data, fimExclusivo)   // < exclusivo: exclui o dia do fechamento
        )
      )
      .orderBy(transacoes.data);

    const [fatura] = await db
      .select()
      .from(faturas)
      .where(
        and(
          eq(faturas.cartaoId, cartaoId),
          eq(faturas.userId, userId),
          eq(faturas.ano, ano),
          eq(faturas.mes, mes)
        )
      );

    const totalCalculado = transacoesDoMes.reduce((acc, t) => acc + Number(t.valor), 0);

    let faturaAtual = fatura;

    if (!fatura && transacoesDoMes.length > 0) {
      const [novaFatura] = await db
        .insert(faturas)
        .values({
          userId,
          cartaoId,
          ano,
          mes,
          total: totalCalculado.toFixed(2),
          paga: false,
          dataPagamento: null,
        })
        .returning();
      faturaAtual = novaFatura;
    }

    if (faturaAtual && !faturaAtual.paga && Number(faturaAtual.total) !== totalCalculado) {
      [faturaAtual] = await db
        .update(faturas)
        .set({ total: totalCalculado.toFixed(2), updatedAt: new Date() })
        .where(and(eq(faturas.id, faturaAtual.id), eq(faturas.userId, userId)))
        .returning();
    }

    const porCategoria: Record<string, number> = {};
    transacoesDoMes.forEach((t) => {
      const categoria = t.categoria || "Sem categoria";
      porCategoria[categoria] = (porCategoria[categoria] || 0) + Number(t.valor);
    });

    const diaVencimento = cartao.diaVencimento || 1;
    const dataVencimento = calcularDataVencimento(mes, ano, diaVencimento);
    const dataVencimentoStr = dataVencimento.toISOString().split("T")[0];

    const hoje = new Date();
    let status: "PAGA" | "EM_ABERTO" | "ATRASADA";
    if (faturaAtual?.paga) {
      status = "PAGA";
    } else if (hoje > dataVencimento) {
      status = "ATRASADA";
    } else {
      status = "EM_ABERTO";
    }

    return NextResponse.json({
      fatura: faturaAtual ? {
        id: faturaAtual.id,
        cartaoId,
        mes,
        ano,
        total: Number(faturaAtual.total),
        paga: faturaAtual.paga,
        dataPagamento: faturaAtual.dataPagamento,
        contaPagamentoId: faturaAtual.contaPagamentoId,
        dataVencimento: dataVencimentoStr,
        status,
      } : null,
      cartao: {
        id: cartao.id,
        nome: cartao.nome,
        limite: Number(cartao.limite),
        limiteDisponivel: Number(cartao.limiteDisponivel),
        diaFechamento: cartao.diaFechamento,
        diaVencimento: cartao.diaVencimento,
      },
      periodo: {
        inicio: inicio.toISOString().split("T")[0],
        fim: new Date(ano, mes - 1, diaFim - 1, 23, 59, 59).toISOString().split("T")[0],
        descricao: `${inicio.toLocaleDateString("pt-BR")} - ${new Date(ano, mes - 1, diaFim - 1).toLocaleDateString("pt-BR")}`,
      },
      transacoes: transacoesDoMes.map(t => ({ ...t, valor: Number(t.valor) })),
      porCategoria,
      totalTransacoes: totalCalculado,
    });
  } catch (error) {
    console.error("Erro ao buscar fatura:", error);
    const message = error instanceof Error ? error.message : "Erro ao buscar fatura";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ========================================
// POST - Pagar fatura
// ========================================
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { id } = await params;
    const cartaoId = Number(id);

    if (!cartaoId) {
      return NextResponse.json({ error: "Cartão inválido" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const ano = Number(searchParams.get("ano"));
    const mes = Number(searchParams.get("mes"));

    if (isNaN(ano) || isNaN(mes) || mes < 1 || mes > 12) {
      return NextResponse.json({ error: "Ano ou mês inválido" }, { status: 400 });
    }

    const { contaId, dataPagamento } = await req.json();

    if (!contaId || !/^[0-9a-f-]{36}$/i.test(contaId)) {
      return NextResponse.json({ error: "Conta inválida" }, { status: 400 });
    }

    const dataPgto = dataPagamento ? new Date(dataPagamento) : new Date();
    const dataPgtoStr = dataPgto.toISOString().split("T")[0];

    /* 1. Buscar fatura */
    const [fatura] = await db
      .select()
      .from(faturas)
      .where(
        and(
          eq(faturas.cartaoId, cartaoId),
          eq(faturas.userId, userId),
          eq(faturas.ano, ano),
          eq(faturas.mes, mes)
        )
      );

    if (!fatura) return NextResponse.json({ error: "Fatura não encontrada" }, { status: 404 });
    if (fatura.paga) return NextResponse.json({ error: "Fatura já foi paga" }, { status: 400 });

    const totalFatura = Number(fatura.total);
    if (totalFatura <= 0) {
      return NextResponse.json({ error: "Fatura sem valor para pagamento" }, { status: 400 });
    }

    /* 2. Buscar conta */
    const [conta] = await db
      .select()
      .from(contas)
      .where(and(eq(contas.id, contaId), eq(contas.userId, userId)));

    if (!conta) return NextResponse.json({ error: "Conta não encontrada" }, { status: 404 });
    if (!conta.ativo) return NextResponse.json({ error: "Conta inativa não pode realizar pagamentos" }, { status: 400 });

    const saldoAntes = Number(conta.saldoAtual);
    if (saldoAntes < totalFatura) {
      return NextResponse.json({ error: "Saldo insuficiente para pagamento da fatura" }, { status: 400 });
    }

    const saldoDepois = saldoAntes - totalFatura;

    /* 3. Buscar cartão */
    const [cartao] = await db
      .select()
      .from(cartoes)
      .where(and(eq(cartoes.id, cartaoId), eq(cartoes.userId, userId)));

    if (!cartao) return NextResponse.json({ error: "Cartão não encontrado" }, { status: 404 });

    /* 4. Registrar no extrato */
    await db.insert(extratoConta).values({
      userId,
      contaId,
      data: dataPgtoStr,
      tipo: "saida",
      valor: totalFatura.toFixed(2),
      descricao: `Pagamento fatura ${cartao.nome} - ${String(mes).padStart(2, "0")}/${ano}`,
      saldoApos: saldoDepois.toFixed(2),
      origem: "PAGAMENTO_FATURA",
      referenciaId: fatura.id.toString(),
    });

    /* 5. Atualizar saldo da conta */
    await db
      .update(contas)
      .set({ saldoAtual: saldoDepois.toFixed(2), updatedAt: new Date() })
      .where(and(eq(contas.id, contaId), eq(contas.userId, userId)));

    /* 6. Liberar limite do cartão */
    await db
      .update(cartoes)
      .set({ limiteDisponivel: sql`CAST(${cartoes.limiteDisponivel} AS NUMERIC) + ${totalFatura}` })
      .where(and(eq(cartoes.id, cartaoId), eq(cartoes.userId, userId)));

    /* 7. Marcar fatura como paga */
    await db
      .update(faturas)
      .set({ paga: true, dataPagamento: dataPgtoStr, contaPagamentoId: contaId, updatedAt: new Date() })
      .where(eq(faturas.id, fatura.id));

    /* 8. Criar notificação de confirmação de pagamento */
    await db.insert(notificacoes).values({
      userId,
      tipo: "FATURA_PAGA",
      severidade: "success",
      titulo: `Fatura ${cartao.nome} paga com sucesso!`,
      mensagem: `Fatura de ${String(mes).padStart(2, "0")}/${ano} no valor de R$ ${totalFatura.toFixed(2)} foi paga em ${dataPgto.toLocaleDateString("pt-BR")}.`,
      link: `/cartoes/${cartaoId}/fatura?mes=${mes}&ano=${ano}`,
      metadata: {
        cartaoId: String(cartaoId),
        mes: String(mes),
        ano: String(ano),
        total: String(totalFatura),
      },
    });

    /* 9. Retornar dados completos */
    const diaFechamento = cartao.diaFechamento || 1;
    const anoMesAnterior = mes === 1 ? ano - 1 : ano;
    const mesAnterior    = mes === 1 ? 12 : mes - 1;
    const ultimoDiaMesAnterior = new Date(Date.UTC(anoMesAnterior, mesAnterior, 0)).getUTCDate();
    const diaInicio = Math.min(diaFechamento, ultimoDiaMesAnterior);
    const inicio = new Date(Date.UTC(anoMesAnterior, mesAnterior - 1, diaInicio, 0, 0, 0));
    const ultimoDiaMesAtual = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
    const diaFim = Math.min(diaFechamento, ultimoDiaMesAtual);
    const fimExclusivo = new Date(Date.UTC(ano, mes - 1, diaFim, 0, 0, 0));

    const transacoesDoMes = await db
      .select()
      .from(transacoes)
      .where(
        and(
          eq(transacoes.cartaoId, cartaoId),
          eq(transacoes.userId, userId),
          gte(transacoes.data, inicio),
          lt(transacoes.data, fimExclusivo)
        )
      )
      .orderBy(transacoes.data);

    const porCategoria: Record<string, number> = {};
    transacoesDoMes.forEach((t) => {
      const categoria = t.categoria || "Sem categoria";
      porCategoria[categoria] = (porCategoria[categoria] || 0) + Number(t.valor);
    });

    const diaVencimento = cartao.diaVencimento || 1;
    const dataVencimento = calcularDataVencimento(mes, ano, diaVencimento);

    return NextResponse.json({
      fatura: {
        id: fatura.id,
        cartaoId,
        mes,
        ano,
        total: totalFatura,
        paga: true,
        dataPagamento: dataPgtoStr,
        contaPagamentoId: contaId,
        dataVencimento: dataVencimento.toISOString().split("T")[0],
        status: "PAGA" as const,
      },
      cartao: {
        id: cartao.id,
        nome: cartao.nome,
        limite: Number(cartao.limite),
        limiteDisponivel: Number(cartao.limiteDisponivel) + totalFatura,
        diaFechamento: cartao.diaFechamento,
        diaVencimento: cartao.diaVencimento,
      },
      periodo: {
        inicio: inicio.toISOString().split("T")[0],
        fim: new Date(ano, mes - 1, diaFim - 1, 23, 59, 59).toISOString().split("T")[0],
        descricao: `${inicio.toLocaleDateString("pt-BR")} - ${new Date(ano, mes - 1, diaFim - 1).toLocaleDateString("pt-BR")}`,
      },
      transacoes: transacoesDoMes.map(t => ({ ...t, valor: Number(t.valor) })),
      porCategoria,
      totalTransacoes: totalFatura,
    });

  } catch (error: any) {
    console.error("Erro ao pagar fatura:", error);
    const message = error instanceof Error ? error.message : "Erro ao pagar fatura";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ========================================
// DELETE - Estornar pagamento
// ========================================
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { id } = await params;
    const cartaoId = Number(id);

    if (!cartaoId) {
      return NextResponse.json({ error: "Cartão inválido" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const ano = Number(searchParams.get("ano"));
    const mes = Number(searchParams.get("mes"));

    if (isNaN(ano) || isNaN(mes) || mes < 1 || mes > 12) {
      return NextResponse.json({ error: "Ano ou mês inválido" }, { status: 400 });
    }

    /* 1. Buscar fatura */
    const [fatura] = await db
      .select()
      .from(faturas)
      .where(
        and(
          eq(faturas.cartaoId, cartaoId),
          eq(faturas.userId, userId),
          eq(faturas.ano, ano),
          eq(faturas.mes, mes)
        )
      );

    if (!fatura) return NextResponse.json({ error: "Fatura não encontrada" }, { status: 404 });
    if (!fatura.paga) return NextResponse.json({ error: "Fatura não está paga" }, { status: 400 });
    if (!fatura.contaPagamentoId) return NextResponse.json({ error: "Conta de pagamento não identificada" }, { status: 400 });

    const totalFatura = Number(fatura.total);

    /* 2. Buscar conta */
    const [conta] = await db
      .select()
      .from(contas)
      .where(and(eq(contas.id, fatura.contaPagamentoId), eq(contas.userId, userId)));

    if (!conta) return NextResponse.json({ error: "Conta não encontrada" }, { status: 404 });

    const novoSaldo = Number(conta.saldoAtual) + totalFatura;

    /* 3. Buscar cartão */
    const [cartao] = await db
      .select()
      .from(cartoes)
      .where(and(eq(cartoes.id, cartaoId), eq(cartoes.userId, userId)));

    if (!cartao) return NextResponse.json({ error: "Cartão não encontrado" }, { status: 404 });

    /* 4. Registrar estorno no extrato */
    const dataFormatada = new Date().toISOString().split("T")[0];

    await db.insert(extratoConta).values({
      userId,
      contaId: fatura.contaPagamentoId,
      data: dataFormatada,
      tipo: "entrada",
      valor: totalFatura.toFixed(2),
      descricao: `Estorno pagamento fatura ${cartao.nome} - ${String(mes).padStart(2, "0")}/${ano}`,
      saldoApos: novoSaldo.toFixed(2),
      origem: "ESTORNO",
      referenciaId: fatura.id.toString(),
    });

    /* 5. Atualizar saldo da conta */
    await db
      .update(contas)
      .set({ saldoAtual: novoSaldo.toFixed(2), updatedAt: new Date() })
      .where(and(eq(contas.id, fatura.contaPagamentoId), eq(contas.userId, userId)));

    /* 6. Bloquear limite do cartão novamente */
    await db
      .update(cartoes)
      .set({ limiteDisponivel: sql`CAST(${cartoes.limiteDisponivel} AS NUMERIC) - ${totalFatura}` })
      .where(and(eq(cartoes.id, cartaoId), eq(cartoes.userId, userId)));

    /* 7. Marcar fatura como não paga */
    await db
      .update(faturas)
      .set({ paga: false, dataPagamento: null, contaPagamentoId: null, updatedAt: new Date() })
      .where(eq(faturas.id, fatura.id));

    /* 8. Retornar dados completos */
    const diaFechamento = cartao.diaFechamento || 1;
    const anoMesAnterior = mes === 1 ? ano - 1 : ano;
    const mesAnterior    = mes === 1 ? 12 : mes - 1;
    const ultimoDiaMesAnterior = new Date(Date.UTC(anoMesAnterior, mesAnterior, 0)).getUTCDate();
    const diaInicio = Math.min(diaFechamento, ultimoDiaMesAnterior);
    const inicio = new Date(Date.UTC(anoMesAnterior, mesAnterior - 1, diaInicio, 0, 0, 0));
    const ultimoDiaMesAtual = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
    const diaFim = Math.min(diaFechamento, ultimoDiaMesAtual);
    const fimExclusivo = new Date(Date.UTC(ano, mes - 1, diaFim, 0, 0, 0));

    const transacoesDoMes = await db
      .select()
      .from(transacoes)
      .where(
        and(
          eq(transacoes.cartaoId, cartaoId),
          eq(transacoes.userId, userId),
          gte(transacoes.data, inicio),
          lt(transacoes.data, fimExclusivo)
        )
      )
      .orderBy(transacoes.data);

    const porCategoria: Record<string, number> = {};
    transacoesDoMes.forEach((t) => {
      const categoria = t.categoria || "Sem categoria";
      porCategoria[categoria] = (porCategoria[categoria] || 0) + Number(t.valor);
    });

    const diaVencimento = cartao.diaVencimento || 1;
    const dataVencimento = calcularDataVencimento(mes, ano, diaVencimento);
    const hoje = new Date();
    const status = hoje > dataVencimento ? "ATRASADA" : "EM_ABERTO";

    return NextResponse.json({
      fatura: {
        id: fatura.id,
        cartaoId,
        mes,
        ano,
        total: totalFatura,
        paga: false,
        dataPagamento: null,
        contaPagamentoId: null,
        dataVencimento: dataVencimento.toISOString().split("T")[0],
        status: status as "ATRASADA" | "EM_ABERTO",
      },
      cartao: {
        id: cartao.id,
        nome: cartao.nome,
        limite: Number(cartao.limite),
        limiteDisponivel: Number(cartao.limiteDisponivel) - totalFatura,
        diaFechamento: cartao.diaFechamento,
        diaVencimento: cartao.diaVencimento,
      },
      periodo: {
        inicio: inicio.toISOString().split("T")[0],
        fim: new Date(ano, mes - 1, diaFim - 1, 23, 59, 59).toISOString().split("T")[0],
        descricao: `${inicio.toLocaleDateString("pt-BR")} - ${new Date(ano, mes - 1, diaFim - 1).toLocaleDateString("pt-BR")}`,
      },
      transacoes: transacoesDoMes.map(t => ({ ...t, valor: Number(t.valor) })),
      porCategoria,
      totalTransacoes: totalFatura,
    });

  } catch (error: any) {
    console.error("Erro ao estornar pagamento:", error);
    const message = error instanceof Error ? error.message : "Erro ao estornar pagamento";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}