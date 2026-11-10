import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { extratoConta, contas } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import { respostaDeErro } from "@/lib/rota";
import { centavos, valorAssinado } from "@/lib/saldoExtrato";
import { hojeBrt } from "@/utils/aplicacaoSimulacao";

/**
 * GET /api/dashboard/saldo-historico?periodo=6
 *
 * Saldo total consolidado das contas ativas no fim de cada mês.
 *
 * O saldo é derivado das linhas do extrato, ancorado no saldo atual
 * (ver lib/saldoExtrato.ts): saldo no fim do mês = saldo atual − soma das
 * linhas com data posterior. Assim lançamentos retroativos, edições e
 * exclusões aparecem no histórico, o que o `saldo_apos` gravado não garante.
 */
export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const periodoParam = req.nextUrl.searchParams.get("periodo") || "6";
    const numMeses = parseInt(periodoParam);

    if (isNaN(numMeses) || numMeses < 1 || numMeses > 12) {
      return NextResponse.json(
        { error: "Período inválido (1-12 meses)" },
        { status: 400 }
      );
    }

    // 1. Contas ativas
    const contasUsuario = await db
      .select({ id: contas.id, saldoAtual: contas.saldoAtual })
      .from(contas)
      .where(and(eq(contas.userId, userId), eq(contas.ativo, true)));

    if (contasUsuario.length === 0) {
      return NextResponse.json([]);
    }

    // 2. Meses do período, terminando no mês atual (fuso BRT)
    const [anoAtual, mesAtual] = hojeBrt().split("-").map(Number);
    const meses: { label: string; fimMes: string }[] = [];

    for (let i = numMeses - 1; i >= 0; i--) {
      const base = new Date(Date.UTC(anoAtual, mesAtual - 1 - i, 1));
      const ano = base.getUTCFullYear();
      const mes = base.getUTCMonth() + 1;
      const ultimoDia = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
      const label = ano + "-" + String(mes).padStart(2, "0");
      meses.push({ label, fimMes: label + "-" + String(ultimoDia).padStart(2, "0") });
    }

    // 3. Uma query: linhas posteriores ao fim do primeiro mês (inclui datas futuras)
    const posteriores = await db
      .select({ contaId: extratoConta.contaId, data: extratoConta.data, valor: valorAssinado })
      .from(extratoConta)
      .where(and(eq(extratoConta.userId, userId), gt(extratoConta.data, meses[0].fimMes)));

    const ativas = new Set(contasUsuario.map((c) => c.id));
    const saldoAtualTotal = contasUsuario.reduce((s, c) => s + Number(c.saldoAtual), 0);

    // 4. Fim de cada mês = saldo atual − linhas de contas ativas depois dessa data
    const resultado = meses.map(({ label, fimMes }) => {
      const depois = posteriores
        .filter((l) => ativas.has(l.contaId) && l.data > fimMes)
        .reduce((s, l) => s + Number(l.valor), 0);
      return { mes: label, saldoTotal: centavos(saldoAtualTotal - depois) };
    });

    return NextResponse.json(resultado);
  } catch (error) {
    return respostaDeErro(error, "Erro ao buscar histórico de saldo");
  }
}
