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
    const filtros = [eq(transacoes.userId, userId)];

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
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Erro ao buscar transações: " + err.message },
      { status: 500 }
    );
  }
}

// POST - Criar transação(ões) em BATCH
export async function POST(req: NextRequest) {
  try {
    // 🔐 Autenticação
    const userId = await getUserIdFromSession();

    const json = await req.json();
    
    // ✅ Suportar tanto objeto único quanto array
    const transacoesArray = Array.isArray(json) ? json : [json];
    
    console.log(`📥 Recebido ${transacoesArray.length} transação(ões)`);

    const transacoesCriadas = [];

    // Processar cada transação
    for (const trans of transacoesArray) {
      // Validações básicas
      if (!trans.tipo || !["entrada", "saida"].includes(trans.tipo)) {
        return NextResponse.json(
          { error: "Tipo de transação inválido" },
          { status: 400 }
        );
      }

      if (trans.tipo === "entrada" && !trans.contaId) {
        return NextResponse.json(
          { error: "Conta é obrigatória para receitas" },
          { status: 400 }
        );
      }

      if (trans.tipo === "saida" && trans.formaPagamento !== "cartao" && !trans.contaId) {
        return NextResponse.json(
          { error: "Conta é obrigatória para despesas com dinheiro/PIX" },
          { status: 400 }
        );
      }

      if (!trans.data || isNaN(new Date(trans.data).getTime())) {
        return NextResponse.json({ error: "Data inválida" }, { status: 400 });
      }

      if (trans.formaPagamento === "cartao" && !trans.cartaoId) {
        return NextResponse.json(
          { error: "Cartão é obrigatório quando forma de pagamento for 'cartao'" },
          { status: 400 }
        );
      }

      const valorNum = Number(trans.valor);
      if (isNaN(valorNum) || valorNum <= 0) {
        return NextResponse.json({ error: "Valor inválido" }, { status: 400 });
      }

      // 1. Verificar conta (se aplicável)
      if (trans.contaId) {
        const [conta] = await db
          .select()
          .from(contas)
          .where(and(eq(contas.id, trans.contaId), eq(contas.userId, userId)))
          .limit(1);

        if (!conta) {
          return NextResponse.json({ error: "Conta não encontrada" }, { status: 404 });
        }

        if (!conta.ativo) {
          return NextResponse.json({ error: "Conta inativa" }, { status: 400 });
        }

        // Verificar saldo para saídas (exceto cartão)
        if (trans.tipo === "saida" && trans.formaPagamento !== "cartao") {
          const saldoAtual = Number(conta.saldoAtual);
          if (saldoAtual < valorNum) {
            return NextResponse.json({ error: "Saldo insuficiente" }, { status: 400 });
          }
        }
      }

      // 2. Verificar cartão (se aplicável)
      if (trans.cartaoId) {
        const [cartao] = await db
          .select()
          .from(cartoes)
          .where(and(eq(cartoes.id, Number(trans.cartaoId)), eq(cartoes.userId, userId)))
          .limit(1);

        if (!cartao) {
          return NextResponse.json({ error: "Cartão não encontrado" }, { status: 404 });
        }

        if (!cartao.ativo) {
          return NextResponse.json({ error: "Cartão inativo" }, { status: 400 });
        }

        if (cartao.tipo === "credito" && trans.tipo === "saida") {
          const limiteDisponivel = Number(cartao.limiteDisponivel);
          if (limiteDisponivel < valorNum) {
            return NextResponse.json(
              { error: "Limite insuficiente no cartão" },
              { status: 400 }
            );
          }
        }
      }

      // 3. ✅ CRIAR TRANSAÇÃO COM TODOS OS CAMPOS
      const [novaTransacao] = await db
        .insert(transacoes)
        .values({
          userId,
          tipo: trans.tipo,
          valor: valorNum.toFixed(2),
          data: new Date(trans.data),
          descricao: trans.descricao || null,
          categoria: trans.categoria || null,
          formaPagamento: trans.formaPagamento || "dinheiro",
          contaId: trans.contaId || null,
          cartaoId: trans.cartaoId ? Number(trans.cartaoId) : null,
          
          // ✅ CRÍTICO: Campos de parcelamento/recorrência
          parcelado: trans.parcelado || false,
          parcelamentoId: trans.parcelamentoId || null,
          parcelas: trans.parcelas || null,
          parcelaAtual: trans.parcelaAtual || null,
          
          recorrente: trans.recorrente || false,
          recorrenciaId: trans.recorrenciaId || null,
          repeticoes: trans.repeticoes || null,
        })
        .returning();

      transacoesCriadas.push(novaTransacao);

      // 4. Atualizar saldo da conta (se não for cartão)
      if (trans.contaId && trans.formaPagamento !== "cartao") {
        const [conta] = await db
          .select()
          .from(contas)
          .where(eq(contas.id, trans.contaId))
          .limit(1);

        const saldoAtual = Number(conta.saldoAtual);
        const novoSaldo = trans.tipo === "entrada" 
          ? saldoAtual + valorNum 
          : saldoAtual - valorNum;

        await db
          .update(contas)
          .set({
            saldoAtual: novoSaldo.toFixed(2),
            updatedAt: new Date(),
          })
          .where(and(eq(contas.id, trans.contaId), eq(contas.userId, userId)));

        // Registrar no extrato
        const dataFormatada = new Date(trans.data).toISOString().split("T")[0];
        
        await db.insert(extratoConta).values({
          userId,
          contaId: trans.contaId,
          data: dataFormatada,
          tipo: trans.tipo === "entrada" ? "entrada" : "saida",
          valor: valorNum.toFixed(2),
          descricao: trans.descricao || "Transação manual",
          saldoApos: novoSaldo.toFixed(2),
          origem: "TRANSACAO_MANUAL",
          referenciaId: novaTransacao.id,
        });
      }

      // 5. Atualizar/criar fatura (se for cartão)
      if (trans.cartaoId && trans.formaPagamento === "cartao") {
        const dataTransacao = new Date(trans.data);
        const mes = dataTransacao.getMonth() + 1;
        const ano = dataTransacao.getFullYear();

        const [faturaExistente] = await db
          .select()
          .from(faturas)
          .where(
            and(
              eq(faturas.cartaoId, Number(trans.cartaoId)),
              eq(faturas.userId, userId),
              eq(faturas.mes, mes),
              eq(faturas.ano, ano)
            )
          )
          .limit(1);

        if (faturaExistente) {
          const totalAtual = Number(faturaExistente.total);
          const novoTotal = totalAtual + valorNum;

          await db
            .update(faturas)
            .set({
              total: novoTotal.toFixed(2),
              updatedAt: new Date(),
            })
            .where(eq(faturas.id, faturaExistente.id));
        } else {
          await db.insert(faturas).values({
            userId,
            cartaoId: Number(trans.cartaoId),
            mes,
            ano,
            total: valorNum.toFixed(2),
            paga: false,
          });
        }

        // Atualizar limite
        await db
          .update(cartoes)
          .set({
            limiteDisponivel: sql`CAST(${cartoes.limiteDisponivel} AS NUMERIC) - ${valorNum}`,
          })
          .where(and(eq(cartoes.id, Number(trans.cartaoId)), eq(cartoes.userId, userId)));
      }
    }

    console.log(`✅ ${transacoesCriadas.length} transação(ões) criada(s)`);

    // Retornar array se recebeu array, objeto único se recebeu objeto
    return NextResponse.json(
      Array.isArray(json) ? transacoesCriadas : transacoesCriadas[0],
      { status: 201 }
    );
    
  } catch (err: any) {
    console.error("❌ Erro ao criar transação:", err);

    if (err instanceof Error && err.message === "Não autenticado") {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    return NextResponse.json(
      { error: err.message || "Erro ao criar transação" },
      { status: 500 }
    );
  }
}