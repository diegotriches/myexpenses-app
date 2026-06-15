// src/app/api/dashboard/faturas-abertas/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { cartoes, faturas, transacoes } from "@/db/schema";
import { eq, and, gte, lte, lte as lteAlias, asc } from "drizzle-orm";
import { getUserIdOrRedirect } from "@/lib/auth/session";
import { calcularPeriodoFatura, calcularDataVencimento } from "@/utils/faturaUtils";

export interface FaturaAbertaItem {
  cartaoId: number;
  mes: number;
  ano: number;
  total: number;
  status: "EM_ABERTO" | "ATRASADA";
  dataVencimento: string;
}

/**
 * Calcula o mês/ano da fatura ativa de um cartão com base no dia de fechamento.
 * Se o dia atual >= diaFechamento, a fatura ativa já é do próximo mês.
 */
function calcularFaturaAtiva(diaFechamento: number): { mes: number; ano: number } {
  const hoje     = new Date();
  const diaAtual = hoje.getDate();
  const mesAtual = hoje.getMonth();   // 0-indexed
  const anoAtual = hoje.getFullYear();

  if (diaAtual >= diaFechamento) {
    // Fatura do próximo mês
    if (mesAtual === 11) return { mes: 1, ano: anoAtual + 1 };
    return { mes: mesAtual + 2, ano: anoAtual }; // +2 porque mesAtual é 0-indexed
  }
  return { mes: mesAtual + 1, ano: anoAtual };   // mês atual (1-indexed)
}

/**
 * GET /api/dashboard/faturas-abertas
 * Retorna a fatura aberta mais urgente de cada cartão de crédito ativo.
 *
 * Prioridade:
 * 1. Fatura atrasada mais antiga (meses anteriores não pagos)
 * 2. Fatura ativa do cartão (baseada no diaFechamento)
 */
export async function GET() {
  try {
    const userId = await getUserIdOrRedirect();

    const hoje     = new Date();
    const mesAtual = hoje.getMonth() + 1; // 1-indexed
    const anoAtual = hoje.getFullYear();

    const cartoesAtivos = await db
      .select()
      .from(cartoes)
      .where(and(
        eq(cartoes.userId, userId),
        eq(cartoes.tipo,   "credito"),
        eq(cartoes.ativo,  true)
      ));

    const resultado: FaturaAbertaItem[] = [];

    for (const cartao of cartoesAtivos) {
      const diaFechamento = cartao.diaFechamento || 1;
      const diaVencimento = cartao.diaVencimento || 1;

      // Fatura ativa real do cartão baseada no fechamento
      const faturaAtiva = calcularFaturaAtiva(diaFechamento);

      // ── 1. Busca todas as faturas do cartão no banco ───────────────────────
      const todasFaturas = await db
        .select()
        .from(faturas)
        .where(and(
          eq(faturas.cartaoId, cartao.id),
          eq(faturas.userId,   userId)
        ))
        .orderBy(asc(faturas.ano), asc(faturas.mes));

      // Fatura ativa no banco (pode estar paga ou aberta)
      const faturaAtivaNoBanco = todasFaturas.find(
        (f) => f.mes === faturaAtiva.mes && f.ano === faturaAtiva.ano
      );

      // Se a fatura ativa já está paga, não exibir nada para ela
      const faturaAtivaPaga = faturaAtivaNoBanco?.paga === true;

      // ── 2. Faturas atrasadas: abertas em meses ANTERIORES à fatura ativa ──
      const faturasAtrasadas = todasFaturas.filter((f) => {
        if (f.paga) return false;
        // Anterior à fatura ativa
        if (f.ano < faturaAtiva.ano) return true;
        if (f.ano === faturaAtiva.ano && f.mes < faturaAtiva.mes) return true;
        return false;
      });

      // ── 3. Escolhe a fatura mais urgente ──────────────────────────────────
      let faturaEscolhida: { mes: number; ano: number; total: number } | null = null;

      if (faturasAtrasadas.length > 0) {
        // Atrasada mais antiga (já ordenada ASC)
        const maisAntiga = faturasAtrasadas[0];
        faturaEscolhida = {
          mes:   maisAntiga.mes,
          ano:   maisAntiga.ano,
          total: Number(maisAntiga.total),
        };
      } else if (!faturaAtivaPaga) {
        // Fatura ativa persistida no banco
        if (faturaAtivaNoBanco) {
          faturaEscolhida = {
            mes:   faturaAtivaNoBanco.mes,
            ano:   faturaAtivaNoBanco.ano,
            total: Number(faturaAtivaNoBanco.total),
          };
        } else {
          // Fatura ativa ainda não persistida — calcula pelo total das transações
          const { inicio, fim } = calcularPeriodoFatura(
            faturaAtiva.mes, faturaAtiva.ano, diaFechamento
          );
          const transacoesFaturaAtiva = await db
            .select({ valor: transacoes.valor })
            .from(transacoes)
            .where(and(
              eq(transacoes.cartaoId, cartao.id),
              eq(transacoes.userId,   userId),
              gte(transacoes.data, inicio),
              lte(transacoes.data, fim)
            ));

          const total = transacoesFaturaAtiva.reduce((acc, t) => acc + Number(t.valor), 0);
          if (total > 0) {
            faturaEscolhida = { mes: faturaAtiva.mes, ano: faturaAtiva.ano, total };
          }
        }
      }

      if (!faturaEscolhida) continue;

      const dataVencimento    = calcularDataVencimento(faturaEscolhida.mes, faturaEscolhida.ano, diaVencimento);
      const dataVencimentoStr = dataVencimento.toISOString().split("T")[0];
      const status: "EM_ABERTO" | "ATRASADA" = hoje > dataVencimento ? "ATRASADA" : "EM_ABERTO";

      resultado.push({
        cartaoId:       cartao.id,
        mes:            faturaEscolhida.mes,
        ano:            faturaEscolhida.ano,
        total:          faturaEscolhida.total,
        status,
        dataVencimento: dataVencimentoStr,
      });
    }

    return NextResponse.json(resultado);
  } catch (error) {
    console.error("Erro ao buscar faturas abertas:", error);
    return NextResponse.json([], { status: 200 });
  }
}