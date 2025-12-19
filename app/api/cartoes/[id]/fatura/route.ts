import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { transacoes } from "@/db/schema";
import { eq, gte, lt, and, asc } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cartaoId = Number(id);

  const { searchParams } = new URL(req.url);
  const ano = Number(searchParams.get("ano"));
  const mes = Number(searchParams.get("mes"));

  if (!Number.isInteger(cartaoId) || isNaN(ano) || isNaN(mes)) {
    return NextResponse.json(
      { error: "Parâmetros inválidos" },
      { status: 400 }
    );
  }

  const inicioMes = new Date(ano, mes - 1, 1);
  const fimMes = new Date(ano, mes, 1);

  try {
    const todasTransacoes = await db
      .select()
      .from(transacoes)
      .where(
        and(
          eq(transacoes.cartaoId, cartaoId),
          gte(transacoes.data, inicioMes),
          lt(transacoes.data, fimMes)
        )
      )
      .orderBy(asc(transacoes.data)); // ✅ forma correta no Drizzle

    const transacoesDoMes = todasTransacoes.filter((t) => {
      const data = new Date(t.data);
      const transacaoMes = data.getMonth() + 1;
      const transacaoAno = data.getFullYear();

      // Simples
      if (!t.parcelado && !t.recorrente) {
        return transacaoMes === mes && transacaoAno === ano;
      }

      // Parceladas
      if (t.parcelado && t.parcelaAtual) {
        const mesesPassados = t.parcelaAtual - 1;
        const mesParcela = (transacaoMes + mesesPassados - 1) % 12 + 1;
        const anoParcela =
          transacaoAno +
          Math.floor((transacaoMes + mesesPassados - 1) / 12);

        return mesParcela === mes && anoParcela === ano;
      }

      // Recorrentes
      if (t.recorrente && t.recorrenciaId) {
        const diffMeses =
          (ano - transacaoAno) * 12 + (mes - transacaoMes);

        return diffMeses >= 0 && (!t.repeticoes || diffMeses < t.repeticoes);
      }

      return false;
    });

    const total = transacoesDoMes.reduce(
      (acc, t) => acc + Number(t.valor),
      0
    );

    const porCategoria: Record<string, number> = {};
    transacoesDoMes.forEach((t) => {
      const cat = t.categoria || "Sem categoria";
      porCategoria[cat] = (porCategoria[cat] || 0) + Number(t.valor);
    });

    return NextResponse.json({
      transacoes: transacoesDoMes,
      total,
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