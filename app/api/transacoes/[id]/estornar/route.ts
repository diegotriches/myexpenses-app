// app/api/transacoes/[id]/estornar/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { getUserId } from "@/lib/auth";
import { ErroFinanceiro } from "@/lib/movimentacaoConta";
import {
  cancelarCompraParcelada,
  carregarContexto,
  estornarPorValor,
  planejarLancamentos,
  restantesDasPagas,
  separarParcelas,
} from "@/lib/estornoTransacao";
import { hojeBrt } from "@/utils/aplicacaoSimulacao";
import { lerValorPositivo } from "@/lib/validators/financeiro";

type Contexto = { params: Promise<{ id: string }> };

interface CorpoEstorno {
  modo?: string;
  valor?: string | number;
  data?: string;
  motivo?: string;
}

function respostaDeErro(error: unknown, mensagemPadrao: string) {
  if (error instanceof ErroFinanceiro) return NextResponse.json({ error: error.message }, { status: error.status });
  console.error(mensagemPadrao, error);
  return NextResponse.json({ error: error instanceof Error ? error.message : mensagemPadrao }, { status: 500 });
}

// Prévia para o modal: quanto pode ser estornado e onde cada parte vai entrar
export async function GET(req: NextRequest, { params }: Contexto) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { id } = await params;
    const contexto = await carregarContexto(db, userId, id);
    const { searchParams } = new URL(req.url);

    const { pagas, emAberto } = await separarParcelas(db, userId, contexto.grupo);
    const centavosCancelamento = restantesDasPagas(pagas, contexto.estornadoPorId).reduce((soma, r) => soma + r.centavos, 0);

    const valor = lerValorPositivo(searchParams.get("valor"));
    const data = searchParams.get("data") || hojeBrt();
    const centavos = valor === null ? 0 : Math.round(valor * 100);
    const lancamentos = centavos > 0
      ? await planejarLancamentos(db, userId, contexto.cartao, centavos, data)
      : [];

    return NextResponse.json({
      parcelado: contexto.parcelado,
      valorCompra: contexto.centavosCompra / 100,
      jaEstornado: contexto.centavosEstornados / 100,
      disponivel: contexto.centavosDisponiveis / 100,
      lancamentos: lancamentos.map((l) => ({ mes: l.mes, ano: l.ano, valor: l.centavos / 100, data: l.data })),
      cancelamento: {
        bloqueado: contexto.estornadoPorId.size > 0,
        parcelasExcluidas: emAberto.length,
        valorEstorno: centavosCancelamento / 100,
      },
    });
  } catch (error: unknown) {
    return respostaDeErro(error, "Erro ao calcular o estorno");
  }
}

export async function POST(req: NextRequest, { params }: Contexto) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { id } = await params;
    const corpo: CorpoEstorno = await req.json();
    const hoje = hojeBrt();
    const data = corpo.data || hoje;
    const motivo = corpo.motivo?.trim().slice(0, 120) || null;

    if (corpo.modo === "cancelar") {
      const resultado = await db.transaction((tx) =>
        cancelarCompraParcelada(tx, { userId, compraId: id, data, hoje, motivo }),
      );
      return NextResponse.json(resultado, { status: 201 });
    }

    const valor = lerValorPositivo(corpo.valor);
    if (valor === null) return NextResponse.json({ error: "Informe o valor do estorno." }, { status: 400 });

    const lancamentos = await db.transaction((tx) =>
      estornarPorValor(tx, { userId, compraId: id, centavos: Math.round(valor * 100), data, hoje, motivo }),
    );
    return NextResponse.json({ lancamentos }, { status: 201 });
  } catch (error: unknown) {
    return respostaDeErro(error, "Erro ao registrar o estorno");
  }
}
