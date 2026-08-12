import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { recorrencias, transacoes, contas, cartoes, faturas } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { calcularFaturaDaTransacao, proximaFaturaAberta } from "@/utils/faturaUtils";

/**
 * GET /api/cron/recorrencias
 *
 * Roda diariamente. Para cada recorrência ativa cujo dia do mês bate com
 * hoje (e que ainda não gerou neste mês/ano), cria a transação real e
 * aplica o impacto financeiro SÓ NESTE MOMENTO — nunca antecipado, o que
 * corrige o bug do modelo antigo (todas as ocorrências debitavam a conta
 * de uma vez na criação).
 */
export async function GET(req: NextRequest) {
  const inicioTotal = Date.now();

  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const hoje = new Date();
  const anoAtual = hoje.getFullYear();
  const mesAtual = hoje.getMonth() + 1;
  const diaAtual = hoje.getDate();

  const ativas = await db
    .select()
    .from(recorrencias)
    .where(eq(recorrencias.ativa, true));

  const resultados: Array<{ id: string; status: "gerada" | "pulada" | "erro"; motivo?: string }> = [];

  for (const rec of ativas) {
    try {
      // Já gerou neste mês/ano — evita duplicar se o cron rodar 2x
      if (rec.ultimaGeracaoMes === mesAtual && rec.ultimaGeracaoAno === anoAtual) {
        resultados.push({ id: rec.id, status: "pulada", motivo: "já gerada este mês" });
        continue;
      }

      // Clamp do dia do mês (ex: dia 31 em fevereiro vira o último dia)
      const ultimoDiaDoMes = new Date(anoAtual, mesAtual, 0).getDate();
      const diaAlvo = Math.min(rec.diaDoMes, ultimoDiaDoMes);

      if (diaAtual !== diaAlvo) {
        resultados.push({ id: rec.id, status: "pulada", motivo: "não é o dia" });
        continue;
      }

      const valor = Number(rec.valor);
      const dataTransacao = new Date(anoAtual, mesAtual - 1, diaAlvo);

      const [novaTransacao] = await db.insert(transacoes).values({
        userId: rec.userId,
        tipo: rec.tipo,
        valor: valor.toFixed(2),
        data: dataTransacao,
        descricao: rec.descricao,
        categoria: rec.categoria,
        formaPagamento: rec.formaPagamento,
        contaId: rec.contaId,
        cartaoId: rec.cartaoId,
        estabelecimentoId: rec.estabelecimentoId,
        recorrente: true,
        origemRecorrenciaId: rec.id,
      }).returning();

      // Impacto financeiro — aplicado SÓ AGORA, na data real de ocorrência
      if (rec.formaPagamento === "cartao" && rec.cartaoId) {
        const [cartao] = await db.select().from(cartoes).where(eq(cartoes.id, rec.cartaoId)).limit(1);
        if (cartao && cartao.tipo === "credito") {
          const diaFechamento = cartao.diaFechamento || 1;
          const { mes: mesCalc, ano: anoCalc } = calcularFaturaDaTransacao(dataTransacao, diaFechamento);
          const { mes: mesFatura, ano: anoFatura } = proximaFaturaAberta(mesCalc, anoCalc, diaFechamento);

          const [faturaExistente] = await db.select().from(faturas)
            .where(and(eq(faturas.cartaoId, rec.cartaoId), eq(faturas.userId, rec.userId), eq(faturas.mes, mesFatura), eq(faturas.ano, anoFatura)))
            .limit(1);

          if (faturaExistente) {
            await db.update(faturas)
              .set({ total: (Number(faturaExistente.total) + valor).toFixed(2), updatedAt: new Date() })
              .where(eq(faturas.id, faturaExistente.id));
          } else {
            await db.insert(faturas).values({ userId: rec.userId, cartaoId: rec.cartaoId, mes: mesFatura, ano: anoFatura, total: valor.toFixed(2), paga: false });
          }

          await db.update(cartoes)
            .set({ limiteDisponivel: (Number(cartao.limiteDisponivel) - valor).toFixed(2) })
            .where(eq(cartoes.id, rec.cartaoId));
        }
      } else if (rec.contaId) {
        const [conta] = await db.select().from(contas).where(eq(contas.id, rec.contaId)).limit(1);
        if (conta) {
          const saldoAtual = Number(conta.saldoAtual);
          const novoSaldo = rec.tipo === "entrada" ? saldoAtual + valor : saldoAtual - valor;
          await db.update(contas)
            .set({ saldoAtual: novoSaldo.toFixed(2), updatedAt: new Date() })
            .where(eq(contas.id, rec.contaId));
        }
      }

      const novasRepeticoesGeradas = rec.repeticoesGeradas + 1;
      const atingiuLimite = rec.repeticoesTotal !== null && novasRepeticoesGeradas >= rec.repeticoesTotal;

      await db.update(recorrencias)
        .set({
          repeticoesGeradas: novasRepeticoesGeradas,
          ultimaGeracaoMes: mesAtual,
          ultimaGeracaoAno: anoAtual,
          ativa: atingiuLimite ? false : rec.ativa,
          updatedAt: new Date(),
        })
        .where(eq(recorrencias.id, rec.id));

      resultados.push({ id: rec.id, status: "gerada" });
    } catch (error: any) {
      console.error(`[Cron Recorrências] Erro na recorrência ${rec.id}:`, error.message);
      resultados.push({ id: rec.id, status: "erro", motivo: error.message });
    }
  }

  const duracaoTotal = Date.now() - inicioTotal;
  return NextResponse.json({
    message: "Verificação de recorrências concluída",
    duracao: `${duracaoTotal}ms`,
    resultados,
  });
}