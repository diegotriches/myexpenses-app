import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { transacoes, faturas, contas, extratoConta, cartoes } from "@/db/schema";
import { eq, and, gte, lt, sql } from "drizzle-orm";
import { getUserIdFromSession } from "@/lib/auth/helpers";

// ========================================
// GET - Buscar fatura do mês
// ========================================
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 🔐 Autenticação
    const userId = await getUserIdFromSession();

    const { id } = await params;
    const cartaoId = Number(id);

    const { searchParams } = new URL(req.url);
    const ano = Number(searchParams.get("ano"));
    const mes = Number(searchParams.get("mes"));

    if (!cartaoId || isNaN(ano) || isNaN(mes) || mes < 1 || mes > 12) {
      return NextResponse.json(
        { error: "Parâmetros inválidos" },
        { status: 400 }
      );
    }

    // 🔐 Verificar se o cartão pertence ao usuário
    const [cartao] = await db
      .select()
      .from(cartoes)
      .where(
        and(
          eq(cartoes.id, cartaoId),
          eq(cartoes.userId, userId)
        )
      );

    if (!cartao) {
      return NextResponse.json(
        { error: "Cartão não encontrado ou acesso negado" },
        { status: 404 }
      );
    }

    /* 1. Intervalo do mês (mes recebido como 1–12) */
    const inicioMes = new Date(ano, mes - 1, 1);
    const fimMes = new Date(ano, mes, 1);

    /* 2. Transações do cartão no período - 🔐 filtrar por userId */
    const transacoesDoMes = await db
      .select()
      .from(transacoes)
      .where(
        and(
          eq(transacoes.cartaoId, cartaoId),
          eq(transacoes.userId, userId),
          gte(transacoes.data, inicioMes),
          lt(transacoes.data, fimMes)
        )
      )
      .orderBy(transacoes.data);

    /* 3. Buscar fatura (se existir) - 🔐 filtrar por userId */
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

    /* 4. Calcular total das transações */
    const totalCalculado = transacoesDoMes.reduce(
      (acc, t) => acc + Number(t.valor),
      0
    );

    /* 5. Se não existe fatura e há transações, criar automaticamente */
    let faturaAtual = fatura;
    
    if (!fatura && transacoesDoMes.length > 0) {
      const [novaFatura] = await db
        .insert(faturas)
        .values({
          userId, // 🔐 Adicionar
          cartaoId,
          ano,
          mes,
          total: totalCalculado.toFixed(2), // ✅ Converter para string
          paga: false,
          dataPagamento: null,
        })
        .returning();
      
      faturaAtual = novaFatura;
    }

    /* 6. Resumo por categoria */
    const porCategoria: Record<string, number> = {};
    transacoesDoMes.forEach((t) => {
      const categoria = t.categoria || "Sem categoria";
      porCategoria[categoria] = (porCategoria[categoria] || 0) + Number(t.valor);
    });

    /* 7. Resposta */
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
      } : null,
      cartao: {
        id: cartao.id,
        nome: cartao.nome,
        limite: Number(cartao.limite),
        limiteDisponivel: Number(cartao.limiteDisponivel),
      },
      transacoes: transacoesDoMes.map(t => ({
        ...t,
        valor: Number(t.valor),
      })),
      porCategoria,
      totalTransacoes: totalCalculado,
    });
  } catch (error) {
    console.error("Erro ao buscar fatura:", error);

    if (error instanceof Error && error.message === "Não autenticado") {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Erro ao buscar fatura" },
      { status: 500 }
    );
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
    // 🔐 Autenticação
    const userId = await getUserIdFromSession();

    const { id } = await params;
    const cartaoId = Number(id);

    if (!cartaoId) {
      return NextResponse.json(
        { error: "Cartão inválido" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    const ano = Number(searchParams.get("ano"));
    const mes = Number(searchParams.get("mes"));

    if (isNaN(ano) || isNaN(mes) || mes < 1 || mes > 12) {
      return NextResponse.json(
        { error: "Ano ou mês inválido" },
        { status: 400 }
      );
    }

    const { contaId, dataPagamento } = await req.json();

    if (!contaId || !/^[0-9a-f-]{36}$/i.test(contaId)) {
      return NextResponse.json(
        { error: "Conta inválida" },
        { status: 400 }
      );
    }

    const dataPgto = dataPagamento ? new Date(dataPagamento) : new Date();
    const dataPgtoStr = dataPgto.toISOString().split("T")[0];

    /* ========================================
       ✅ SEM TRANSACTION - Operações Sequenciais
       ======================================== */

    /* 1. Buscar fatura - 🔐 verificar userId */
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

    if (!fatura) {
      return NextResponse.json(
        { error: "Fatura não encontrada" },
        { status: 404 }
      );
    }

    if (fatura.paga) {
      return NextResponse.json(
        { error: "Fatura já foi paga" },
        { status: 400 }
      );
    }

    const totalFatura = Number(fatura.total);
    
    if (totalFatura <= 0) {
      return NextResponse.json(
        { error: "Fatura sem valor para pagamento" },
        { status: 400 }
      );
    }

    /* 2. Buscar conta - 🔐 verificar userId */
    const [conta] = await db
      .select()
      .from(contas)
      .where(
        and(
          eq(contas.id, contaId),
          eq(contas.userId, userId)
        )
      );

    if (!conta) {
      return NextResponse.json(
        { error: "Conta não encontrada" },
        { status: 404 }
      );
    }

    if (!conta.ativo) {
      return NextResponse.json(
        { error: "Conta inativa não pode realizar pagamentos" },
        { status: 400 }
      );
    }

    // ✅ Converter string para number
    const saldoAntes = Number(conta.saldoAtual);
    
    if (saldoAntes < totalFatura) {
      return NextResponse.json(
        { error: "Saldo insuficiente para pagamento da fatura" },
        { status: 400 }
      );
    }

    const saldoDepois = saldoAntes - totalFatura;

    /* 3. Buscar informações do cartão - 🔐 verificar userId */
    const [cartao] = await db
      .select()
      .from(cartoes)
      .where(
        and(
          eq(cartoes.id, cartaoId),
          eq(cartoes.userId, userId)
        )
      );

    if (!cartao) {
      return NextResponse.json(
        { error: "Cartão não encontrado" },
        { status: 404 }
      );
    }

    /* 4. Registrar no extrato da conta - 🔐 incluir userId */
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
      .set({ 
        saldoAtual: saldoDepois.toFixed(2),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(contas.id, contaId),
          eq(contas.userId, userId)
        )
      );

    /* 6. Liberar limite do cartão */
    await db
      .update(cartoes)
      .set({
        limiteDisponivel: sql`CAST(${cartoes.limiteDisponivel} AS NUMERIC) + ${totalFatura}`,
      })
      .where(
        and(
          eq(cartoes.id, cartaoId),
          eq(cartoes.userId, userId)
        )
      );

    /* 7. Marcar fatura como paga */
    await db
      .update(faturas)
      .set({
        paga: true,
        dataPagamento: dataPgtoStr,
        contaPagamentoId: contaId,
        updatedAt: new Date(),
      })
      .where(eq(faturas.id, fatura.id));

    return NextResponse.json({ 
      success: true,
      message: "Fatura paga com sucesso"
    });
    
  } catch (error: any) {
    console.error("Erro ao pagar fatura:", error);

    if (error instanceof Error && error.message === "Não autenticado") {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Erro ao pagar fatura" },
      { status: 500 }
    );
  }
}

// ========================================
// DELETE - Estornar pagamento de fatura
// ========================================
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 🔐 Autenticação
    const userId = await getUserIdFromSession();

    const { id } = await params;
    const cartaoId = Number(id);

    if (!cartaoId) {
      return NextResponse.json(
        { error: "Cartão inválido" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    const ano = Number(searchParams.get("ano"));
    const mes = Number(searchParams.get("mes"));

    if (isNaN(ano) || isNaN(mes) || mes < 1 || mes > 12) {
      return NextResponse.json(
        { error: "Ano ou mês inválido" },
        { status: 400 }
      );
    }

    /* ========================================
       ✅ SEM TRANSACTION - Operações Sequenciais
       ======================================== */

    /* 1. Buscar fatura - 🔐 verificar userId */
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

    if (!fatura) {
      return NextResponse.json(
        { error: "Fatura não encontrada" },
        { status: 404 }
      );
    }

    if (!fatura.paga) {
      return NextResponse.json(
        { error: "Fatura não está paga" },
        { status: 400 }
      );
    }

    if (!fatura.contaPagamentoId) {
      return NextResponse.json(
        { error: "Conta de pagamento não identificada" },
        { status: 400 }
      );
    }

    const totalFatura = Number(fatura.total);

    /* 2. Buscar conta de pagamento - 🔐 verificar userId */
    const [conta] = await db
      .select()
      .from(contas)
      .where(
        and(
          eq(contas.id, fatura.contaPagamentoId),
          eq(contas.userId, userId)
        )
      );

    if (!conta) {
      return NextResponse.json(
        { error: "Conta não encontrada" },
        { status: 404 }
      );
    }

    // ✅ Converter string para number
    const saldoAtual = Number(conta.saldoAtual);
    const novoSaldo = saldoAtual + totalFatura; // Devolve o valor

    /* 3. Buscar informações do cartão - 🔐 verificar userId */
    const [cartao] = await db
      .select()
      .from(cartoes)
      .where(
        and(
          eq(cartoes.id, cartaoId),
          eq(cartoes.userId, userId)
        )
      );

    if (!cartao) {
      return NextResponse.json(
        { error: "Cartão não encontrado" },
        { status: 404 }
      );
    }

    /* 4. Registrar estorno no extrato - 🔐 incluir userId */
    const dataAtual = new Date();
    const dataFormatada = dataAtual.toISOString().split('T')[0];

    await db.insert(extratoConta).values({
      userId,
      contaId: fatura.contaPagamentoId,
      data: dataFormatada,
      tipo: "entrada", // Estorno devolve o dinheiro
      valor: totalFatura.toFixed(2),
      descricao: `Estorno pagamento fatura ${cartao.nome} - ${String(mes).padStart(2, "0")}/${ano}`,
      saldoApos: novoSaldo.toFixed(2),
      origem: "ESTORNO",
      referenciaId: fatura.id.toString(),
    });

    /* 5. Atualizar saldo da conta (devolver o valor) */
    await db
      .update(contas)
      .set({ 
        saldoAtual: novoSaldo.toFixed(2),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(contas.id, fatura.contaPagamentoId),
          eq(contas.userId, userId)
        )
      );

    /* 6. Bloquear limite do cartão novamente */
    await db
      .update(cartoes)
      .set({
        limiteDisponivel: sql`CAST(${cartoes.limiteDisponivel} AS NUMERIC) - ${totalFatura}`,
      })
      .where(
        and(
          eq(cartoes.id, cartaoId),
          eq(cartoes.userId, userId)
        )
      );

    /* 7. Marcar fatura como não paga */
    await db
      .update(faturas)
      .set({
        paga: false,
        dataPagamento: null,
        contaPagamentoId: null,
        updatedAt: new Date(),
      })
      .where(eq(faturas.id, fatura.id));

    return NextResponse.json({ 
      success: true,
      message: "Pagamento estornado com sucesso"
    });
    
  } catch (error: any) {
    console.error("Erro ao estornar pagamento:", error);

    if (error instanceof Error && error.message === "Não autenticado") {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Erro ao estornar pagamento" },
      { status: 500 }
    );
  }
}