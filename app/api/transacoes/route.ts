// app/api/transacoes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { transacoes, contas, cartoes, faturas, extratoConta } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import { calcularFaturaDaTransacao, proximaFaturaAberta } from "@/utils/faturaUtils";

// GET - Listar transações do usuário
export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId();

    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const ano = searchParams.get("ano");
    const mes = searchParams.get("mes");

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
      .orderBy(sql`${transacoes.createdAt} DESC`);

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
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const json = await req.json();
    const transacoesArray = Array.isArray(json) ? json : [json];

    console.log(`📥 Recebido ${transacoesArray.length} transação(ões)`);

    const isParcelas = transacoesArray.length > 1 && transacoesArray[0].parcelado === true;
    const isRecorrencia = transacoesArray.length > 1 && transacoesArray[0].recorrente === true;

    const parcelamentoId = isParcelas ? crypto.randomUUID() : null;
    const recorrenciaId  = isRecorrencia ? crypto.randomUUID() : null;

    console.log(`🔍 Tipo: ${
      isParcelas    ? `Parcelado (${transacoesArray.length}x)` :
      isRecorrencia ? `Recorrente (${transacoesArray.length}x)` :
      "À vista"
    }`);

    const transacoesCriadas = [];

    for (let index = 0; index < transacoesArray.length; index++) {
      const trans = transacoesArray[index];

      // ========================================
      // 1. VALIDAÇÕES BÁSICAS
      // ========================================

      if (!trans.tipo || !["entrada", "saida"].includes(trans.tipo)) {
        return NextResponse.json({ error: "Tipo de transação inválido" }, { status: 400 });
      }

      if (trans.tipo === "entrada" && !trans.contaId) {
        return NextResponse.json({ error: "Conta é obrigatória para receitas" }, { status: 400 });
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
        if (trans.tipo === "saida" && trans.formaPagamento !== "cartao") {
          if (Number(conta.saldoAtual) < valorNum) {
            return NextResponse.json({ error: "Saldo insuficiente" }, { status: 400 });
          }
        }
      }

      // ========================================
      // 3. VERIFICAR CARTÃO (DÉBITO OU CRÉDITO)
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

        if (cartao.tipo === "debito") {
          if (!cartao.contaVinculadaId) {
            return NextResponse.json(
              { error: "Cartão de débito sem conta vinculada" },
              { status: 400 }
            );
          }

          const [conta] = await db
            .select()
            .from(contas)
            .where(and(eq(contas.id, cartao.contaVinculadaId), eq(contas.userId, userId)))
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
          if (Number(conta.saldoAtual) < valorNum) {
            return NextResponse.json(
              { error: `Saldo insuficiente na conta ${conta.nome} (vinculada ao cartão de débito)` },
              { status: 400 }
            );
          }

          contaParaDebito = conta;
        }

        if (cartao.tipo === "credito" && trans.tipo === "saida") {
          if (Number(cartao.limiteDisponivel) < valorNum) {
            return NextResponse.json(
              { error: "Limite insuficiente no cartão de crédito" },
              { status: 400 }
            );
          }
        }
      }

      // ========================================
      // 4. CRIAR TRANSAÇÃO
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
          `📦 Parcela ${index + 1}/${transacoesArray.length} | ` +
          `Data: ${new Date(trans.data).toLocaleDateString("pt-BR")} | ` +
          `Valor: R$ ${valorNum.toFixed(2)}`
        );
      }

      // ========================================
      // 5. PROCESSAMENTO: DÉBITO vs CRÉDITO vs DINHEIRO/PIX
      // ========================================

      if (trans.cartaoId && cartao) {

        // ── DÉBITO: funciona igual PIX ──────────────────────────────────────
        if (cartao.tipo === "debito" && contaParaDebito) {
          const saldoAtual = Number(contaParaDebito.saldoAtual);
          const novoSaldo  = saldoAtual - valorNum;

          await db
            .update(contas)
            .set({ saldoAtual: novoSaldo.toFixed(2), updatedAt: new Date() })
            .where(and(eq(contas.id, contaParaDebito.id), eq(contas.userId, userId)));

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
            `💳 Débito: R$ ${valorNum.toFixed(2)} de ${contaParaDebito.nome} ` +
            `(${saldoAtual.toFixed(2)} → ${novoSaldo.toFixed(2)})`
          );

        // ── CRÉDITO: vai para fatura ────────────────────────────────────────
        } else if (cartao.tipo === "credito") {
          // Passa a string diretamente para evitar conversão UTC que distorce o dia
          const dataTransacao = trans.data as string;
          const diaFechamento = cartao.diaFechamento || 1;

          const { mes: mesFaturaCalculada, ano: anoFaturaCalculada } = calcularFaturaDaTransacao(
            dataTransacao,
            diaFechamento
          );

          // Se a fatura calculada já está fechada, avança para a primeira aberta
          const { mes: mesFatura, ano: anoFatura } = proximaFaturaAberta(
            mesFaturaCalculada,
            anoFaturaCalculada,
            diaFechamento
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

          if (faturaExistente) {
            await db
              .update(faturas)
              .set({
                total: (Number(faturaExistente.total) + valorNum).toFixed(2),
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

          await db
            .update(cartoes)
            .set({
              limiteDisponivel: sql`CAST(${cartoes.limiteDisponivel} AS NUMERIC) - ${valorNum}`,
            })
            .where(and(eq(cartoes.id, Number(trans.cartaoId)), eq(cartoes.userId, userId)));
        }

      // ── DINHEIRO/PIX ──────────────────────────────────────────────────────
      } else if (trans.contaId && trans.formaPagamento !== "cartao") {
        const [conta] = await db
          .select()
          .from(contas)
          .where(eq(contas.id, trans.contaId))
          .limit(1);

        const saldoAtual = Number(conta.saldoAtual);
        const novoSaldo  = trans.tipo === "entrada"
          ? saldoAtual + valorNum
          : saldoAtual - valorNum;

        await db
          .update(contas)
          .set({ saldoAtual: novoSaldo.toFixed(2), updatedAt: new Date() })
          .where(and(eq(contas.id, trans.contaId), eq(contas.userId, userId)));

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