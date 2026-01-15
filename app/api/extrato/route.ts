// app/api/extrato/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { extratoConta, contas } from "@/db/schema";
import { eq, and, gte, lte, desc, inArray } from "drizzle-orm";
import { getUserId } from "@/lib/auth";

// ✅ Tipos alinhados com useExtrato
interface MovimentacaoExtrato {
  id: string;
  data: string;
  tipo: "entrada" | "saida";
  valor: number;
  descricao: string;
  saldoApos: number;
  origem: "TRANSACAO_MANUAL" | "PAGAMENTO_FATURA" | "TRANSFERENCIA" | "AJUSTE" | "ESTORNO";
  referenciaId?: string | null;
  contaId: string;
  contaNome: string;
  categoria?: string | null;
  formaPagamento?: string | null;
}

interface SaldoConta {
  contaId: string;
  contaNome: string;
  saldoInicial: number;
  saldoFinal: number;
  totalEntradas: number;
  totalSaidas: number;
}

interface ExtratoResponse {
  periodo: {
    ano: number;
    mes: number;
    inicio: string;
    fim: string;
  };
  resumo: {
    saldoInicial: number;
    totalEntradas: number;
    totalSaidas: number;
    saldoFinal: number;
  };
  saldosPorConta: SaldoConta[]; // ✅ Renomeado para clareza
  movimentacoes: MovimentacaoExtrato[];
}

export async function GET(req: NextRequest) {
  try {
    // 🔐 Autenticação
    const userId = await getUserId();

    // ✅ VALIDAÇÃO: Retorna 401 se não autenticado
    if (!userId) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);

    /* 1. Query params */
    const ano = searchParams.get("ano");
    const mes = searchParams.get("mes");
    const contaId = searchParams.get("contaId");
    const origem = searchParams.get("origem");
    const tipo = searchParams.get("tipo");
    const dataInicio = searchParams.get("dataInicio");
    const dataFim = searchParams.get("dataFim");

    /* 2. Validação de período */
    if (!ano || !mes) {
      return NextResponse.json(
        { error: "Ano e mês são obrigatórios" },
        { status: 400 }
      );
    }

    /* 3. Calcular datas do período */
    const mesNum = parseInt(mes);
    const anoNum = parseInt(ano);

    const inicio = dataInicio || `${anoNum}-${String(mesNum).padStart(2, "0")}-01`;
    const ultimoDia = new Date(anoNum, mesNum, 0).getDate();
    const fim = dataFim || `${anoNum}-${String(mesNum).padStart(2, "0")}-${ultimoDia}`;

    /* 4. Filtros dinâmicos - 🔐 SEMPRE filtrar por userId */
    const filtros = [
      eq(extratoConta.userId, userId), // 🔐 CRÍTICO
      gte(extratoConta.data, inicio),
      lte(extratoConta.data, fim),
    ];

    if (contaId) {
      filtros.push(eq(extratoConta.contaId, contaId));
    }

    if (origem && origem !== "TODAS") {
      filtros.push(eq(extratoConta.origem, origem as any));
    }

    if (tipo && tipo !== "TODOS") {
      filtros.push(eq(extratoConta.tipo, tipo as any));
    }

    /* 5. Buscar movimentações - join com contas */
    const movimentacoes = await db
      .select({
        id: extratoConta.id,
        contaId: extratoConta.contaId,
        contaNome: contas.nome,
        data: extratoConta.data,
        tipo: extratoConta.tipo,
        valor: extratoConta.valor,
        descricao: extratoConta.descricao,
        saldoApos: extratoConta.saldoApos,
        origem: extratoConta.origem,
        referenciaId: extratoConta.referenciaId,
        createdAt: extratoConta.createdAt,
      })
      .from(extratoConta)
      .innerJoin(
        contas,
        and(
          eq(extratoConta.contaId, contas.id),
          eq(contas.userId, userId) // 🔐 Garantir ownership
        )
      )
      .where(and(...filtros))
      .orderBy(desc(extratoConta.data), desc(extratoConta.createdAt));

    /* 6. Buscar contas envolvidas */
    const contasIds = [...new Set(movimentacoes.map((m) => m.contaId))];

    const contasEnvolvidas =
      contaId
        ? await db
            .select()
            .from(contas)
            .where(
              and(
                eq(contas.id, contaId),
                eq(contas.userId, userId)
              )
            )
        : contasIds.length > 0
        ? await db
            .select()
            .from(contas)
            .where(
              and(
                inArray(contas.id, contasIds),
                eq(contas.userId, userId)
              )
            )
        : [];

    /* 7. Calcular saldos por conta */
    const saldosPorConta: SaldoConta[] = await Promise.all(
      contasEnvolvidas.map(async (conta) => {
        // Busca última movimentação antes do período
        const [movAnterior] = await db
          .select()
          .from(extratoConta)
          .where(
            and(
              eq(extratoConta.contaId, conta.id),
              eq(extratoConta.userId, userId),
              lte(extratoConta.data, inicio)
            )
          )
          .orderBy(desc(extratoConta.data), desc(extratoConta.createdAt))
          .limit(1);

        const saldoInicial = movAnterior
          ? Number(movAnterior.saldoApos)
          : Number(conta.saldoInicial);

        // Movimentações desta conta no período
        const movsConta = movimentacoes.filter((m) => m.contaId === conta.id);

        const totalEntradas = movsConta
          .filter((m) => m.tipo === "entrada")
          .reduce((sum, m) => sum + Number(m.valor), 0);

        const totalSaidas = movsConta
          .filter((m) => m.tipo === "saida")
          .reduce((sum, m) => sum + Number(m.valor), 0);

        const saldoFinal = Number(conta.saldoAtual);

        return {
          contaId: conta.id,
          contaNome: conta.nome,
          saldoInicial,
          saldoFinal,
          totalEntradas,
          totalSaidas,
        };
      })
    );

    /* 8. ✅ NOVO: Calcular resumo consolidado (todas as contas) */
    const resumo = saldosPorConta.reduce(
      (acc, saldo) => ({
        saldoInicial: acc.saldoInicial + saldo.saldoInicial,
        totalEntradas: acc.totalEntradas + saldo.totalEntradas,
        totalSaidas: acc.totalSaidas + saldo.totalSaidas,
        saldoFinal: acc.saldoFinal + saldo.saldoFinal,
      }),
      {
        saldoInicial: 0,
        totalEntradas: 0,
        totalSaidas: 0,
        saldoFinal: 0,
      }
    );

    /* 9. ✅ Resposta tipada e alinhada com hook */
    const response: ExtratoResponse = {
      periodo: {
        ano: anoNum,
        mes: mesNum,
        inicio,
        fim,
      },
      resumo, // ✅ Resumo consolidado
      saldosPorConta, // ✅ Renomeado (antes era "saldos")
      movimentacoes: movimentacoes.map((m) => ({
        id: m.id,
        contaId: m.contaId,
        contaNome: m.contaNome || "", // ✅ Garantir string
        data: m.data,
        tipo: m.tipo,
        valor: Number(m.valor),
        descricao: m.descricao,
        saldoApos: Number(m.saldoApos),
        origem: m.origem,
        referenciaId: m.referenciaId,
        // ✅ NOTA: categoria e formaPagamento viriam de join com transações
        // Por enquanto, retornar null (extrato não tem esses campos diretamente)
        categoria: null,
        formaPagamento: null,
      })),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Erro ao buscar extrato:", error);
    const message = error instanceof Error ? error.message : "Erro ao buscar extrato";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}