import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { transacoes, contas, cartoes, faturas, extratoConta } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getUserIdFromSession } from "@/lib/auth/helpers";

// GET - Listar transações do usuário
export async function GET(req: NextRequest) {
  try {
    // 🔐 Autenticação
    const userId = await getUserIdFromSession();

    const { searchParams } = new URL(req.url);
    const ano = searchParams.get("ano");
    const mes = searchParams.get("mes");

    // Filtros dinâmicos
    const filtros = [eq(transacoes.userId, userId)]; // 🔐 SEMPRE filtrar por userId

    // Se tiver filtro de período, aplica
    if (ano && mes) {
      const anoNum = parseInt(ano);
      const mesNum = parseInt(mes);
      
      const inicioMes = new Date(anoNum, mesNum - 1, 1);
      const fimMes = new Date(anoNum, mesNum, 1);

      filtros.push(
        sql`${transacoes.data} >= ${inicioMes} AND ${transacoes.data} < ${fimMes}`
      );
    }

    const result = await db
      .select()
      .from(transacoes)
      .where(and(...filtros))
      .orderBy(sql`${transacoes.data} DESC`);
    
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Erro ao buscar transações:", err);

    if (err instanceof Error && err.message === "Não autenticado") {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Erro ao buscar transações: " + err.message },
      { status: 500 }
    );
  }
}

// POST - Criar transação (SEM db.transaction - neon-http não suporta)
export async function POST(req: NextRequest) {
  try {
    // 🔐 Autenticação
    const userId = await getUserIdFromSession();

    const json = await req.json();
    console.log("📥 JSON recebido:", json);

    // Validações básicas
    if (!json.tipo || !["entrada", "saida"].includes(json.tipo)) {
      return NextResponse.json(
        { error: "Tipo de transação inválido" },
        { status: 400 }
      );
    }

    if (json.tipo === "entrada" && !json.contaId) {
      return NextResponse.json(
        { error: "Conta é obrigatória para receitas" },
        { status: 400 }
      );
    }

    if (json.tipo === "saida" && json.formaPagamento !== "cartao" && !json.contaId) {
      return NextResponse.json(
        { error: "Conta é obrigatória para despesas com dinheiro/PIX" },
        { status: 400 }
      );
    }

    if (!json.data || isNaN(new Date(json.data).getTime())) {
      return NextResponse.json(
        { error: "Data inválida" },
        { status: 400 }
      );
    }

    if (json.formaPagamento === "cartao" && !json.cartaoId) {
      return NextResponse.json(
        { error: "Cartão é obrigatório quando forma de pagamento for 'cartao'" },
        { status: 400 }
      );
    }

    const valorNum = Number(json.valor);
    if (isNaN(valorNum) || valorNum <= 0) {
      return NextResponse.json(
        { error: "Valor inválido" },
        { status: 400 }
      );
    }

    // ===================================================================
    // OPERAÇÕES SEQUENCIAIS (SEM db.transaction - neon-http não suporta)
    // ===================================================================

    // 1. Se tiver contaId, verificar ownership e saldo (para saídas)
    if (json.contaId) {
      const [conta] = await db
        .select()
        .from(contas)
        .where(
          and(
            eq(contas.id, json.contaId),
            eq(contas.userId, userId) // 🔐 Verificar ownership
          )
        )
        .limit(1);

      if (!conta) {
        return NextResponse.json(
          { error: "Conta não encontrada" },
          { status: 404 }
        );
      }

      if (!conta.ativo) {
        return NextResponse.json(
          { error: "Conta inativa" },
          { status: 400 }
        );
      }

      // Verificar saldo apenas para saídas que não são cartão de crédito
      if (json.tipo === "saida" && json.formaPagamento !== "cartao") {
        const saldoAtual = Number(conta.saldoAtual);
        if (saldoAtual < valorNum) {
          return NextResponse.json(
            { error: "Saldo insuficiente" },
            { status: 400 }
          );
        }
      }
    }

    // 2. Se for cartão, verificar ownership
    if (json.cartaoId) {
      const [cartao] = await db
        .select()
        .from(cartoes)
        .where(
          and(
            eq(cartoes.id, Number(json.cartaoId)),
            eq(cartoes.userId, userId) // 🔐 Verificar ownership
          )
        )
        .limit(1);

      if (!cartao) {
        return NextResponse.json(
          { error: "Cartão não encontrado" },
          { status: 404 }
        );
      }

      if (!cartao.ativo) {
        return NextResponse.json(
          { error: "Cartão inativo" },
          { status: 400 }
        );
      }

      // Para cartão de crédito, verificar limite disponível
      if (cartao.tipo === "credito" && json.tipo === "saida") {
        const limiteDisponivel = Number(cartao.limiteDisponivel);
        if (limiteDisponivel < valorNum) {
          return NextResponse.json(
            { error: "Limite insuficiente no cartão" },
            { status: 400 }
          );
        }
      }
    }

    // 3. Criar a transação
    const [novaTransacao] = await db
      .insert(transacoes)
      .values({
        userId, // 🔐 CRÍTICO: Incluir userId
        tipo: json.tipo,
        valor: valorNum.toString(),
        data: new Date(json.data),
        descricao: json.descricao || null,
        categoria: json.categoria || null,
        formaPagamento: json.formaPagamento || "dinheiro",
        contaId: json.contaId || null,
        cartaoId: json.cartaoId ? Number(json.cartaoId) : null,
        recorrente: false,
        parcelado: false,
      })
      .returning();

    // 4. Atualizar saldo da conta (se não for cartão de crédito)
    if (json.contaId && json.formaPagamento !== "cartao") {
      const [conta] = await db
        .select()
        .from(contas)
        .where(eq(contas.id, json.contaId))
        .limit(1);

      const saldoAtual = Number(conta.saldoAtual);
      const novoSaldo = json.tipo === "entrada" 
        ? saldoAtual + valorNum 
        : saldoAtual - valorNum;

      await db
        .update(contas)
        .set({
          saldoAtual: novoSaldo.toString(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(contas.id, json.contaId),
            eq(contas.userId, userId) // 🔐 Garantir ownership
          )
        );

      // ✅ Registrar no extrato da conta
      const dataFormatada = new Date(json.data).toISOString().split("T")[0];
      
      await db.insert(extratoConta).values({
        userId,
        contaId: json.contaId,
        data: dataFormatada,
        tipo: json.tipo === "entrada" ? "entrada" : "saida",
        valor: valorNum.toString(),
        descricao: json.descricao || "Transação manual",
        saldoApos: novoSaldo.toString(),
        origem: "TRANSACAO_MANUAL",
        referenciaId: novaTransacao.id,
      });
    }

    // 5. Atualizar/criar fatura se for cartão de crédito
    if (json.cartaoId && json.formaPagamento === "cartao") {
      const dataTransacao = new Date(json.data);
      const mes = dataTransacao.getMonth() + 1;
      const ano = dataTransacao.getFullYear();

      // Buscar ou criar fatura
      const [faturaExistente] = await db
        .select()
        .from(faturas)
        .where(
          and(
            eq(faturas.cartaoId, Number(json.cartaoId)),
            eq(faturas.userId, userId), // 🔐 Filtrar por userId
            eq(faturas.mes, mes),
            eq(faturas.ano, ano)
          )
        )
        .limit(1);

      if (faturaExistente) {
        // Atualizar fatura existente
        const totalAtual = Number(faturaExistente.total);
        const novoTotal = totalAtual + valorNum;

        await db
          .update(faturas)
          .set({
            total: novoTotal.toString(),
            updatedAt: new Date(),
          })
          .where(eq(faturas.id, faturaExistente.id));
      } else {
        // Criar nova fatura
        await db.insert(faturas).values({
          userId, // 🔐 Incluir userId
          cartaoId: Number(json.cartaoId),
          mes,
          ano,
          total: valorNum.toString(),
          paga: false,
        });
      }

      // Atualizar limite disponível do cartão
      await db
        .update(cartoes)
        .set({
          limiteDisponivel: sql`${cartoes.limiteDisponivel} - ${valorNum}`,
        })
        .where(
          and(
            eq(cartoes.id, Number(json.cartaoId)),
            eq(cartoes.userId, userId) // 🔐 Garantir ownership
          )
        );
    }

    console.log("✅ Transação criada:", novaTransacao);

    return NextResponse.json(novaTransacao, { status: 201 });
    
  } catch (err: any) {
    console.error("❌ Erro ao criar transação:", err);

    if (err instanceof Error && err.message === "Não autenticado") {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: err.message || "Erro ao criar transação" },
      { status: 500 }
    );
  }
}