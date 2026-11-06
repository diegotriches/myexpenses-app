// src/app/api/cron/aplicacoes/route.ts

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { aplicacoes, notificacoes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hojeBrt } from "@/utils/aplicacaoSimulacao";
import { recalcularAplicacao, executarResgate } from "@/lib/aplicacaoEngine";

const paraDataIso = (d: Date) => d.toISOString().split("T")[0];

const moeda = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const inicioTotal = Date.now();
  const hojeIso = hojeBrt();

  const resultados: Array<{
    aplicacaoId: string;
    status: "recalculada" | "resgatada" | "erro";
    valorAtual?: number;
    bcb?: string;
    notificada?: boolean;
    motivo?: string;
  }> = [];

  // 1. Recalcula cada aplicação ativa do zero (aportes + resgates + taxas).
  // Como é um replay completo, o cron também corrige sozinho qualquer dia
  // que tenha ficado sem rendimento por indisponibilidade do BCB.
  const ativas = await db.select().from(aplicacoes).where(eq(aplicacoes.resgatada, false));

  for (const aplicacao of ativas) {
    try {
      const r = await recalcularAplicacao(aplicacao.id);
      if (r) {
        resultados.push({
          aplicacaoId: aplicacao.id,
          status: "recalculada",
          valorAtual: Number(r.sim.valorAtual.toFixed(2)),
          bcb: r.statusBcb,
        });
      }
    } catch (error: any) {
      console.error(`[Cron Aplicações] Erro ao recalcular ${aplicacao.id}:`, error.message);
      resultados.push({ aplicacaoId: aplicacao.id, status: "erro", motivo: error.message });
    }
  }

  // 2. Resgate automático — só pra quem TEM vencimento (liquidez diária
  // nunca é resgatada automaticamente)
  const candidatas = await db.select().from(aplicacoes).where(eq(aplicacoes.resgatada, false));

  for (const aplicacao of candidatas) {
    if (!aplicacao.dataVencimento) continue;
    if (paraDataIso(new Date(aplicacao.dataVencimento)) > hojeIso) continue;

    try {
      const detalhe = await executarResgate({
        aplicacaoId: aplicacao.id,
        userId: aplicacao.userId,
        total: true,
        automatico: true,
      });

      // Notificação fica DEPOIS do resgate gravado, em try/catch próprio:
      // falhar ao notificar nunca desfaz o dinheiro já devolvido à conta
      let notificada = false;
      try {
        const detalheIr =
          aplicacao.tributacao === "isento"
            ? `Rendimento de ${moeda(detalhe.rendimentoBruto)} (isento de IR).`
            : detalhe.impostoRetido > 0
              ? `Rendimento bruto de ${moeda(detalhe.rendimentoBruto)} e IR retido de ${moeda(detalhe.impostoRetido)}.`
              : `Rendimento de ${moeda(detalhe.rendimentoBruto)}.`;

        await db.insert(notificacoes).values({
          userId: aplicacao.userId,
          tipo: "APLICACAO_RESGATADA",
          severidade: "success",
          titulo: "Aplicação resgatada no vencimento",
          mensagem:
            `Sua aplicação "${aplicacao.descricao || "sem descrição"}" venceu e foi resgatada automaticamente. ` +
            `${detalheIr} ${moeda(detalhe.valorLiquido)} já estão no saldo da conta ${detalhe.contaNome}.`,
          link: "/aplicacoes",
          metadata: {
            aplicacaoId: aplicacao.id,
            valorLiquido: detalhe.valorLiquido.toFixed(2),
            impostoRetido: detalhe.impostoRetido.toFixed(2),
          },
        });
        notificada = true;
      } catch (erroNotificacao: any) {
        console.error(`[Cron Aplicações] Resgate ${aplicacao.id} ok, mas falhou ao criar a notificação:`, erroNotificacao.message);
      }

      resultados.push({ aplicacaoId: aplicacao.id, status: "resgatada", notificada });
    } catch (error: any) {
      console.error(`[Cron Aplicações] Erro ao resgatar ${aplicacao.id}:`, error.message);
      resultados.push({ aplicacaoId: aplicacao.id, status: "erro", motivo: error.message });
    }
  }

  return NextResponse.json({
    message: "Processamento de aplicações concluído",
    duracao: `${Date.now() - inicioTotal}ms`,
    resultados,
  });
}