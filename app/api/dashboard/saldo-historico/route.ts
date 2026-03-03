// src/app/api/dashboard/saldo-historico/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { extratoConta, contas } from "@/db/schema";
import { eq, and, lte } from "drizzle-orm";
import { getUserId } from "@/lib/auth";

/**
 * GET /api/dashboard/saldo-historico?periodo=6
 *
 * Retorna o saldo total consolidado de todas as contas mes a mes.
 *
 * OTIMIZADO: busca todos os extratos de uma vez com uma unica query,
 * depois agrupa em memoria por conta/mes — eliminando o loop N x M.
 */
export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }

    const periodoParam = req.nextUrl.searchParams.get("periodo") || "6";
    const numMeses = parseInt(periodoParam);

    if (isNaN(numMeses) || numMeses < 1 || numMeses > 12) {
      return NextResponse.json(
        { error: "Periodo invalido (1-12 meses)" },
        { status: 400 }
      );
    }

    // 1. Buscar contas ativas
    const contasUsuario = await db
      .select()
      .from(contas)
      .where(and(eq(contas.userId, userId), eq(contas.ativo, true)));

    if (contasUsuario.length === 0) {
      return NextResponse.json([]);
    }

    // 2. Gerar meses e calcular data de corte (inicio do periodo)
    const hoje = new Date();
    const meses: { ano: number; mes: number; label: string; fimMes: string }[] = [];

    for (let i = numMeses - 1; i >= 0; i--) {
      const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const ano = data.getFullYear();
      const mes = data.getMonth() + 1;
      const ultimoDia = new Date(ano, mes, 0).getDate();
      meses.push({
        ano,
        mes,
        label: ano + "-" + String(mes).padStart(2, "0"),
        fimMes: ano + "-" + String(mes).padStart(2, "0") + "-" + ultimoDia,
      });
    }

    // Data de corte: fim do ultimo mes do periodo
    const fimPeriodo = meses[meses.length - 1].fimMes;

    // 3. UMA UNICA QUERY: todos os extratos de todas as contas ate o fim do periodo
    const todosExtratos = await db
      .select({
        contaId: extratoConta.contaId,
        data: extratoConta.data,
        saldoApos: extratoConta.saldoApos,
        createdAt: extratoConta.createdAt,
      })
      .from(extratoConta)
      .where(
        and(
          eq(extratoConta.userId, userId),
          lte(extratoConta.data, fimPeriodo)
        )
      )
      .orderBy(extratoConta.data, extratoConta.createdAt);

    // 4. Agrupar extratos por contaId em memoria
    // Map<contaId, array de movimentacoes ordenadas por data>
    const extratosPorConta = new Map<string, { data: string; saldoApos: number; createdAt: Date }[]>();

    for (const e of todosExtratos) {
      const lista = extratosPorConta.get(e.contaId) ?? [];
      lista.push({
        data: typeof e.data === "string" ? e.data : (e.data as Date).toISOString().split("T")[0],
        saldoApos: Number(e.saldoApos),
        createdAt: e.createdAt instanceof Date ? e.createdAt : new Date(e.createdAt),
      });
      extratosPorConta.set(e.contaId, lista);
    }

    // Saldo inicial por conta (usado quando nao ha movimentacao no periodo)
    const saldoInicialMap = new Map(
      contasUsuario.map((c) => [c.id, Number(c.saldoInicial)])
    );

    // 5. Calcular saldo por mes em memoria — zero queries adicionais
    const resultado = meses.map(({ label, fimMes }) => {
      let saldoTotal = 0;

      for (const conta of contasUsuario) {
        const movimentacoes = extratosPorConta.get(conta.id) ?? [];

        // Pegar a ultima movimentacao ate o fim do mes
        // (lista ja esta ordenada por data asc)
        let ultimoSaldo: number | null = null;
        for (const mov of movimentacoes) {
          if (mov.data <= fimMes) {
            ultimoSaldo = mov.saldoApos;
          } else {
            break;
          }
        }

        if (ultimoSaldo !== null) {
          saldoTotal += ultimoSaldo;
        } else {
          // Sem movimentacoes ate esse mes — usa saldo inicial
          saldoTotal += saldoInicialMap.get(conta.id) ?? 0;
        }
      }

      return {
        mes: label,
        saldoTotal: Math.round(saldoTotal * 100) / 100,
      };
    });

    return NextResponse.json(resultado);
  } catch (error: any) {
    console.error("Erro ao buscar historico de saldo:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao buscar historico de saldo" },
      { status: 500 }
    );
  }
}