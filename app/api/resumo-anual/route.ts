// src/app/api/resumo-anual/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { transacoes, cartoes } from "@/db/schema";
import { and, eq, gte, lt } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import { calcularFaturaDaTransacao } from "@/utils/faturaUtils";

/**
 * GET /api/resumo-anual?ano=2025
 *
 * Retorna dados agregados do ano para a página "Resumo do Ano".
 *
 * Response: {
 *   ano, anoAnterior,
 *   totais:            { receitas, despesas, saldo },
 *   totaisAnteriores:  { receitas, despesas, saldo },
 *   meses:             [{ mes, receitas, despesas, saldo }] × 12,
 *   mesesAnteriores:   [{ mes, receitas, despesas, saldo }] × 12,
 *   categorias:        [{ categoria, total, percentual }],
 *   metodosPagamento:  [{ metodo, quantidade, total, percentual }],
 *   maiorReceita:      Transacao | null,
 *   maiorDespesa:      Transacao | null,
 *   mediaMensal:       { receitas, despesas },
 *   melhorMes:         { mes, saldo },
 *   piorMes:           { mes, saldo },
 * }
 */
export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const ano         = Number(searchParams.get("ano")) || new Date().getFullYear();
    const anoAnterior = ano - 1;

    const [txAno, txAnterior, cartoesDb] = await Promise.all([
      db.select().from(transacoes).where(
        and(
          eq(transacoes.userId, userId),
          gte(transacoes.data, new Date(ano, 0, 1)),
          lt(transacoes.data, new Date(ano + 1, 0, 1))
        )
      ),
      db.select().from(transacoes).where(
        and(
          eq(transacoes.userId, userId),
          gte(transacoes.data, new Date(anoAnterior, 0, 1)),
          lt(transacoes.data, new Date(ano, 0, 1))
        )
      ),
      db.select().from(cartoes).where(eq(cartoes.userId, userId)),
    ]);

    const cartoesMap = new Map(cartoesDb.map((c) => [c.id, c]));

    function agregar(txList: typeof txAno, anoRef: number) {
      const meses = Array.from({ length: 12 }, (_, i) => ({
        mes: i + 1, receitas: 0, despesas: 0, saldo: 0,
      }));

      const categoriaMap:      Record<string, number>                               = {};
      const metodoPagamentoMap: Record<string, { quantidade: number; total: number }> = {};

      let maiorReceita: (typeof txAno)[0] | null = null;
      let maiorDespesa: (typeof txAno)[0] | null = null;

      for (const t of txList) {
        const valor = Number(t.valor);
        const dataT = new Date(t.data);

        if (t.tipo === "entrada") {
          const mesIdx = dataT.getMonth();
          meses[mesIdx].receitas += valor;
          if (!maiorReceita || valor > Number(maiorReceita.valor)) maiorReceita = t;
        }

        // Estorno abate a despesa no mês da fatura em que foi lançado
        if (t.tipo === "estorno" && t.cartaoId) {
          const cartao = cartoesMap.get(t.cartaoId);
          if (cartao) {
            const fatura = calcularFaturaDaTransacao(dataT, cartao.diaFechamento || 1);
            if (fatura.ano === anoRef) meses[fatura.mes - 1].despesas -= valor;
            if (metodoPagamentoMap.cartao) metodoPagamentoMap.cartao.total -= valor;
          }
        }

        if (t.tipo === "saida") {
          // Acumula método de pagamento
          const metodo = t.formaPagamento || "dinheiro";
          if (!metodoPagamentoMap[metodo]) {
            metodoPagamentoMap[metodo] = { quantidade: 0, total: 0 };
          }
          metodoPagamentoMap[metodo].quantidade += 1;
          metodoPagamentoMap[metodo].total      += valor;

          // Cartão de crédito: usa ciclo de fatura
          if (t.formaPagamento === "cartao" && t.cartaoId) {
            const cartao = cartoesMap.get(t.cartaoId);
            if (cartao && cartao.tipo === "credito") {
              const diaFech = cartao.diaFechamento || 1;
              const { mes: mesFat, ano: anoFat } = calcularFaturaDaTransacao(dataT, diaFech);
              if (anoFat === anoRef) {
                meses[mesFat - 1].despesas += valor;
              }
              if (!maiorDespesa || valor > Number(maiorDespesa.valor)) maiorDespesa = t;
              continue;
            }
          }

          const mesIdx = dataT.getMonth();
          meses[mesIdx].despesas += valor;
          if (!maiorDespesa || valor > Number(maiorDespesa.valor)) maiorDespesa = t;

          const cat = t.categoria || "Outros";
          categoriaMap[cat] = (categoriaMap[cat] || 0) + valor;
        }
      }

      meses.forEach((m) => { m.saldo = m.receitas - m.despesas; });

      const totais = meses.reduce(
        (acc, m) => ({
          receitas: acc.receitas + m.receitas,
          despesas: acc.despesas + m.despesas,
          saldo:    acc.saldo    + m.saldo,
        }),
        { receitas: 0, despesas: 0, saldo: 0 }
      );

      const totalDespesas = totais.despesas || 1;

      // Top 5 categorias
      const categorias = Object.entries(categoriaMap)
        .map(([categoria, total]) => ({
          categoria,
          total,
          percentual: Math.round((total / totalDespesas) * 100),
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

      // Todos os métodos ordenados por total gasto
      const totalMetodos = Object.values(metodoPagamentoMap)
        .reduce((s, m) => s + m.total, 0) || 1;

      const metodosPagamento = Object.entries(metodoPagamentoMap)
        .map(([metodo, stats]) => ({
          metodo,
          quantidade: stats.quantidade,
          total:      stats.total,
          percentual: Math.round((stats.total / totalMetodos) * 100),
        }))
        .sort((a, b) => b.total - a.total);

      const mesesComMovimento = meses.filter((m) => m.receitas > 0 || m.despesas > 0);
      const melhorMes = mesesComMovimento.length
        ? mesesComMovimento.reduce((a, b) => (a.saldo > b.saldo ? a : b))
        : null;
      const piorMes = mesesComMovimento.length
        ? mesesComMovimento.reduce((a, b) => (a.saldo < b.saldo ? a : b))
        : null;

      const mesesComReceita = meses.filter((m) => m.receitas > 0).length || 1;
      const mesesComDespesa = meses.filter((m) => m.despesas > 0).length || 1;

      return {
        meses, totais, categorias, metodosPagamento,
        maiorReceita, maiorDespesa,
        mediaMensal: {
          receitas: totais.receitas / mesesComReceita,
          despesas: totais.despesas / mesesComDespesa,
        },
        melhorMes, piorMes,
      };
    }

    const atual    = agregar(txAno,      ano);
    const anterior = agregar(txAnterior, anoAnterior);

    return NextResponse.json({
      ano, anoAnterior,
      totais:           atual.totais,
      meses:            atual.meses,
      categorias:       atual.categorias,
      metodosPagamento: atual.metodosPagamento,
      maiorReceita:     atual.maiorReceita,
      maiorDespesa:     atual.maiorDespesa,
      mediaMensal:      atual.mediaMensal,
      melhorMes:        atual.melhorMes,
      piorMes:          atual.piorMes,
      totaisAnteriores: anterior.totais,
      mesesAnteriores:  anterior.meses,
    });
  } catch (error: any) {
    console.error("Erro ao carregar resumo anual:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao carregar resumo anual" },
      { status: 500 }
    );
  }
}