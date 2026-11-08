import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { recorrencias, transacoes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { aplicarImpactoRecorrencia } from "@/lib/aplicarImpacto";
import {
  notificarImpactoRecorrencia,
  notificarErroRecorrencia,
} from "@/lib/notificarRecorrencia";

/**
 * GET /api/cron/recorrencias
 *
 * Roda diariamente. Para cada recorrência ativa cujo dia do mês bate com
 * hoje (e que ainda não gerou neste mês/ano), cria a transação real e
 * aplica o impacto financeiro SÓ NESTE MOMENTO — nunca antecipado, o que
 * corrige o bug do modelo antigo (todas as ocorrências debitavam a conta
 * de uma vez na criação).
 *
 * Falta de saldo/limite NÃO bloqueia a geração: a transação é criada, a
 * conta pode ficar negativa / o limite pode estourar, e o usuário recebe
 * uma notificação avisando.
 */
export async function GET(req: NextRequest) {
  const inicioTotal = Date.now();

  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
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

  const resultados: Array<{
    id: string;
    status: "gerada" | "pulada" | "erro";
    motivo?: string;
    alerta?: string;
  }> = [];

  for (const rec of ativas) {
    // Clamp do dia do mês (ex: dia 31 em fevereiro vira o último dia)
    const ultimoDiaDoMes = new Date(anoAtual, mesAtual, 0).getDate();
    const diaAlvo = Math.min(rec.diaDoMes, ultimoDiaDoMes);
    const dataTexto = `${String(diaAlvo).padStart(2, "0")}/${String(mesAtual).padStart(2, "0")}`;

    try {
      // Já gerou neste mês/ano — evita duplicar se o cron rodar 2x
      if (rec.ultimaGeracaoMes === mesAtual && rec.ultimaGeracaoAno === anoAtual) {
        resultados.push({ id: rec.id, status: "pulada", motivo: "já gerada este mês" });
        continue;
      }

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

      // Impacto financeiro — aplicado SÓ AGORA, na data real de ocorrência.
      // Nunca bloqueia: devolve um alerta quando saldo/limite ficou negativo.
      const alerta = await aplicarImpactoRecorrencia({
        userId: rec.userId,
        tipo: rec.tipo,
        valor,
        data: dataTransacao,
        formaPagamento: rec.formaPagamento,
        contaId: rec.contaId,
        cartaoId: rec.cartaoId,
        transacaoId: novaTransacao.id,
        descricao: rec.descricao,
      });

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

      // Notificação por último: se falhar, a geração já está consolidada
      if (alerta) {
        await notificarImpactoRecorrencia({
          userId: rec.userId,
          recorrenciaId: rec.id,
          transacaoId: novaTransacao.id,
          descricao: rec.descricao,
          valor,
          dataTexto,
          alerta,
        });
      }

      resultados.push({ id: rec.id, status: "gerada", alerta: alerta?.tipo });
    } catch (error: any) {
      console.error(`[Cron Recorrências] Erro na recorrência ${rec.id}:`, error.message);
      resultados.push({ id: rec.id, status: "erro", motivo: error.message });

      await notificarErroRecorrencia({
        userId: rec.userId,
        recorrenciaId: rec.id,
        descricao: rec.descricao,
        valor: Number(rec.valor),
        dataTexto,
        motivo: error.message,
      });
    }
  }

  const duracaoTotal = Date.now() - inicioTotal;
  return NextResponse.json({
    message: "Verificação de recorrências concluída",
    duracao: `${duracaoTotal}ms`,
    resultados,
  });
}