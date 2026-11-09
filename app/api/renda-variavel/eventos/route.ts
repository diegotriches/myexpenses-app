//
// Eventos corporativos:
//  - desdobramento / grupamento / bonificação: a quantidade é calculada aqui, a
//    partir da posição do ativo na data do evento, e gravada como uma operação
//    marcada com `evento` (ver rendaVariavelUtils). Não mexe em conta.
//  - troca de ticker: move todo o histórico (operações e proventos) para o novo ticker.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { operacoesRv, proventosRv } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import { hojeBrt } from "@/utils/aplicacaoSimulacao";
import {
  TICKER_REGEX, normalizarTicker, validarSequencia, EVENTO_LABEL,
  type OperacaoRv,
} from "@/utils/rendaVariavelUtils";
import { calcularEvento, posicaoEm, type TipoEventoCorporativo } from "@/utils/eventosCorporativosUtils";
import { respostaDeErro } from "@/lib/rota";

const TIPOS: TipoEventoCorporativo[] = ["desdobramento", "grupamento", "bonificacao"];
const fmtIso = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/");

type Linha = typeof operacoesRv.$inferSelect;
const paraOperacao = (o: Linha): OperacaoRv => ({
  id: o.id, ticker: o.ticker, tipoAtivo: o.tipoAtivo, tipo: o.tipo, data: o.data,
  quantidade: o.quantidade, precoUnitario: Number(o.precoUnitario), taxas: Number(o.taxas), evento: o.evento,
});

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const body = await req.json();

    // ── Troca de ticker ────────────────────────────────────────────────────
    if (body?.tipo === "troca") {
      const de = normalizarTicker(String(body.de ?? ""));
      const para = normalizarTicker(String(body.para ?? ""));
      if (!TICKER_REGEX.test(de) || !TICKER_REGEX.test(para))
        return NextResponse.json({ error: "Ticker inválido (ex.: VPPR11)" }, { status: 400 });
      if (de === para) return NextResponse.json({ error: "Os tickers são iguais" }, { status: 400 });

      const doisTickers = await db
        .select()
        .from(operacoesRv)
        .where(and(eq(operacoesRv.userId, userId), inArray(operacoesRv.ticker, [de, para])));
      const origem = doisTickers.filter((o) => o.ticker === de);
      if (origem.length === 0)
        return NextResponse.json({ error: `Não há operações de ${de}` }, { status: 404 });

      const tipoAtivo = doisTickers.find((o) => o.ticker === para)?.tipoAtivo ?? origem[0].tipoAtivo;
      const unidas = doisTickers.map((o) => ({ ...paraOperacao(o), ticker: para, tipoAtivo }));
      const problema = validarSequencia(unidas);
      if (problema)
        return NextResponse.json(
          { error: `Unir ${de} em ${para} deixaria uma venda de ${fmtIso(problema.data)} sem saldo (faltam ${problema.faltam}).` },
          { status: 400 },
        );

      await db
        .update(operacoesRv)
        .set({ ticker: para, tipoAtivo })
        .where(and(eq(operacoesRv.userId, userId), eq(operacoesRv.ticker, de)));
      await db
        .update(proventosRv)
        .set({ ticker: para })
        .where(and(eq(proventosRv.userId, userId), eq(proventosRv.ticker, de)));

      return NextResponse.json({ ok: true, operacoes: origem.length });
    }

    // ── Desdobramento / grupamento / bonificação ──────────────────────────
    if (!TIPOS.includes(body?.tipo))
      return NextResponse.json({ error: "Tipo de evento inválido" }, { status: 400 });

    const tipo = body.tipo as TipoEventoCorporativo;
    const ticker = normalizarTicker(String(body.ticker ?? ""));
    if (!TICKER_REGEX.test(ticker)) return NextResponse.json({ error: "Ticker inválido" }, { status: 400 });

    const data = String(body.data ?? "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || isNaN(new Date(data).getTime()))
      return NextResponse.json({ error: "Data inválida" }, { status: 400 });
    if (data > hojeBrt())
      return NextResponse.json({ error: "A data do evento não pode ser futura" }, { status: 400 });

    const existentes = await db
      .select()
      .from(operacoesRv)
      .where(and(eq(operacoesRv.userId, userId), eq(operacoesRv.ticker, ticker)));
    if (existentes.length === 0)
      return NextResponse.json({ error: `Não há operações de ${ticker}` }, { status: 404 });

    const ops = existentes.map(paraOperacao);
    const r = calcularEvento(posicaoEm(ops, ticker, data), {
      tipo,
      antigo: Number(body.antigo),
      novo: Number(body.novo),
      percentual: Number(body.percentual),
    });
    if (r.erro) return NextResponse.json({ error: r.erro }, { status: 400 });

    let custoUnitario = 0;
    if (tipo === "bonificacao") {
      custoUnitario = body.custoUnitario === undefined || body.custoUnitario === "" ? 0 : Number(body.custoUnitario);
      if (!Number.isFinite(custoUnitario) || custoUnitario < 0)
        return NextResponse.json({ error: "Custo por ação inválido" }, { status: 400 });
    }

    const nova: OperacaoRv = {
      id: "novo-evento", ticker, tipoAtivo: existentes[0].tipoAtivo,
      tipo: r.delta > 0 ? "compra" : "venda", data,
      quantidade: Math.abs(r.delta), precoUnitario: custoUnitario, taxas: 0, evento: tipo,
    };
    const problema = validarSequencia([...ops, nova]);
    if (problema)
      return NextResponse.json(
        { error: `Este ${EVENTO_LABEL[tipo].toLowerCase()} deixaria uma venda de ${ticker} em ${fmtIso(problema.data)} sem saldo (faltam ${problema.faltam}).` },
        { status: 400 },
      );

    const [criada] = await db
      .insert(operacoesRv)
      .values({
        userId, ticker, tipoAtivo: nova.tipoAtivo, tipo: nova.tipo, data,
        quantidade: nova.quantidade, precoUnitario: custoUnitario.toFixed(4), taxas: "0.00",
        contaId: null, movimentouConta: false, evento: tipo,
      })
      .returning();

    return NextResponse.json(
      { id: criada.id, posicaoAntes: r.posicaoAntes, posicaoDepois: r.posicaoDepois },
      { status: 201 },
    );
  } catch (error) {
    return respostaDeErro(error, "Erro ao registrar evento");
  }
}