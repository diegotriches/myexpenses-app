// src/app/api/aplicacoes/[id]/aportes/route.ts

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { aplicacoes, aportesAplicacao, contas, extratoConta } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import { hojeBrt } from "@/utils/aplicacaoSimulacao";
import { recalcularAplicacao } from "@/lib/aplicacaoEngine";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { id } = await context.params;
    const { valor, data, contaId } = await req.json();

    const [aplicacao] = await db.select().from(aplicacoes)
      .where(and(eq(aplicacoes.id, id), eq(aplicacoes.userId, userId))).limit(1);
    if (!aplicacao) return NextResponse.json({ error: "Aplicação não encontrada" }, { status: 404 });
    if (aplicacao.resgatada) return NextResponse.json({ error: "Esta aplicação já foi resgatada" }, { status: 400 });

    const valorNum = Number(valor);
    if (isNaN(valorNum) || valorNum <= 0)
      return NextResponse.json({ error: "Valor inválido" }, { status: 400 });

    const hoje = hojeBrt();
    const dataAporte: string = data || hoje;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataAporte) || isNaN(new Date(dataAporte).getTime()))
      return NextResponse.json({ error: "Data inválida" }, { status: 400 });
    if (dataAporte > hoje)
      return NextResponse.json({ error: "A data do aporte não pode ser futura" }, { status: 400 });
    if (aplicacao.dataVencimento && dataAporte >= new Date(aplicacao.dataVencimento).toISOString().split("T")[0])
      return NextResponse.json({ error: "A data do aporte deve ser anterior ao vencimento" }, { status: 400 });

    // Data passada = registro histórico: entra no cálculo de rendimento e IR,
    // mas não mexe no saldo da conta (o dinheiro já saiu naquela época)
    const historico = dataAporte < hoje;

    const contaOrigemId: string = contaId || aplicacao.contaId;
    const [conta] = await db.select().from(contas)
      .where(and(eq(contas.id, contaOrigemId), eq(contas.userId, userId))).limit(1);
    if (!conta)       return NextResponse.json({ error: "Conta não encontrada" }, { status: 404 });
    if (!conta.ativo) return NextResponse.json({ error: "Conta inativa" }, { status: 400 });

    if (!historico) {
      const saldoAtual = Number(conta.saldoAtual);
      if (saldoAtual < valorNum)
        return NextResponse.json({ error: "Saldo insuficiente na conta para esse aporte" }, { status: 400 });

      const novoSaldo = saldoAtual - valorNum;
      await db.update(contas)
        .set({ saldoAtual: novoSaldo.toFixed(2), updatedAt: new Date() })
        .where(eq(contas.id, conta.id));

      await db.insert(extratoConta).values({
        userId, contaId: conta.id,
        data: hoje, tipo: "saida", valor: valorNum.toFixed(2),
        descricao: `Aporte — ${aplicacao.descricao || aplicacao.indexador.toUpperCase()}`,
        saldoApos: novoSaldo.toFixed(2),
        origem: "APLICACAO", referenciaId: aplicacao.id,
      });
    }

    const [aporte] = await db.insert(aportesAplicacao).values({
      aplicacaoId: aplicacao.id,
      data: dataAporte,
      valor: valorNum.toFixed(2),
      principalRestante: valorNum.toFixed(8),
      valorAtual: valorNum.toFixed(8),
      contaId: conta.id,
      historico,
    }).returning();

    // recalcula já, pra o aporte (e o rendimento retroativo) aparecerem na hora
    try { await recalcularAplicacao(aplicacao.id); }
    catch (e) { console.error("[Aplicações] recálculo após aporte falhou:", e); }

    return NextResponse.json(aporte, { status: 201 });
  } catch (error: any) {
    console.error("Erro ao registrar aporte:", error);
    return NextResponse.json({ error: error.message || "Erro ao registrar aporte" }, { status: 500 });
  }
}