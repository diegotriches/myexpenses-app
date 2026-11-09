// src/app/api/aplicacoes/route.ts

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  aplicacoes, aportesAplicacao, resgatesAplicacao, taxasDiarias, contas, 
} from "@/db/schema";
import { eq, and, inArray, desc } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import { movimentarConta } from "@/lib/movimentacaoConta";
import { hojeBrt } from "@/utils/aplicacaoSimulacao";
import { recalcularAplicacao } from "@/lib/aplicacaoEngine";
import { respostaDeErro } from "@/lib/rota";

const INDEXADORES_VALIDOS = ["cdi", "selic"];
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
    const [t] = await db.select().from(taxasDiarias)
      .where(eq(taxasDiarias.indexador, indexador))
      .orderBy(desc(taxasDiarias.data)).limit(1);
    ultimaTaxaPorIndexador.set(indexador, t ? { data: t.data, taxa: Number(t.taxaPercentual) } : null);
  }

  return NextResponse.json(
    lista.map((a) => ({
      ...a,
      aportes: aportes.filter((x) => x.aplicacaoId === a.id).sort((x, y) => (x.data < y.data ? -1 : 1)),
      resgates: resgates.filter((x) => x.aplicacaoId === a.id).sort((x, y) => (x.data < y.data ? -1 : 1)),
      ultimaTaxa: ultimaTaxaPorIndexador.get(a.indexador) ?? null,
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
      dataVencimento, tributacao, dataAplicacao, rendeNoDiaAporte,
    } = body;

    if (!contaId) return NextResponse.json({ error: "contaId é obrigatório" }, { status: 400 });

    const valorNum = Number(valor);
    if (isNaN(valorNum) || valorNum <= 0)
      return NextResponse.json({ error: "Valor inválido" }, { status: 400 });

    if (!INDEXADORES_VALIDOS.includes(indexador))
      return NextResponse.json({ error: "indexador deve ser 'cdi' ou 'selic'" }, { status: 400 });

    const percentualNum = Number(percentualIndexador);
    if (isNaN(percentualNum) || percentualNum <= 0)
      return NextResponse.json({ error: "percentualIndexador inválido" }, { status: 400 });

    const tributacaoFinal = tributacao || "tributavel";
    if (!TRIBUTACOES_VALIDAS.includes(tributacaoFinal))
      return NextResponse.json({ error: "tributacao deve ser 'isento' ou 'tributavel'" }, { status: 400 });

    const hoje = hojeBrt();

    // ✅ NOVO: data do primeiro aporte (padrão: hoje). Data passada = registro
    // histórico: calcula o rendimento retroativo mas NÃO mexe no saldo da conta
    const dataAporte: string = dataAplicacao || hoje;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataAporte) || isNaN(new Date(dataAporte).getTime()))
      return NextResponse.json({ error: "dataAplicacao inválida" }, { status: 400 });
    if (dataAporte > hoje)
      return NextResponse.json({ error: "A data da aplicação não pode ser futura" }, { status: 400 });
    const historico = dataAporte < hoje;

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
          data: hoje,
          descricao: `Aplicação — ${descricao || indexador.toUpperCase()}`,
          origem: "APLICACAO",
          referenciaId: criada.id,
          mensagemSaldoInsuficiente: "Saldo insuficiente na conta para aplicar esse valor",
        });
      }

      return criada;
    });

    // aplicação retroativa já nasce com o rendimento calculado até hoje
    if (historico) {
      try { await recalcularAplicacao(novaAplicacao.id); }
      catch (e) { console.error("[Aplicações] recálculo inicial falhou:", e); }
    }

    return NextResponse.json(novaAplicacao, { status: 201 });
  } catch (error) {
    return respostaDeErro(error, "Erro ao criar aplicação");
  }
}