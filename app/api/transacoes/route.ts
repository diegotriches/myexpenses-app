// app/api/transacoes/route.ts - ARQUIVO COMPLETO COM SUPORTE A DÉBITO
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { transacoes, contas, cartoes, faturas, extratoConta } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import { calcularFaturaDaTransacao } from "@/utils/faturaUtils";

// GET - Listar transações do usuário
export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId();

    if (!userId) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

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
    const message = err instanceof Error ? err.message : "Erro ao buscar transações";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST - Criar transação(ões) em BATCH
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId();

    if (!userId) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    const json = await req.json();
    
    const transacoesArray = Array.isArray(json) ? json : [json];
    
    console.log(`📥 Recebido ${transacoesArray.length} transação(ões)`);

    const isParcelas = transacoesArray.length > 1 && transacoesArray[0].parcelado === true;
    const isRecorrencia = transacoesArray.length > 1 && transacoesArray[0].recorrente === true;

    const parcelamentoId = isParcelas ? crypto.randomUUID() : null;
    const recorrenciaId = isRecorrencia ? crypto.randomUUID() : null;

    console.log(`🔍 Tipo de transação: ${
      isParcelas ? `Parcelado (${transacoesArray.length}x)` :
      isRecorrencia ? `Recorrente (${transacoesArray.length}x)` :
      'À vista'
    }`);

    const transacoesCriadas = [];

    // Processar cada transação
    for (let index = 0; index < transacoesArray.length; index++) {
      const trans = transacoesArray[index];

      // ========================================
      // 1. VALIDAÇÕES BÁSICAS
      // ========================================
      
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

      // ========================================
      // 2. VERIFICAR CONTA (se aplicável)
      // ========================================
      
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

      // ========================================
      // 3. ✅ VERIFICAR CARTÃO (DÉBITO OU CRÉDITO)
      // ========================================
      
      let cartao = null;
      let contaParaDebito = null;

      if (trans.cartaoId) {
        [cartao] = await db
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

        // ✅ NOVO: Tratar débito como PIX
        if (cartao.tipo === "debito") {
          if (!cartao.contaVinculadaId) {
            return NextResponse.json(
              { error: "Cartão de débito sem conta vinculada" },
              { status: 400 }
            );
          }

          // Buscar conta vinculada
          const [conta] = await db
            .select()
            .from(contas)
            .where(
              and(
                eq(contas.id, cartao.contaVinculadaId),
                eq(contas.userId, userId)
              )
            )
            .limit(1);

          if (!conta) {
            return NextResponse.json(
              { error: "Conta vinculada ao cartão de débito não encontrada" },
              { status: 404 }
            );
          }

          if (!conta.ativo) {
            return NextResponse.json(
              { error: "Conta vinculada ao cartão de débito está inativa" },
              { status: 400 }
            );
          }

          // Verificar saldo
          const saldoConta = Number(conta.saldoAtual);
          if (saldoConta < valorNum) {
            return NextResponse.json(
              { 
                error: `Saldo insuficiente na conta ${conta.nome} (vinculada ao cartão de débito)` 
              },
              { status: 400 }
            );
          }

          contaParaDebito = conta;
        }

        // Validação para crédito
        if (cartao.tipo === "credito" && trans.tipo === "saida") {
          const limiteDisponivel = Number(cartao.limiteDisponivel);
          if (limiteDisponivel < valorNum) {
            return NextResponse.json(
              { error: "Limite insuficiente no cartão de crédito" },
              { status: 400 }
            );
          }
        }
      }

      // ========================================
      // 4. ✅ CRIAR TRANSAÇÃO
      // ========================================
      
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
          
          parcelado: isParcelas,
          parcelamentoId: isParcelas ? parcelamentoId : null,
          parcelas: isParcelas ? transacoesArray.length : null,
          parcelaAtual: isParcelas ? index + 1 : null,
          
          recorrente: isRecorrencia,
          recorrenciaId: isRecorrencia ? recorrenciaId : null,
          repeticoes: isRecorrencia ? transacoesArray.length : null,
        })
        .returning();

      transacoesCriadas.push(novaTransacao);

      if (isParcelas) {
        console.log(
          `📦 Parcela ${index + 1}/${transacoesArray.length} criada | ` +
          `Data: ${new Date(trans.data).toLocaleDateString('pt-BR')} | ` +
          `Valor: R$ ${valorNum.toFixed(2)}`
        );
      }

      // ========================================
      // 5. ✅ PROCESSAMENTO: DÉBITO vs CRÉDITO vs DINHEIRO/PIX
      // ========================================
      
      if (trans.cartaoId && cartao) {
        if (cartao.tipo === "debito" && contaParaDebito) {
          // ===== DÉBITO: Funciona igual PIX =====
          
          const saldoAtual = Number(contaParaDebito.saldoAtual);
          const novoSaldo = saldoAtual - valorNum;

          // Atualizar saldo da conta
          await db
            .update(contas)
            .set({
              saldoAtual: novoSaldo.toFixed(2),
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(contas.id, contaParaDebito.id),
                eq(contas.userId, userId)
              )
            );

          // Registrar no extrato
          const dataFormatada = new Date(trans.data).toISOString().split("T")[0];
          
          await db.insert(extratoConta).values({
            userId,
            contaId: contaParaDebito.id,
            data: dataFormatada,
            tipo: "saida",
            valor: valorNum.toFixed(2),
            descricao: trans.descricao || `Compra no débito - ${cartao.nome}`,
            saldoApos: novoSaldo.toFixed(2),
            origem: "TRANSACAO_MANUAL",
            referenciaId: novaTransacao.id,
          });

          console.log(
            `💳 Débito: R$ ${valorNum.toFixed(2)} debitado de ${contaParaDebito.nome} ` +
            `(Saldo: R$ ${saldoAtual.toFixed(2)} → R$ ${novoSaldo.toFixed(2)})`
          );

        } else if (cartao.tipo === "credito") {
          // ===== CRÉDITO: Vai para fatura =====
          
          const dataTransacao = new Date(trans.data);
          const diaFechamento = cartao.diaFechamento || 1;

          const { mes: mesFatura, ano: anoFatura } = calcularFaturaDaTransacao(
            dataTransacao,
            diaFechamento
          );

          console.log(
            `📅 Transação ${index + 1} em ${dataTransacao.toLocaleDateString('pt-BR')} → ` +
            `Fatura ${mesFatura}/${anoFatura}`
          );

          const [faturaExistente] = await db
            .select()
            .from(faturas)
            .where(
              and(
                eq(faturas.cartaoId, Number(trans.cartaoId)),
                eq(faturas.userId, userId),
                eq(faturas.mes, mesFatura),
                eq(faturas.ano, anoFatura)
              )
            )
            .limit(1);

          if (faturaExistente && faturaExistente.paga) {
            return NextResponse.json(
              { 
                error: `Fatura de ${mesFatura}/${anoFatura} já está paga. Não é possível adicionar transações.` 
              },
              { status: 400 }
            );
          }

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
              mes: mesFatura,
              ano: anoFatura,
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
        
      } else if (trans.contaId && trans.formaPagamento !== "cartao") {
        // ===== DINHEIRO/PIX: Atualizar conta e extrato =====
        
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
    }

    console.log(`✅ ${transacoesCriadas.length} transação(ões) criada(s)`);

    if (isParcelas) {
      console.log(
        `✅ Parcelamento completo: ${transacoesCriadas.length}x | ` +
        `ID: ${parcelamentoId?.slice(0, 8)}...`
      );
    }

    return NextResponse.json(
      Array.isArray(json) ? transacoesCriadas : transacoesCriadas[0],
      { status: 201 }
    );
    
  } catch (err: any) {
    console.error("❌ Erro ao criar transação:", err);
    const message = err instanceof Error ? err.message : "Erro ao criar transação";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}