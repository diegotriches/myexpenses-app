// src/app/api/renda-variavel/route.ts

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { operacoesRv, cotacoesRv, contas, extratoConta } from "@/db/schema";
import { and, asc, eq, inArray } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import { hojeBrt } from "@/utils/aplicacaoSimulacao";
import {
  TICKER_REGEX,
  normalizarTicker,
  totalOperacao,
  validarSequencia,
  r2,
  type OperacaoRv,
  type TipoAtivo,
} from "@/utils/rendaVariavelUtils";

const TIPOS_ATIVO: TipoAtivo[] = ["acao", "fii", "etf", "bdr"];

type Linha = typeof operacoesRv.$inferSelect;

function paraApi(o: Linha) {
  return {
    id: o.id,
    ticker: o.ticker,
    tipoAtivo: o.tipoAtivo,
    tipo: o.tipo,
    data: o.data,
    quantidade: o.quantidade,
    precoUnitario: Number(o.precoUnitario),
    taxas: Number(o.taxas),
    contaId: o.contaId,
    movimentouConta: o.movimentouConta,
    createdAt: o.createdAt,
  };
}

function paraOperacao(o: Linha): OperacaoRv {
  return {
    id: o.id,
    ticker: o.ticker,
    tipoAtivo: o.tipoAtivo,
    tipo: o.tipo,
    data: o.data,
    quantidade: o.quantidade,
    precoUnitario: Number(o.precoUnitario),
    taxas: Number(o.taxas),
  };
}

const fmtIso = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/");

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const linhas = await db
    .select()
    .from(operacoesRv)
    .where(eq(operacoesRv.userId, userId))
    .orderBy(asc(operacoesRv.data), asc(operacoesRv.createdAt));

  const tickers = Array.from(new Set(linhas.map((l) => l.ticker)));
  const cots = tickers.length
    ? await db.select().from(cotacoesRv).where(inArray(cotacoesRv.ticker, tickers))
    : [];

  return NextResponse.json({
    operacoes: linhas.map(paraApi),
    cotacoes: cots.map((c) => ({
      ticker: c.ticker,
      preco: Number(c.preco),
      variacaoDia: c.variacaoDia !== null ? Number(c.variacaoDia) : null,
      fonte: c.fonte,
      atualizadoEm: c.atualizadoEm,
    })),
  });
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const body = await req.json();
    const { tipo, data, contaId, movimentarConta } = body;

    const ticker = normalizarTicker(String(body.ticker ?? ""));
    if (!TICKER_REGEX.test(ticker))
      return NextResponse.json({ error: "Ticker inválido (ex.: PETR4, BRCR11)" }, { status: 400 });

    if (tipo !== "compra" && tipo !== "venda")
      return NextResponse.json({ error: "Tipo deve ser 'compra' ou 'venda'" }, { status: 400 });

    if (!TIPOS_ATIVO.includes(body.tipoAtivo))
      return NextResponse.json({ error: "Tipo de ativo inválido" }, { status: 400 });

    const quantidade = Number(body.quantidade);
    if (!Number.isInteger(quantidade) || quantidade <= 0)
      return NextResponse.json({ error: "Quantidade deve ser um número inteiro maior que zero" }, { status: 400 });

    const preco = Number(body.precoUnitario);
    if (isNaN(preco) || preco <= 0)
      return NextResponse.json({ error: "Preço inválido" }, { status: 400 });

    const taxas = body.taxas === undefined || body.taxas === "" ? 0 : Number(body.taxas);
    if (isNaN(taxas) || taxas < 0)
      return NextResponse.json({ error: "Taxas inválidas" }, { status: 400 });

    const hoje = hojeBrt();
    if (typeof data !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(data) || isNaN(new Date(data).getTime()))
      return NextResponse.json({ error: "Data inválida" }, { status: 400 });
    if (data > hoje)
      return NextResponse.json({ error: "A data da operação não pode ser futura" }, { status: 400 });

    // Operações já existentes do ticker: define o tipo de ativo e valida o saldo de ativos
    const existentes = await db
      .select()
      .from(operacoesRv)
      .where(and(eq(operacoesRv.userId, userId), eq(operacoesRv.ticker, ticker)));
    const tipoAtivo: TipoAtivo = existentes[0]?.tipoAtivo ?? body.tipoAtivo;

    const nova: OperacaoRv = {
      id: "nova-operacao", tipoAtivo, ticker, tipo, data, quantidade, precoUnitario: preco, taxas,
    };
    const problema = validarSequencia([...existentes.map(paraOperacao), nova]);
    if (problema) {
      return NextResponse.json(
        {
          error:
            tipo === "venda"
              ? `Quantidade maior que a posição de ${ticker} em ${fmtIso(problema.data)} (faltam ${problema.faltam}).`
              : `Esta compra deixaria uma venda posterior de ${ticker} sem saldo (${fmtIso(problema.data)}).`,
        },
        { status: 400 },
      );
    }

    // Movimenta a conta? Padrão: só quando a operação é de hoje (as passadas são
    // registro histórico, como nas aplicações). O usuário pode forçar o contrário.
    const movimentar = movimentarConta === undefined ? data === hoje : movimentarConta === true;
    const total = totalOperacao(nova);

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
      if (!conta) return NextResponse.json({ error: "Escolha a conta para movimentar o saldo" }, { status: 400 });
      if (!conta.ativo) return NextResponse.json({ error: "Conta inativa" }, { status: 400 });
      if (tipo === "compra" && Number(conta.saldoAtual) < total)
        return NextResponse.json({ error: "Saldo insuficiente na conta para esta compra" }, { status: 400 });
    }

    const [criada] = await db
      .insert(operacoesRv)
      .values({
        userId,
        ticker,
        tipoAtivo,
        tipo,
        data,
        quantidade,
        precoUnitario: preco.toFixed(4),
        taxas: taxas.toFixed(2),
        contaId: conta?.id ?? null,
        movimentouConta: movimentar,
      })
      .returning();

    if (movimentar && conta) {
      const saldoApos = r2(Number(conta.saldoAtual) + (tipo === "venda" ? total : -total));
      await db
        .update(contas)
        .set({ saldoAtual: saldoApos.toFixed(2), updatedAt: new Date() })
        .where(eq(contas.id, conta.id));

      await db.insert(extratoConta).values({
        userId,
        contaId: conta.id,
        data,
        tipo: tipo === "venda" ? "entrada" : "saida",
        valor: total.toFixed(2),
        descricao: `${tipo === "venda" ? "Venda" : "Compra"} de ${quantidade} ${ticker}`,
        saldoApos: saldoApos.toFixed(2),
        origem: tipo === "venda" ? "RESGATE_APLICACAO" : "APLICACAO",
        referenciaId: criada.id,
      });
    }

    return NextResponse.json(paraApi(criada), { status: 201 });
  } catch (error: any) {
    console.error("Erro ao registrar operação de renda variável:", error);
    return NextResponse.json({ error: error.message || "Erro ao registrar operação" }, { status: 500 });
  }
}