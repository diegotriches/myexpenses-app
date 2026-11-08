// src/app/api/renda-variavel/proventos/route.ts

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { proventosRv, contas, extratoConta } from "@/db/schema";
import { and, asc, eq } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import { hojeBrt } from "@/utils/aplicacaoSimulacao";
import { TICKER_REGEX, normalizarTicker, r2 } from "@/utils/rendaVariavelUtils";
import { chaveProvento, TIPO_PROVENTO_LABEL, type TipoProvento } from "@/utils/proventosUtils";

const TIPOS: TipoProvento[] = ["dividendo", "jcp", "rendimento"];

type Linha = typeof proventosRv.$inferSelect;

function paraApi(p: Linha) {
  return {
    id: p.id,
    ticker: p.ticker,
    tipo: p.tipo,
    data: p.data,
    quantidade: p.quantidade,
    precoUnitario: p.precoUnitario !== null ? Number(p.precoUnitario) : null,
    valorLiquido: Number(p.valorLiquido),
    instituicao: p.instituicao,
    contaId: p.contaId,
    movimentouConta: p.movimentouConta,
  };
}

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const linhas = await db
    .select()
    .from(proventosRv)
    .where(eq(proventosRv.userId, userId))
    .orderBy(asc(proventosRv.data));
  return NextResponse.json(linhas.map(paraApi));
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const body = await req.json();
    const { tipo, data, contaId, movimentarConta } = body;

    const ticker = normalizarTicker(String(body.ticker ?? ""));
    if (!TICKER_REGEX.test(ticker))
      return NextResponse.json({ error: "Ticker inválido (ex.: VALE3, RECT11)" }, { status: 400 });
    if (!TIPOS.includes(tipo))
      return NextResponse.json({ error: "Tipo deve ser dividendo, jcp ou rendimento" }, { status: 400 });

    const valor = Number(body.valorLiquido);
    if (isNaN(valor) || valor <= 0)
      return NextResponse.json({ error: "Valor inválido" }, { status: 400 });

    let quantidade: number | null = null;
    if (body.quantidade !== undefined && body.quantidade !== null && body.quantidade !== "") {
      quantidade = Number(body.quantidade);
      if (!Number.isInteger(quantidade) || quantidade < 0)
        return NextResponse.json({ error: "Quantidade inválida" }, { status: 400 });
    }

    const hoje = hojeBrt();
    if (typeof data !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(data) || isNaN(new Date(data).getTime()))
      return NextResponse.json({ error: "Data inválida" }, { status: 400 });
    if (data > hoje)
      return NextResponse.json({ error: "A data do pagamento não pode ser futura" }, { status: 400 });

    const valorLiquido = r2(valor);
    const chave = chaveProvento({ ticker, data, tipo, valorLiquido, quantidade });

    const [jaExiste] = await db
      .select({ id: proventosRv.id })
      .from(proventosRv)
      .where(and(eq(proventosRv.userId, userId), eq(proventosRv.chave, chave)))
      .limit(1);
    if (jaExiste)
      return NextResponse.json({ error: "Este provento já está registrado." }, { status: 409 });

    // Credita a conta? Padrão: só quando o pagamento é de hoje
    const movimentar = movimentarConta === undefined ? data === hoje : movimentarConta === true;
    let conta: typeof contas.$inferSelect | undefined;
    if (contaId) {
      [conta] = await db
        .select()
        .from(contas)
        .where(and(eq(contas.id, contaId), eq(contas.userId, userId)))
        .limit(1);
      if (!conta) return NextResponse.json({ error: "Conta não encontrada" }, { status: 404 });
    }
    if (movimentar) {
      if (!conta) return NextResponse.json({ error: "Escolha a conta que recebeu o provento" }, { status: 400 });
      if (!conta.ativo) return NextResponse.json({ error: "Conta inativa" }, { status: 400 });
    }

    const [criado] = await db
      .insert(proventosRv)
      .values({
        userId,
        ticker,
        tipo,
        data,
        quantidade,
        precoUnitario: body.precoUnitario ? Number(body.precoUnitario).toFixed(6) : null,
        valorLiquido: valorLiquido.toFixed(2),
        instituicao: body.instituicao ? String(body.instituicao) : null,
        contaId: conta?.id ?? null,
        movimentouConta: movimentar,
        chave,
      })
      .returning();

    if (movimentar && conta) {
      const saldoApos = r2(Number(conta.saldoAtual) + valorLiquido);
      await db
        .update(contas)
        .set({ saldoAtual: saldoApos.toFixed(2), updatedAt: new Date() })
        .where(eq(contas.id, conta.id));
      await db.insert(extratoConta).values({
        userId,
        contaId: conta.id,
        data,
        tipo: "entrada",
        valor: valorLiquido.toFixed(2),
        descricao: `${TIPO_PROVENTO_LABEL[tipo as TipoProvento]} ${ticker}`,
        saldoApos: saldoApos.toFixed(2),
        origem: "TRANSACAO_MANUAL",
        referenciaId: criado.id,
      });
    }

    return NextResponse.json(paraApi(criado), { status: 201 });
  } catch (error: any) {
    console.error("Erro ao registrar provento:", error);
    return NextResponse.json({ error: error.message || "Erro ao registrar provento" }, { status: 500 });
  }
}