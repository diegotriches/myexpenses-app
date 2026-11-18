import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  aplicacoes, aportesAplicacao, resgatesAplicacao, taxasDiarias, contas, rendimentosAplicacao,
} from "@/db/schema";
import { eq, and, inArray, desc } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import { movimentarConta } from "@/lib/movimentacaoConta";
import { hojeBrt } from "@/utils/aplicacaoSimulacao";
import { recalcularAplicacao } from "@/lib/aplicacaoEngine";
import { respostaDeErro } from "@/lib/rota";
import { ehIndexadorTesouro, INDEXADORES, nomeIndexador } from "@/utils/tesouroUtils";
const TRIBUTACOES_VALIDAS = ["isento", "tributavel"];

export async function GET(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const contaId = searchParams.get("contaId");

  const filtros = [eq(aplicacoes.userId, userId)];
  if (contaId) filtros.push(eq(aplicacoes.contaId, contaId));

  const lista = await db.select().from(aplicacoes).where(and(...filtros));
  if (lista.length === 0) return NextResponse.json([]);

  const ids = lista.map((a) => a.id);
  const [aportes, resgates] = await Promise.all([
    db.select().from(aportesAplicacao).where(inArray(aportesAplicacao.aplicacaoId, ids)),
    db.select().from(resgatesAplicacao).where(inArray(resgatesAplicacao.aplicacaoId, ids)),
  ]);

  // última taxa publicada de cada indexador (pra projeção estimada no app)
  const ultimaTaxaPorIndexador = new Map<string, { data: string; taxa: number } | null>();
  for (const indexador of Array.from(new Set(lista.map((a) => a.indexador)))) {
    if (ehIndexadorTesouro(indexador)) continue;
    const [t] = await db.select().from(taxasDiarias)
      .where(eq(taxasDiarias.indexador, indexador))
      .orderBy(desc(taxasDiarias.data)).limit(1);
    ultimaTaxaPorIndexador.set(indexador, t ? { data: t.data, taxa: Number(t.taxaPercentual) } : null);
  }

  // Tesouro: a taxa diária é própria de cada título (taxa contratada e IPCA),
  // então a projeção usa a do último dia calculado da própria aplicação
  const ultimaTaxaPorAplicacao = new Map<string, { data: string; taxa: number }>();
  for (const a of lista) {
    if (!ehIndexadorTesouro(a.indexador)) continue;
    const [r] = await db.select({ data: rendimentosAplicacao.data, taxa: rendimentosAplicacao.taxaAplicada })
      .from(rendimentosAplicacao)
      .where(eq(rendimentosAplicacao.aplicacaoId, a.id))
      .orderBy(desc(rendimentosAplicacao.data)).limit(1);
    if (r) ultimaTaxaPorAplicacao.set(a.id, { data: r.data, taxa: Number(r.taxa) });
  }

  // IPCA+: último IPCA publicado, para avisar que os meses seguintes são estimados
  let ultimoIpca: { mes: string; taxa: number } | null = null;
  if (lista.some((a) => a.indexador === "ipca")) {
    const [t] = await db.select().from(taxasDiarias)
      .where(eq(taxasDiarias.indexador, "ipca"))
      .orderBy(desc(taxasDiarias.data)).limit(1);
    if (t) ultimoIpca = { mes: t.data.slice(0, 7), taxa: Number(t.taxaPercentual) };
  }

  return NextResponse.json(
    lista.map((a) => ({
      ...a,
      aportes: aportes.filter((x) => x.aplicacaoId === a.id).sort((x, y) => (x.data < y.data ? -1 : 1)),
      resgates: resgates.filter((x) => x.aplicacaoId === a.id).sort((x, y) => (x.data < y.data ? -1 : 1)),
      ultimaTaxa: ehIndexadorTesouro(a.indexador)
        ? ultimaTaxaPorAplicacao.get(a.id) ?? null
        : ultimaTaxaPorIndexador.get(a.indexador) ?? null,
      ultimoIpca: a.indexador === "ipca" ? ultimoIpca : null,
    }))
  );
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const body = await req.json();
    const {
      contaId, descricao, valor, indexador, percentualIndexador,
      dataVencimento, tributacao, dataAplicacao, rendeNoDiaAporte, movimentarConta: movimentarSaldo,
      taxaAnual,
    } = body;

    if (!contaId) return NextResponse.json({ error: "contaId é obrigatório" }, { status: 400 });

    const valorNum = Number(valor);
    if (isNaN(valorNum) || valorNum <= 0)
      return NextResponse.json({ error: "Valor inválido" }, { status: 400 });

    if (!INDEXADORES.includes(indexador))
      return NextResponse.json({ error: "indexador deve ser 'cdi', 'selic', 'prefixado' ou 'ipca'" }, { status: 400 });

    // Tesouro (Prefixado, IPCA+): rende pela taxa contratada, a 100%, e sempre tem vencimento
    const tesouro = ehIndexadorTesouro(indexador);
    let percentualNum = 100;
    let taxaAnualNum: number | null = null;
    if (tesouro) {
      taxaAnualNum = Number(taxaAnual);
      if (isNaN(taxaAnualNum) || taxaAnualNum <= 0 || taxaAnualNum >= 100)
        return NextResponse.json({ error: "Informe a taxa do título (% ao ano)" }, { status: 400 });
      if (!dataVencimento)
        return NextResponse.json({ error: "Título do Tesouro precisa da data de vencimento" }, { status: 400 });
    } else {
      percentualNum = Number(percentualIndexador);
      if (isNaN(percentualNum) || percentualNum <= 0)
        return NextResponse.json({ error: "percentualIndexador inválido" }, { status: 400 });
    }

    const tributacaoFinal = tributacao || "tributavel";
    if (!TRIBUTACOES_VALIDAS.includes(tributacaoFinal))
      return NextResponse.json({ error: "tributacao deve ser 'isento' ou 'tributavel'" }, { status: 400 });

    const hoje = hojeBrt();

    // Data do primeiro aporte (padrão: hoje). Data passada calcula o rendimento
    // retroativo e, por padrão, também desconta da conta, com o extrato na data
    // informada. Só não mexe no saldo (registro histórico) com movimentarConta: false
    const dataAporte: string = dataAplicacao || hoje;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataAporte) || isNaN(new Date(dataAporte).getTime()))
      return NextResponse.json({ error: "dataAplicacao inválida" }, { status: 400 });
    if (dataAporte > hoje)
      return NextResponse.json({ error: "A data da aplicação não pode ser futura" }, { status: 400 });
    const retroativa = dataAporte < hoje;
    const historico = retroativa && movimentarSaldo === false;

    let dataVencimentoDate: Date | null = null;
    if (dataVencimento) {
      if (isNaN(new Date(dataVencimento).getTime()))
        return NextResponse.json({ error: "dataVencimento inválida" }, { status: 400 });
      if (String(dataVencimento).slice(0, 10) <= hoje)
        return NextResponse.json({ error: "dataVencimento deve ser no futuro" }, { status: 400 });
      dataVencimentoDate = new Date(dataVencimento);
    }

    const [conta] = await db.select().from(contas)
      .where(and(eq(contas.id, contaId), eq(contas.userId, userId))).limit(1);
    if (!conta)       return NextResponse.json({ error: "Conta não encontrada" }, { status: 404 });
    if (!conta.ativo) return NextResponse.json({ error: "Conta inativa" }, { status: 400 });

    const novaAplicacao = await db.transaction(async (tx) => {
      const [criada] = await tx.insert(aplicacoes).values({
        userId, contaId,
        descricao: descricao || null,
        valorPrincipal: valorNum.toFixed(2),
        valorAtual: valorNum.toFixed(2),
        indexador,
        percentualIndexador: percentualNum.toFixed(2),
        taxaAnual: taxaAnualNum === null ? null : taxaAnualNum.toFixed(4),
        tributacao: tributacaoFinal,
        // true = o aporte já rende a taxa do próprio dia (depende da corretora)
        rendeNoDiaAporte: rendeNoDiaAporte === true,
        dataAplicacao: new Date(`${dataAporte}T12:00:00-03:00`),
        dataVencimento: dataVencimentoDate,
        resgatada: false,
      }).returning();

      await tx.insert(aportesAplicacao).values({
        aplicacaoId: criada.id,
        data: dataAporte,
        valor: valorNum.toFixed(2),
        principalRestante: valorNum.toFixed(8),
        valorAtual: valorNum.toFixed(8),
        contaId,
        historico,
      });

      if (!historico) {
        await movimentarConta(tx, {
          userId, contaId,
          tipo: "saida",
          valor: valorNum,
          data: dataAporte,
          descricao: `Aplicação — ${descricao || nomeIndexador(indexador)}`,
          origem: "APLICACAO",
          referenciaId: criada.id,
          mensagemSaldoInsuficiente: "Saldo insuficiente na conta para aplicar esse valor",
        });
      }

      return criada;
    });

    // aplicação retroativa já nasce com o rendimento calculado até hoje
    if (retroativa) {
      try { await recalcularAplicacao(novaAplicacao.id); }
      catch (e) { console.error("[Aplicações] recálculo inicial falhou:", e); }
    }

    return NextResponse.json(novaAplicacao, { status: 201 });
  } catch (error) {
    return respostaDeErro(error, "Erro ao criar aplicação");
  }
}