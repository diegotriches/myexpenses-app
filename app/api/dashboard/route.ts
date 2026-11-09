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
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // Validar parâmetros
    const { searchParams } = new URL(req.url);
    const mes = Number(searchParams.get("mes"));
    const ano = Number(searchParams.get("ano"));

    if (!mes || !ano) {
      return NextResponse.json(
        { error: "Mês e ano são obrigatórios" },
        { status: 400 },
      );
    }

    if (mes < 1 || mes > 12) {
      return NextResponse.json(
        { error: "Mês deve estar entre 1 e 12" },
        { status: 400 },
      );
    }

    // Calcular período — amplia o início para pegar o mês anterior inteiro,
    // necessário porque compras de cartão no mês anterior podem pertencer
    // à fatura do mês atual (depende do diaFechamento de cada cartão)
    const inicioMes = new Date(ano, mes - 1, 1);
    const fimMes = new Date(ano, mes, 1);
    const inicioMesAnterior = new Date(ano, mes - 2, 1); // amplia a busca

    // 🔐 Buscar todas as transações do período do usuário
    const todas = await db
      .select()
      .from(transacoes)
      .where(
        and(
          eq(transacoes.userId, userId),
          gte(transacoes.data, inicioMesAnterior),
          lt(transacoes.data, fimMes),
        ),
      );

    // 🔐 Buscar cartões do usuário (necessário para calcular ciclo de fechamento)
    const cartoesDb = await db
      .select()
      .from(cartoes)
      .where(eq(cartoes.userId, userId));

    // Mapear cartões por ID para acesso rápido
    const cartoesMap = new Map(cartoesDb.map((c) => [c.id, c]));

    let receitas = 0;
    let despesas = 0;
    let quantidadeReceitas = 0;
    let quantidadeDespesas = 0;

    // Agrupamento por cartão (apenas para info adicional)
    const faturasPorCartao: Record<number, number> = {};

    for (const t of todas) {
      const valor = Number(t.valor);
      const dataTransacao = new Date(t.data);
      const dentroDoMesVisualizado =
        dataTransacao >= inicioMes && dataTransacao < fimMes;

      if (t.tipo === "entrada") {
        // ✅ Receitas: só contam se a transação em si for do mês visualizado
        if (dentroDoMesVisualizado) {
          receitas += valor;
          quantidadeReceitas++;
        }
      }

      // Estorno abate a despesa na fatura em que foi lançado
      if (t.tipo === "estorno" && t.cartaoId) {
        const cartao = cartoesMap.get(t.cartaoId);
        if (cartao) {
          const fatura = calcularFaturaDaTransacao(new Date(t.data), cartao.diaFechamento || 1);
          if (fatura.mes === mes && fatura.ano === ano) {
            despesas -= valor;
            faturasPorCartao[t.cartaoId] = (faturasPorCartao[t.cartaoId] || 0) - valor;
          }
        }
      }

      if (t.tipo === "saida") {
        if (t.formaPagamento !== "cartao" || !t.cartaoId) {
          // ✅ Não-cartão: só conta se a transação for do mês visualizado
          if (dentroDoMesVisualizado) {
            despesas += valor;
            quantidadeDespesas++;
          }
        } else {
          // ✅ Cartão: usa a lógica de fatura, independente do mês da transação em si
          const cartao = cartoesMap.get(t.cartaoId);
          if (cartao) {
            const diaFechamento = cartao.diaFechamento || 1;
            const { mes: mesFatura, ano: anoFatura } =
              calcularFaturaDaTransacao(new Date(t.data), diaFechamento);
            if (mesFatura === mes && anoFatura === ano) {
              despesas += valor;
              quantidadeDespesas++;
              faturasPorCartao[t.cartaoId] =
                (faturasPorCartao[t.cartaoId] || 0) + valor;
            }
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
          eq(faturas.ano, ano),
        ),
      );

    // Mapear status de pagamento por cartão
    const statusPagamento = new Map<number, boolean>();
    faturasDb.forEach((f) => {
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
      { status: 500 },
    );
  }
}
