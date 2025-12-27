import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { transacoes, faturas, contas, extratoConta, cartoes } from "@/db/schema";
import { eq, and, gte, lt, sql } from "drizzle-orm";

// ========================================
// GET - Buscar fatura do mês
// ========================================
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    /* 1. Intervalo do mês (mes recebido como 1–12) */
    const inicioMes = new Date(ano, mes - 1, 1);
    const fimMes = new Date(ano, mes, 1);

    /* 2. Transações do cartão no período */
    const transacoesDoMes = await db
      .select()
      .from(transacoes)
      .where(
        and(
          eq(transacoes.cartaoId, cartaoId),
          gte(transacoes.data, inicioMes),
          lt(transacoes.data, fimMes)
        )
      )
      .orderBy(transacoes.data);

    /* 3. Buscar fatura (se existir) */
    const [fatura] = await db
      .select()
      .from(faturas)
      .where(
        and(
          eq(faturas.cartaoId, cartaoId),
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
          cartaoId,
          ano,
          mes,
          total: totalCalculado.toString(),
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

    /* 7. Buscar informações do cartão */
    const [cartao] = await db
      .select()
      .from(cartoes)
      .where(eq(cartoes.id, cartaoId));

    /* 8. Resposta */
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
      cartao: cartao ? {
        id: cartao.id,
        nome: cartao.nome,
        limite: Number(cartao.limite),
        limiteDisponivel: Number(cartao.limiteDisponivel),
      } : null,
      transacoes: transacoesDoMes.map(t => ({
        ...t,
        valor: Number(t.valor),
      })),
      porCategoria,
      totalTransacoes: totalCalculado,
    });
  } catch (error) {
    console.error("Erro ao buscar fatura:", error);
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

    await db.transaction(async (trx) => {
      /* 1. Buscar fatura */
      const [fatura] = await trx
        .select()
        .from(faturas)
        .where(
          and(
            eq(faturas.cartaoId, cartaoId),
            eq(faturas.ano, ano),
            eq(faturas.mes, mes)
          )
        );

      if (!fatura) {
        throw new Error("FATURA_NAO_EXISTE");
      }

      if (fatura.paga) {
        throw new Error("FATURA_JA_PAGA");
      }

      const totalFatura = Number(fatura.total);
      
      if (totalFatura <= 0) {
        throw new Error("FATURA_SEM_VALOR");
      }

      /* 2. Buscar conta */
      const [conta] = await trx
        .select()
        .from(contas)
        .where(eq(contas.id, contaId));

      if (!conta) {
        throw new Error("CONTA_NAO_ENCONTRADA");
      }

      if (!conta.ativo) {
        throw new Error("CONTA_INATIVA");
      }

      const saldoAntes = Number(conta.saldoAtual);
      
      if (saldoAntes < totalFatura) {
        throw new Error("SALDO_INSUFICIENTE");
      }

      const saldoDepois = saldoAntes - totalFatura;

      /* 3. Buscar informações do cartão */
      const [cartao] = await trx
        .select()
        .from(cartoes)
        .where(eq(cartoes.id, cartaoId));

      if (!cartao) {
        throw new Error("CARTAO_NAO_ENCONTRADO");
      }

      /* 4. Registrar no extrato da conta */
      await trx.insert(extratoConta).values({
        contaId,
        data: dataPgtoStr,
        tipo: "saida",
        valor: totalFatura.toString(),
        descricao: `Pagamento fatura ${cartao.nome} - ${String(mes).padStart(2, "0")}/${ano}`,
        saldoApos: saldoDepois.toString(),
        origem: "PAGAMENTO_FATURA",
        referenciaId: fatura.id.toString(),
      });

      /* 5. Atualizar saldo da conta */
      await trx
        .update(contas)
        .set({ 
          saldoAtual: saldoDepois.toString(),
          updatedAt: new Date(),
        })
        .where(eq(contas.id, contaId));

      /* 6. Liberar limite do cartão */
      await trx
        .update(cartoes)
        .set({
          limiteDisponivel: sql`${cartoes.limiteDisponivel} + ${totalFatura}`,
        })
        .where(eq(cartoes.id, cartaoId));

      /* 7. Marcar fatura como paga */
      await trx
        .update(faturas)
        .set({
          paga: true,
          dataPagamento: dataPgtoStr,
          contaPagamentoId: contaId,
          updatedAt: new Date(),
        })
        .where(eq(faturas.id, fatura.id));
    });

    return NextResponse.json({ 
      success: true,
      message: "Fatura paga com sucesso"
    });
    
  } catch (error: any) {
    console.error("Erro ao pagar fatura:", error);

    const errorMessages: Record<string, { message: string; status: number }> = {
      SALDO_INSUFICIENTE: { message: "Saldo insuficiente para pagamento da fatura", status: 400 },
      FATURA_JA_PAGA: { message: "Fatura já foi paga", status: 400 },
      FATURA_SEM_VALOR: { message: "Fatura sem valor para pagamento", status: 400 },
      FATURA_NAO_EXISTE: { message: "Fatura não encontrada", status: 404 },
      CONTA_NAO_ENCONTRADA: { message: "Conta não encontrada", status: 404 },
      CONTA_INATIVA: { message: "Conta inativa não pode realizar pagamentos", status: 400 },
      CARTAO_NAO_ENCONTRADO: { message: "Cartão não encontrado", status: 404 },
    };

    const errorInfo = errorMessages[error.message] || { 
      message: "Erro ao pagar fatura", 
      status: 500 
    };

    return NextResponse.json(
      { error: errorInfo.message },
      { status: errorInfo.status }
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

    await db.transaction(async (trx) => {
      /* 1. Buscar fatura */
      const [fatura] = await trx
        .select()
        .from(faturas)
        .where(
          and(
            eq(faturas.cartaoId, cartaoId),
            eq(faturas.ano, ano),
            eq(faturas.mes, mes)
          )
        );

      if (!fatura) {
        throw new Error("FATURA_NAO_EXISTE");
      }

      if (!fatura.paga) {
        throw new Error("FATURA_NAO_PAGA");
      }

      if (!fatura.contaPagamentoId) {
        throw new Error("CONTA_PAGAMENTO_NAO_IDENTIFICADA");
      }

      const totalFatura = Number(fatura.total);

      /* 2. Buscar conta de pagamento */
      const [conta] = await trx
        .select()
        .from(contas)
        .where(eq(contas.id, fatura.contaPagamentoId));

      if (!conta) {
        throw new Error("CONTA_NAO_ENCONTRADA");
      }

      const saldoAtual = Number(conta.saldoAtual);
      const novoSaldo = saldoAtual + totalFatura; // Devolve o valor

      /* 3. Buscar informações do cartão */
      const [cartao] = await trx
        .select()
        .from(cartoes)
        .where(eq(cartoes.id, cartaoId));

      if (!cartao) {
        throw new Error("CARTAO_NAO_ENCONTRADO");
      }

      /* 4. Registrar estorno no extrato */
      const dataAtual = new Date();
      const dataFormatada = dataAtual.toISOString().split('T')[0];

      await trx.insert(extratoConta).values({
        contaId: fatura.contaPagamentoId,
        data: dataFormatada,
        tipo: "entrada", // Estorno devolve o dinheiro
        valor: totalFatura.toString(),
        descricao: `Estorno pagamento fatura ${cartao.nome} - ${String(mes).padStart(2, "0")}/${ano}`,
        saldoApos: novoSaldo.toString(),
        origem: "ESTORNO",
        referenciaId: fatura.id.toString(),
      });

      /* 5. Atualizar saldo da conta (devolver o valor) */
      await trx
        .update(contas)
        .set({ 
          saldoAtual: novoSaldo.toString(),
          updatedAt: new Date(),
        })
        .where(eq(contas.id, fatura.contaPagamentoId));

      /* 6. Bloquear limite do cartão novamente */
      await trx
        .update(cartoes)
        .set({
          limiteDisponivel: sql`${cartoes.limiteDisponivel} - ${totalFatura}`,
        })
        .where(eq(cartoes.id, cartaoId));

      /* 7. Marcar fatura como não paga */
      await trx
        .update(faturas)
        .set({
          paga: false,
          dataPagamento: null,
          contaPagamentoId: null,
          updatedAt: new Date(),
        })
        .where(eq(faturas.id, fatura.id));
    });

    return NextResponse.json({ 
      success: true,
      message: "Pagamento estornado com sucesso"
    });
    
  } catch (error: any) {
    console.error("Erro ao estornar pagamento:", error);

    const errorMessages: Record<string, { message: string; status: number }> = {
      FATURA_NAO_EXISTE: { message: "Fatura não encontrada", status: 404 },
      FATURA_NAO_PAGA: { message: "Fatura não está paga", status: 400 },
      CONTA_PAGAMENTO_NAO_IDENTIFICADA: { message: "Conta de pagamento não identificada", status: 400 },
      CONTA_NAO_ENCONTRADA: { message: "Conta não encontrada", status: 404 },
      CARTAO_NAO_ENCONTRADO: { message: "Cartão não encontrado", status: 404 },
    };

    const errorInfo = errorMessages[error.message] || { 
      message: "Erro ao estornar pagamento", 
      status: 500 
    };

    return NextResponse.json(
      { error: errorInfo.message },
      { status: errorInfo.status }
    );
  }
}