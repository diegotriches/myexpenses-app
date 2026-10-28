// src/app/api/aplicacoes/route.ts

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { aplicacoes, contas, extratoConta } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getUserId } from "@/lib/auth";

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
  return NextResponse.json(lista);
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const body = await req.json();
    const { contaId, descricao, valor, indexador, percentualIndexador, dataVencimento, tributacao } = body;

    if (!contaId) return NextResponse.json({ error: "contaId é obrigatório" }, { status: 400 });

    const valorNum = Number(valor);
    if (isNaN(valorNum) || valorNum <= 0)
      return NextResponse.json({ error: "Valor inválido" }, { status: 400 });

    if (!INDEXADORES_VALIDOS.includes(indexador))
      return NextResponse.json({ error: "indexador deve ser 'cdi' ou 'selic'" }, { status: 400 });

    const percentualNum = Number(percentualIndexador);
    if (isNaN(percentualNum) || percentualNum <= 0)
      return NextResponse.json({ error: "percentualIndexador inválido" }, { status: 400 });

    // ✅ NOVO: tributação
    const tributacaoFinal = tributacao || "tributavel";
    if (!TRIBUTACOES_VALIDAS.includes(tributacaoFinal))
      return NextResponse.json({ error: "tributacao deve ser 'isento' ou 'tributavel'" }, { status: 400 });

    // ✅ NOVO: dataVencimento agora é opcional — null/undefined = liquidez
    // diária, sem resgate automático
    let dataVencimentoDate: Date | null = null;
    if (dataVencimento) {
      if (isNaN(new Date(dataVencimento).getTime()))
        return NextResponse.json({ error: "dataVencimento inválida" }, { status: 400 });

      dataVencimentoDate = new Date(dataVencimento);
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      if (dataVencimentoDate <= hoje)
        return NextResponse.json({ error: "dataVencimento deve ser no futuro" }, { status: 400 });
    }

    const [conta] = await db.select().from(contas)
      .where(and(eq(contas.id, contaId), eq(contas.userId, userId))).limit(1);
    if (!conta)       return NextResponse.json({ error: "Conta não encontrada" }, { status: 404 });
    if (!conta.ativo) return NextResponse.json({ error: "Conta inativa" }, { status: 400 });

    const saldoAtual = Number(conta.saldoAtual);
    if (saldoAtual < valorNum)
      return NextResponse.json({ error: "Saldo insuficiente na conta para aplicar esse valor" }, { status: 400 });

    const novoSaldo = saldoAtual - valorNum;
    const agora = new Date();

    await db.update(contas)
      .set({ saldoAtual: novoSaldo.toFixed(2), updatedAt: agora })
      .where(eq(contas.id, contaId));

    const [novaAplicacao] = await db.insert(aplicacoes).values({
      userId, contaId,
      descricao: descricao || null,
      valorPrincipal: valorNum.toFixed(2),
      valorAtual: valorNum.toFixed(2),
      indexador,
      percentualIndexador: percentualNum.toFixed(2),
      tributacao: tributacaoFinal,
      dataAplicacao: agora,
      dataVencimento: dataVencimentoDate, // null = liquidez diária
      resgatada: false,
    }).returning();

    await db.insert(extratoConta).values({
      userId, contaId,
      data: agora.toISOString().split("T")[0],
      tipo: "saida", valor: valorNum.toFixed(2),
      descricao: `Aplicação — ${descricao || indexador.toUpperCase()}`,
      saldoApos: novoSaldo.toFixed(2),
      origem: "APLICACAO", referenciaId: novaAplicacao.id,
    });

    return NextResponse.json(novaAplicacao, { status: 201 });
  } catch (error: any) {
    console.error("Erro ao criar aplicação:", error);
    return NextResponse.json({ error: error.message || "Erro ao criar aplicação" }, { status: 500 });
  }
}