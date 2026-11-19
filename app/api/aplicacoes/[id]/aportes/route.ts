import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { aplicacoes, aportesAplicacao, contas } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import { movimentarConta } from "@/lib/movimentacaoConta";
import { hojeBrt } from "@/utils/aplicacaoSimulacao";
import { recalcularAplicacao } from "@/lib/aplicacaoEngine";
import { respostaDeErro } from "@/lib/rota";
import { nomePadraoAplicacao } from "@/utils/tipoAplicacao";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { id } = await context.params;
    const { valor, data, contaId, movimentarConta: movimentarSaldo } = await req.json();

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

    // Data passada entra no cálculo de rendimento e IR e, por padrão, desconta da
    // conta com o extrato na data informada. Com movimentarConta: false é só
    // registro histórico (o dinheiro já tinha saído e não mexe no saldo)
    const historico = dataAporte < hoje && movimentarSaldo === false;

    const contaOrigemId: string = contaId || aplicacao.contaId;
    const [conta] = await db.select().from(contas)
      .where(and(eq(contas.id, contaOrigemId), eq(contas.userId, userId))).limit(1);
    if (!conta)       return NextResponse.json({ error: "Conta não encontrada" }, { status: 404 });
    if (!conta.ativo) return NextResponse.json({ error: "Conta inativa" }, { status: 400 });

    const aporte = await db.transaction(async (tx) => {
      if (!historico) {
        await movimentarConta(tx, {
          userId,
          contaId: conta.id,
          tipo: "saida",
          valor: valorNum,
          data: dataAporte,
          descricao: `Aporte — ${aplicacao.descricao || nomePadraoAplicacao(aplicacao)}`,
          origem: "APLICACAO",
          referenciaId: aplicacao.id,
          mensagemSaldoInsuficiente: "Saldo insuficiente na conta para esse aporte",
        });
      }

      const [criado] = await tx.insert(aportesAplicacao).values({
        aplicacaoId: aplicacao.id,
        data: dataAporte,
        valor: valorNum.toFixed(2),
        principalRestante: valorNum.toFixed(8),
        valorAtual: valorNum.toFixed(8),
        contaId: conta.id,
        historico,
      }).returning();

      return criado;
    });

    // recalcula já, pra o aporte (e o rendimento retroativo) aparecerem na hora
    try { await recalcularAplicacao(aplicacao.id); }
    catch (e) { console.error("[Aplicações] recálculo após aporte falhou:", e); }

    return NextResponse.json(aporte, { status: 201 });
  } catch (error) {
    return respostaDeErro(error, "Erro ao registrar aporte");
  }
}