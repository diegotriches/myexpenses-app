// src/app/api/cron/aplicacoes/route.ts

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  aplicacoes, taxasDiarias, rendimentosAplicacao, contas, extratoConta, notificacoes,
} from "@/db/schema";
import { eq, and, gt, lte, max } from "drizzle-orm";
import { calcularResgate } from "@/utils/aplicacaoUtils";

// Séries SGS do Banco Central — já retornam a taxa diária em %
const SERIES_BCB = { cdi: 12, selic: 11 } as const;
type Indexador = keyof typeof SERIES_BCB;

const paraDataIso = (d: Date) => d.toISOString().split("T")[0];

const moeda = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function diaSeguinte(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return paraDataIso(d);
}

function paraDataBcb(iso: string): string {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

/**
 * Busca no BCB todas as taxas publicadas no intervalo. Cada taxa vem com a
 * sua PRÓPRIA data de referência (dias úteis) — fins de semana e feriados
 * simplesmente não aparecem, então nunca rendem.
 */
async function buscarTaxasBcb(
  indexador: Indexador,
  inicioIso: string,
  fimIso: string
): Promise<Array<{ data: string; taxa: string }> | null> {
  try {
    const url =
      `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${SERIES_BCB[indexador]}/dados` +
      `?formato=json&dataInicial=${paraDataBcb(inicioIso)}&dataFinal=${paraDataBcb(fimIso)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;

    const dados = await res.json();
    if (!Array.isArray(dados)) return null;

    return dados.map((d: { data: string; valor: string }) => {
      const [dia, mes, ano] = d.data.split("/");
      return { data: `${ano}-${mes}-${dia}`, taxa: String(d.valor) };
    });
  } catch (error) {
    console.error(`[Cron Aplicações] Falha ao buscar taxa ${indexador} do BCB:`, error);
    return null;
  }
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const inicioTotal = Date.now();
  const hojeIso = paraDataIso(new Date());

  const resultados: Array<{
    aplicacaoId: string;
    status: "rendeu" | "resgatada" | "pulada" | "erro";
    diasCreditados?: number;
    valorAtual?: number;
    notificada?: boolean;
    motivo?: string;
  }> = [];

  // 1. Pra cada aplicação ativa, descobre até que data já foi creditada e
  // até que data pode render (hoje, ou o vencimento, o que vier antes)
  const ativas = await db.select().from(aplicacoes).where(eq(aplicacoes.resgatada, false));

  const pendentes: Array<{ aplicacao: (typeof ativas)[number]; ultimaData: string; fimIso: string }> = [];
  for (const aplicacao of ativas) {
    const [r] = await db
      .select({ ultima: max(rendimentosAplicacao.data) })
      .from(rendimentosAplicacao)
      .where(eq(rendimentosAplicacao.aplicacaoId, aplicacao.id));

    const ultimaData = r?.ultima ?? paraDataIso(new Date(aplicacao.dataAplicacao));
    const vencIso = aplicacao.dataVencimento ? paraDataIso(new Date(aplicacao.dataVencimento)) : null;
    const fimIso = vencIso && vencIso < hojeIso ? vencIso : hojeIso;

    pendentes.push({ aplicacao, ultimaData, fimIso });
  }

  // 2. Atualiza o cache de taxas com tudo que foi publicado desde a data
  // mais antiga que alguma aplicação ainda precisa
  const statusBcb: Record<string, string> = {};
  for (const indexador of ["cdi", "selic"] as const) {
    const doIndexador = pendentes.filter(
      (p) => p.aplicacao.indexador === indexador && p.ultimaData < p.fimIso
    );
    if (doIndexador.length === 0) { statusBcb[indexador] = "sem necessidade"; continue; }

    const maisAntiga = doIndexador.map((p) => p.ultimaData).sort()[0];
    const taxas = await buscarTaxasBcb(indexador, diaSeguinte(maisAntiga), hojeIso);

    if (!taxas) { statusBcb[indexador] = "falhou — tenta de novo na próxima execução"; continue; }

    if (taxas.length > 0) {
      await db.insert(taxasDiarias)
        .values(taxas.map((t) => ({ indexador, data: t.data, taxaPercentual: t.taxa, fonte: "bcb" })))
        .onConflictDoNothing();
    }
    statusBcb[indexador] = `ok (${taxas.length} taxa(s) publicada(s) no período)`;
  }

  // 3. Credita, em ordem, cada dia útil ainda não creditado de cada aplicação
  for (const { aplicacao, ultimaData, fimIso } of pendentes) {
    try {
      if (ultimaData >= fimIso) {
        resultados.push({ aplicacaoId: aplicacao.id, status: "pulada", motivo: "já está em dia" });
        continue;
      }

      const taxas = await db.select().from(taxasDiarias)
        .where(and(
          eq(taxasDiarias.indexador, aplicacao.indexador),
          gt(taxasDiarias.data, ultimaData),
          lte(taxasDiarias.data, fimIso),
        ))
        .orderBy(taxasDiarias.data);

      if (taxas.length === 0) {
        resultados.push({ aplicacaoId: aplicacao.id, status: "pulada", motivo: "nenhuma taxa nova publicada (fim de semana/feriado, ou BCB indisponível)" });
        continue;
      }

      const percentual = Number(aplicacao.percentualIndexador);
      let valor = Number(aplicacao.valorAtual);
      let diasCreditados = 0;

      for (const taxa of taxas) {
        const rendimento = valor * (percentual / 100) * (Number(taxa.taxaPercentual) / 100);

        const inserido = await db.insert(rendimentosAplicacao).values({
          aplicacaoId: aplicacao.id,
          data: taxa.data,
          valorRendimento: rendimento.toFixed(8),
          taxaAplicada: taxa.taxaPercentual,
        }).onConflictDoNothing().returning({ id: rendimentosAplicacao.id });

        if (inserido.length === 0) continue; // já creditado (execução concorrente)

        valor += rendimento;
        diasCreditados++;
      }

      if (diasCreditados > 0) {
        await db.update(aplicacoes)
          .set({ valorAtual: valor.toFixed(8), updatedAt: new Date() })
          .where(eq(aplicacoes.id, aplicacao.id));
      }

      resultados.push({ aplicacaoId: aplicacao.id, status: "rendeu", diasCreditados, valorAtual: Number(valor.toFixed(2)) });
    } catch (error: any) {
      console.error(`[Cron Aplicações] Erro ao creditar rendimento ${aplicacao.id}:`, error.message);
      resultados.push({ aplicacaoId: aplicacao.id, status: "erro", motivo: error.message });
    }
  }

  // 4. Resgate automático — só pra quem TEM vencimento (liquidez diária
  // nunca é resgatada automaticamente). Roda DEPOIS do crédito acima, então
  // usa o valor já atualizado.
  const candidatas = await db.select().from(aplicacoes).where(eq(aplicacoes.resgatada, false));

  for (const aplicacao of candidatas) {
    if (!aplicacao.dataVencimento) continue;
    if (paraDataIso(new Date(aplicacao.dataVencimento)) > hojeIso) continue;

    try {
      const agora = new Date();

      const resultado = calcularResgate({
        valorPrincipal: Number(aplicacao.valorPrincipal),
        valorAtual: Number(aplicacao.valorAtual),
        dataAplicacao: aplicacao.dataAplicacao,
        tributacao: aplicacao.tributacao as "isento" | "tributavel",
        dataResgate: agora,
      });

      const [conta] = await db.select().from(contas).where(eq(contas.id, aplicacao.contaId)).limit(1);
      if (!conta) {
        resultados.push({ aplicacaoId: aplicacao.id, status: "erro", motivo: "conta não encontrada" });
        continue;
      }

      const novoSaldo = Number(conta.saldoAtual) + resultado.valorLiquido;
      await db.update(contas)
        .set({ saldoAtual: novoSaldo.toFixed(2), updatedAt: agora })
        .where(eq(contas.id, conta.id));

      await db.insert(extratoConta).values({
        userId: aplicacao.userId, contaId: conta.id,
        data: hojeIso, tipo: "entrada", valor: resultado.valorLiquido.toFixed(2),
        descricao: resultado.impostoRetido > 0
          ? `Resgate automático — ${aplicacao.descricao || "Aplicação"} (vencimento, IR retido: R$ ${resultado.impostoRetido.toFixed(2)})`
          : `Resgate automático — ${aplicacao.descricao || "Aplicação"} (vencimento)`,
        saldoApos: novoSaldo.toFixed(2),
        origem: "RESGATE_APLICACAO", referenciaId: aplicacao.id,
      });

      await db.update(aplicacoes)
        .set({
          resgatada: true,
          dataResgate: agora,
          valorResgatado: resultado.valorLiquido.toFixed(2),
          impostoRetido: resultado.impostoRetido.toFixed(2),
          updatedAt: agora,
        })
        .where(eq(aplicacoes.id, aplicacao.id));

      // ✅ NOVO: avisa o usuário. Fica DEPOIS de o resgate estar gravado e
      // dentro de try/catch próprio — uma falha ao notificar nunca pode
      // desfazer nem travar o dinheiro já devolvido à conta. Como a
      // aplicação acabou de ser marcada como resgatada, ela não entra de
      // novo na lista de candidatas: uma notificação por resgate.
      let notificada = false;
      try {
        const detalheIr =
          aplicacao.tributacao === "isento"
            ? `Rendimento de ${moeda(resultado.rendimentoBruto)} (isento de IR).`
            : resultado.impostoRetido > 0
              ? `Rendimento bruto de ${moeda(resultado.rendimentoBruto)} e IR retido de ${moeda(resultado.impostoRetido)}.`
              : `Rendimento de ${moeda(resultado.rendimentoBruto)}.`;

        await db.insert(notificacoes).values({
          userId: aplicacao.userId,
          tipo: "APLICACAO_RESGATADA",
          severidade: "success",
          titulo: "Aplicação resgatada no vencimento",
          mensagem:
            `Sua aplicação "${aplicacao.descricao || "sem descrição"}" venceu e foi resgatada automaticamente. ` +
            `${detalheIr} ${moeda(resultado.valorLiquido)} já estão no saldo da conta ${conta.nome}.`,
          link: "/aplicacoes",
          metadata: {
            aplicacaoId: aplicacao.id,
            contaId: conta.id,
            valorLiquido: resultado.valorLiquido.toFixed(2),
            impostoRetido: resultado.impostoRetido.toFixed(2),
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
    bcb: statusBcb,
    resultados,
  });
}