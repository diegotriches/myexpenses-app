// src/app/api/dashboard/saldo-historico/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { extratoConta, contas } from "@/db/schema";
import { eq, and, lte, desc } from "drizzle-orm";
import { getUserId } from "@/lib/auth";

/**
 * GET /api/dashboard/saldo-historico
 *
 * Query Params:
 * - periodo: número de meses (padrão: "6", máx: 12)
 *
 * Retorna o saldo total consolidado de todas as contas mês a mês:
 * [{ mes: "2026-01", saldoTotal: 5000.00 }]
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

    // Buscar todas as contas ativas do usuário
    const contasUsuario = await db
      .select()
      .from(contas)
      .where(and(eq(contas.userId, userId), eq(contas.ativo, true)));

    if (contasUsuario.length === 0) {
      return NextResponse.json([]);
    }

    // Gerar array dos últimos N meses
    const hoje = new Date();
    const meses: { ano: number; mes: number; label: string }[] = [];
    for (let i = numMeses - 1; i >= 0; i--) {
      const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const ano = data.getFullYear();
      const mes = data.getMonth() + 1;
      meses.push({
        ano,
        mes,
        label: `${ano}-${String(mes).padStart(2, "0")}`,
      });
    }

    // Para cada mês, calcular o saldo total de todas as contas
    // Estratégia: pegar a última movimentação de cada conta até o fim do mês
    const resultado = await Promise.all(
      meses.map(async ({ ano, mes, label }) => {
        // Último dia do mês
        const fimMes = `${ano}-${String(mes).padStart(2, "0")}-${new Date(ano, mes, 0).getDate()}`;

        let saldoTotal = 0;

        for (const conta of contasUsuario) {
          // Última movimentação da conta até o fim do mês
          const [ultimaMov] = await db
            .select({ saldoApos: extratoConta.saldoApos })
            .from(extratoConta)
            .where(
              and(
                eq(extratoConta.contaId, conta.id),
                eq(extratoConta.userId, userId),
                lte(extratoConta.data, fimMes)
              )
            )
            .orderBy(desc(extratoConta.data), desc(extratoConta.createdAt))
            .limit(1);

          if (ultimaMov) {
            // Usa o saldo registrado no extrato
            saldoTotal += Number(ultimaMov.saldoApos);
          } else {
            // Sem movimentações até esse mês — usa saldo inicial da conta
            saldoTotal += Number(conta.saldoInicial);
          }
        }

        return {
          mes: label,
          saldoTotal: Math.round(saldoTotal * 100) / 100,
        };
      })
    );

    return NextResponse.json(resultado);
  } catch (error: any) {
    console.error("Erro ao buscar histórico de saldo:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao buscar histórico de saldo" },
      { status: 500 }
    );
  }
}