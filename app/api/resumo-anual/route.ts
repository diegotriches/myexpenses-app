import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { transacoes, cartoes, contas, extratoConta } from "@/db/schema";
import { and, eq, gte, lt, sql, sum } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import { respostaDeErro } from "@/lib/rota";
import { hojeBrt } from "@/utils/aplicacaoSimulacao";
import { agregarAno, compararCategorias, type CartaoResumo } from "@/utils/resumoAnualUtils";
import { centavos, valorAssinado } from "@/lib/saldoExtrato";

/**
 * GET /api/resumo-anual?ano=2025
 *
 * Dados agregados do ano para a página "Resumo do Ano" (regras em utils/resumoAnualUtils.ts).
 * No ano corrente, o período vai de janeiro até o mês atual, e a comparação com o ano
 * anterior usa o mesmo intervalo (`periodoComparado.ateMes`).
 *
 * Response: {
 *   ano, anoAnterior, periodoComparado: { ateMes },
 *   totais, totaisAnteriores (mesmo período),
 *   meses (12), mesesAnteriores (12, ano anterior inteiro, para o gráfico),
 *   categorias: [{ categoria, total, percentual, totalAnterior, variacao }],
 *   metodosPagamento, maiorReceita, maiorDespesa, mediaMensal, melhorMes, piorMes,
 *   contas: [{ id, nome, ativo, saldoInicio (31/12 do ano anterior), saldoFim (31/12 ou hoje) }]
 * }
 */
export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const [anoHoje, mesHoje] = hojeBrt().split("-").map(Number);
    const { searchParams } = new URL(req.url);
    const ano = Number(searchParams.get("ano")) || anoHoje;
    const anoAnterior = ano - 1;
    const ateMes = ano === anoHoje ? mesHoje : 12;

    // Compras no crédito contam pela fatura: as de dezembro do ano anterior ao
    // comparado podem cair em janeiro dele, por isso a busca começa em 1º de dezembro
    // Saldo de cada conta numa data = saldo atual − extrato depois dela (lib/saldoExtrato.ts).
    // No ano corrente o fim é hoje: vale o saldo atual, como na página Contas
    const inicioPeriodo = `${anoAnterior}-12-31`;
    const fimPeriodo = `${ano}-12-31`;
    const depoisDe = (data: string) =>
      sum(sql<string>`case when ${extratoConta.data} > ${data} then ${valorAssinado} else 0 end`);

    const [lista, cartoesDb, contasDb, extratoDepois] = await Promise.all([
      db.select().from(transacoes).where(
        and(
          eq(transacoes.userId, userId),
          gte(transacoes.data, new Date(Date.UTC(anoAnterior - 1, 11, 1))),
          lt(transacoes.data, new Date(Date.UTC(ano + 1, 0, 1))),
        ),
      ),
      db.select().from(cartoes).where(eq(cartoes.userId, userId)),
      db.select({ id: contas.id, nome: contas.nome, ativo: contas.ativo, saldoAtual: contas.saldoAtual })
        .from(contas).where(eq(contas.userId, userId)),
      db.select({ contaId: extratoConta.contaId, depoisInicio: depoisDe(inicioPeriodo), depoisFim: depoisDe(fimPeriodo) })
        .from(extratoConta).where(eq(extratoConta.userId, userId)).groupBy(extratoConta.contaId),
    ]);

    const extratoPorConta = new Map(extratoDepois.map((e) => [e.contaId, e]));
    const contasNoPeriodo = contasDb.map((c) => {
      const saldoAtual = Number(c.saldoAtual);
      const e = extratoPorConta.get(c.id);
      return {
        id: c.id,
        nome: c.nome,
        ativo: c.ativo,
        saldoInicio: centavos(saldoAtual - Number(e?.depoisInicio ?? 0)),
        saldoFim: ano >= anoHoje ? centavos(saldoAtual) : centavos(saldoAtual - Number(e?.depoisFim ?? 0)),
      };
    });

    const mapaCartoes = new Map<number, CartaoResumo>(
      cartoesDb.map((c) => [c.id, { id: c.id, tipo: c.tipo, diaFechamento: c.diaFechamento }]),
    );

    const atual = agregarAno(lista, mapaCartoes, ano, ateMes);
    const mesmoPeriodoAnterior = agregarAno(lista, mapaCartoes, anoAnterior, ateMes);
    const anteriorInteiro = ateMes === 12 ? mesmoPeriodoAnterior : agregarAno(lista, mapaCartoes, anoAnterior, 12);

    return NextResponse.json({
      ano,
      anoAnterior,
      periodoComparado: { ateMes },
      totais:           atual.totais,
      meses:            atual.meses,
      categorias:       compararCategorias(atual.categorias, mesmoPeriodoAnterior.categorias),
      metodosPagamento: atual.metodosPagamento,
      maiorReceita:     atual.maiorReceita,
      maiorDespesa:     atual.maiorDespesa,
      mediaMensal:      atual.mediaMensal,
      melhorMes:        atual.melhorMes,
      piorMes:          atual.piorMes,
      totaisAnteriores: mesmoPeriodoAnterior.totais,
      mesesAnteriores:  anteriorInteiro.meses,
      contas:           contasNoPeriodo,
    });
  } catch (error) {
    return respostaDeErro(error, "Erro ao carregar resumo anual");
  }
}
