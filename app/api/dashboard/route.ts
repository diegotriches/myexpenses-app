// src/app/api/dashboard/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { transacoes, cartoes, faturas } from "@/db/schema";
import { and, gte, lt, eq } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import { calcularFaturaDaTransacao } from "@/utils/faturaUtils";

/**
 * GET /api/dashboard?mes=1&ano=2026
 * Retorna resumo completo do dashboard para o período
 * 
 * ✅ CORRIGIDO: Despesas de cartão só são contabilizadas se a fatura pertence ao mês atual
 * 
 * Response: {
 *   periodo: { mes, ano },
 *   resumo: { receitas, despesas, saldo, quantidadeReceitas, quantidadeDespesas },
 *   cartoes: [{ cartaoId, nome, totalFatura, paga }]
 * }
 */
export async function GET(req: NextRequest) {
  try {
    // 🔐 Autenticação (padrão do projeto)
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    // Validar parâmetros
    const { searchParams } = new URL(req.url);
    const mes = Number(searchParams.get("mes"));
    const ano = Number(searchParams.get("ano"));

    if (!mes || !ano) {
      return NextResponse.json(
        { error: "Mês e ano são obrigatórios" },
        { status: 400 }
      );
    }

    if (mes < 1 || mes > 12) {
      return NextResponse.json(
        { error: "Mês deve estar entre 1 e 12" },
        { status: 400 }
      );
    }

    // Calcular período
    const inicioMes = new Date(ano, mes - 1, 1);
    const fimMes = new Date(ano, mes, 1);

    // 🔐 Buscar todas as transações do período do usuário
    const todas = await db
      .select()
      .from(transacoes)
      .where(
        and(
          eq(transacoes.userId, userId),
          gte(transacoes.data, inicioMes),
          lt(transacoes.data, fimMes)
        )
      );

    // 🔐 Buscar cartões do usuário (necessário para calcular ciclo de fechamento)
    const cartoesDb = await db
      .select()
      .from(cartoes)
      .where(eq(cartoes.userId, userId));

    // Mapear cartões por ID para acesso rápido
    const cartoesMap = new Map(cartoesDb.map(c => [c.id, c]));

    let receitas = 0;
    let despesas = 0;
    let quantidadeReceitas = 0;
    let quantidadeDespesas = 0;

    // Agrupamento por cartão (apenas para info adicional)
    const faturasPorCartao: Record<number, number> = {};

    // ✅ PROCESSAR TRANSAÇÕES COM LÓGICA CORRIGIDA
    for (const t of todas) {
      const valor = Number(t.valor);

      // ✅ RECEITAS: Somar direto
      if (t.tipo === "entrada") {
        receitas += valor;
        quantidadeReceitas++;
      }

      // ✅ DESPESAS: Verificar se é cartão ou não
      if (t.tipo === "saida") {
        // ✅ DESPESA NÃO É CARTÃO: Somar direto (dinheiro, PIX, débito)
        if (t.formaPagamento !== "cartao" || !t.cartaoId) {
          despesas += valor;
          quantidadeDespesas++;
        } 
        // ✅ DESPESA É CARTÃO: Verificar ciclo de fechamento
        else {
          const cartao = cartoesMap.get(t.cartaoId);
          
          if (cartao) {
            const diaFechamento = cartao.diaFechamento || 1;
            
            // Calcular qual fatura a transação pertence
            const { mes: mesFatura, ano: anoFatura } = calcularFaturaDaTransacao(
              new Date(t.data),
              diaFechamento
            );
            
            // ✅ SÓ CONTABILIZAR SE A FATURA FOR DO MÊS/ANO ATUAL
            if (mesFatura === mes && anoFatura === ano) {
              despesas += valor;
              quantidadeDespesas++;
              faturasPorCartao[t.cartaoId] = (faturasPorCartao[t.cartaoId] || 0) + valor;
            }
            // ❌ Se a fatura for de outro mês, NÃO contabilizar aqui
            // (será contabilizada em "Despesas Futuras")
          }
        }
      }
    }

    // 🔐 Buscar faturas do período para saber status de pagamento
    const faturasDb = await db
      .select({
        cartaoId: faturas.cartaoId,
        paga: faturas.paga,
      })
      .from(faturas)
      .innerJoin(cartoes, eq(faturas.cartaoId, cartoes.id))
      .where(
        and(
          eq(cartoes.userId, userId),
          eq(faturas.mes, mes),
          eq(faturas.ano, ano)
        )
      );

    // Mapear status de pagamento por cartão
    const statusPagamento = new Map<number, boolean>();
    faturasDb.forEach(f => {
      statusPagamento.set(f.cartaoId, f.paga);
    });

    // Montar resumo de cartões com status correto
    const cartoesResumo = cartoesDb.map((c) => ({
      cartaoId: c.id,
      nome: c.nome,
      totalFatura: faturasPorCartao[c.id] || 0,
      paga: statusPagamento.get(c.id) || false,
    }));

    return NextResponse.json({
      periodo: { mes, ano },
      resumo: {
        receitas,
        despesas,
        saldo: receitas - despesas,
        quantidadeReceitas,
        quantidadeDespesas,
      },
      cartoes: cartoesResumo,
    });
  } catch (error: any) {
    console.error("Erro ao carregar dashboard:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao carregar dashboard" },
      { status: 500 }
    );
  }
}