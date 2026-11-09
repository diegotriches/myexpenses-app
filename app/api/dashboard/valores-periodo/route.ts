// src/app/api/dashboard/valores-periodo/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { transacoes, cartoes } from "@/db/schema";
import { and, gte, lte, eq } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import { calcularFaturaDaTransacao } from "@/utils/faturaUtils";
import {
  calcularIntervaloAno,
  lerAnoDaRequisicao,
  hojeBrtDate,
} from "@/utils/periodoAno";
import { respostaDeErro } from "@/lib/rota";

/**
 * GET /api/dashboard/valores-periodo?ano=2026
 *
 * • recebidos: entradas do ano com data até hoje
 * • aReceber / aPagar: lançamentos com data FUTURA, até 31/12 do ano
 *   (é uma projeção do ano todo; em anos passados não há nada futuro)
 */
export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const ano = lerAnoDaRequisicao(req.nextUrl.searchParams.get("ano"));
    if (ano === null) {
      return NextResponse.json({ error: "Ano inválido" }, { status: 400 });
    }

    const intervalo = calcularIntervaloAno(ano);

    const hoje = hojeBrtDate();
    hoje.setHours(0, 0, 0, 0);

    // Amplia a busca para dezembro do ano anterior: compras de cartão feitas
    // lá podem pertencer a uma fatura de janeiro
    const dataInicioBusca = new Date(ano - 1, 11, 1);
    const dataFimBusca = intervalo.fimAno;

    const todas = await db
      .select()
      .from(transacoes)
      .where(
        and(
          eq(transacoes.userId, userId),
          gte(transacoes.data, dataInicioBusca),
          lte(transacoes.data, dataFimBusca)
        )
      );

    const cartoesDb = await db
      .select()
      .from(cartoes)
      .where(eq(cartoes.userId, userId));

    const cartoesMap = new Map(cartoesDb.map((c) => [c.id, c]));

    // Fatura de cartão só conta se pertencer a um mês do ano (jan–dez)
    const faturaDentroDoAno = (mesFatura: number, anoFatura: number) => {
      const chave = anoFatura * 12 + mesFatura;
      return chave >= intervalo.chaveInicio && chave <= intervalo.chaveFimAno;
    };

    let recebidos = 0;
    let aReceber = 0;
    let aPagar = 0;

    for (const t of todas) {
      const valor = Number(t.valor);
      const dataTransacao = new Date(t.data);
      dataTransacao.setHours(0, 0, 0, 0);
      const isFutura = dataTransacao > hoje;

      if (t.tipo === "entrada") {
        // A busca ampliada traz dezembro do ano anterior: entradas de lá não contam
        if (dataTransacao < intervalo.inicio) continue;
        if (isFutura) aReceber += valor;
        else recebidos += valor;
      }

      if ((t.tipo === "saida" || t.tipo === "estorno") && isFutura) {
        const aAbater = t.tipo === "estorno" ? -valor : valor;
        if (t.formaPagamento === "cartao" && t.cartaoId) {
          const cartao = cartoesMap.get(t.cartaoId);
          if (cartao) {
            const { mes: mesFatura, ano: anoFatura } = calcularFaturaDaTransacao(
              dataTransacao,
              cartao.diaFechamento || 1
            );
            if (faturaDentroDoAno(mesFatura, anoFatura)) {
              aPagar += aAbater;
            }
          }
        } else {
          aPagar += aAbater;
        }
      }
    }

    return NextResponse.json({
      recebidos,
      aReceber,
      aPagar,
      projecao: aReceber - aPagar,
    });
  } catch (error) {
    return respostaDeErro(error, "Erro ao carregar valores do período");
  }
}