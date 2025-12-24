import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { transacoes, faturas, contas, extratoConta } from "@/db/schema";
import { eq, and, gte, lt } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cartaoId = Number(id);

    const { searchParams } = new URL(req.url);
    const ano = Number(searchParams.get("ano"));
    const mes = Number(searchParams.get("mes"));

    if (!cartaoId || isNaN(ano) || isNaN(mes)) {
      return NextResponse.json(
        { error: "Parâmetros inválidos" },
        { status: 400 }
      );
    }

    /* 1. Intervalo do mês */
    // mes recebido como 1–12
    const inicioMes = new Date(ano, mes - 1, 1);
    const fimMes = new Date(ano, mes, 1);

    /* 2. Transações do cartão */
    const transacoesDoMes = await db
      .select()
      .from(transacoes)
      .where(
        and(
          eq(transacoes.cartaoId, cartaoId),
          gte(transacoes.data, inicioMes),
          lt(transacoes.data, fimMes)
        )
      );

    /* 3. Buscar fatura */
    const [fatura] = await db
      .select()
      .from(faturas)
      .where(
        and(
          eq(faturas.cartaoId, cartaoId),
          eq(faturas.ano, ano),
          eq(faturas.mes, mes)
        )
      );

    /* 4. Total */
    const totalCalculado = transacoesDoMes.reduce(
      (acc, t) => acc + Number(t.valor),
      0
    );

    const total = totalCalculado;

    /* 5. Resumo por categoria */
    const porCategoria: Record<string, number> = {};
    transacoesDoMes.forEach((t) => {
      const categoria = t.categoria || "Sem categoria";
      porCategoria[categoria] =
        (porCategoria[categoria] || 0) + Number(t.valor);
    });

    /* 6. Resposta */
    return NextResponse.json({
      fatura: {
        id: fatura?.id ?? null,
        cartaoId,
        mes,
        ano,
        total,
        paga: fatura?.paga ?? false,
        dataPagamento: fatura?.dataPagamento ?? null,
      },
      transacoes: transacoesDoMes,
      porCategoria,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Erro ao buscar fatura" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    /* 1. Parâmetros da rota */
    const { id } = await params;
    const cartaoId = Number(id);

    const { searchParams } = new URL(req.url);
    const ano = Number(searchParams.get("ano"));
    const mes = Number(searchParams.get("mes"));

    if (!cartaoId || isNaN(ano) || isNaN(mes)) {
      return NextResponse.json(
        { error: "Parâmetros inválidos" },
        { status: 400 }
      );
    }

    /* 2. Body */
    const { contaId, dataPagamento } = (await req.json()) as {
      contaId: string;
      dataPagamento?: string;
    };

    if (!contaId) {
      return NextResponse.json(
        { error: "Conta obrigatória para pagamento" },
        { status: 400 }
      );
    }

    /* 3. Buscar fatura */
    const [fatura] = await db
      .select()
      .from(faturas)
      .where(
        and(
          eq(faturas.cartaoId, cartaoId),
          eq(faturas.ano, ano),
          eq(faturas.mes, mes)
        )
      );

    if (!fatura) {
      return NextResponse.json(
        { error: "Fatura não encontrada" },
        { status: 404 }
      );
    }

    if (fatura.paga) {
      return NextResponse.json(
        { error: "Fatura já está paga" },
        { status: 400 }
      );
    }

    const valorFatura = Number(fatura.total);
    if (valorFatura <= 0) {
      return NextResponse.json(
        { error: "Fatura sem valor para pagamento" },
        { status: 400 }
      );
    }

    /* 4. Datas */
    const dataPgto = dataPagamento ? new Date(dataPagamento) : new Date();
    const dataPgtoISO = dataPgto.toISOString().split("T")[0];

    /* 5. Transaction */
    await db.transaction(async (trx) => {
      /* 5.1 Buscar conta */
      const [conta] = await trx
        .select()
        .from(contas)
        .where(eq(contas.id, contaId));

      if (!conta) {
        throw new Error("Conta não encontrada");
      }

      const saldoAnterior = Number(conta.saldoAtual);
      const saldoNovo = saldoAnterior - valorFatura;

      /* 5.2 Atualizar saldo da conta */
      await trx
        .update(contas)
        .set({ saldoAtual: String(saldoNovo) })
        .where(eq(contas.id, contaId));

      /* 5.3 Registrar extrato */
      await trx.insert(extratoConta).values({
        contaId,
        data: dataPgtoISO,
        tipo: "saida",
        valor: String(valorFatura),
        descricao: `Pagamento fatura ${String(mes).padStart(2, "0")}/${ano}`,
        saldoApos: String(saldoNovo),
        origem: "PAGAMENTO_FATURA",
        referenciaId: fatura.id,
      });

      /* 5.4 Marcar fatura como paga */
      await trx
        .update(faturas)
        .set({
          paga: true,
          dataPagamento: dataPgtoISO,
        })
        .where(eq(faturas.id, fatura.id));
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Erro ao pagar fatura" },
      { status: 500 }
    );
  }
}