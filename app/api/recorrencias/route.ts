import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  recorrencias,
  transacoes,
  contas,
  cartoes,
  faturas,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import {
  calcularFaturaDaTransacao,
  proximaFaturaAberta,
} from "@/utils/faturaUtils";

export async function GET(req: NextRequest) {
  const userId = await getUserId();
  if (!userId)
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const lista = await db
    .select()
    .from(recorrencias)
    .where(eq(recorrencias.userId, userId));
  return NextResponse.json(lista);
}

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId)
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json();
  const {
    descricao,
    categoria,
    valor,
    tipo,
    formaPagamento,
    contaId,
    cartaoId,
    estabelecimentoId,
    data,
    repeticoesTotal,
  } = body;

  if (!tipo || !["entrada", "saida"].includes(tipo)) {
    return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
  }
  const valorNum = Number(valor);
  if (isNaN(valorNum) || valorNum <= 0) {
    return NextResponse.json({ error: "Valor inválido" }, { status: 400 });
  }
  if (!data || isNaN(new Date(data).getTime())) {
    return NextResponse.json({ error: "Data inválida" }, { status: 400 });
  }

  const [anoStr, mesStr, diaStr] = data.slice(0, 10).split("-");
  const anoInicio = Number(anoStr);
  const mesInicio = Number(mesStr); // 1-12
  const diaInicio = Number(diaStr);

  const dataInicio = new Date(anoInicio, mesInicio - 1, diaInicio);
  const diaDoMes = diaInicio;

  const agora = new Date();
  const ehHoje =
    anoInicio === agora.getFullYear() &&
    mesInicio === agora.getMonth() + 1 &&
    diaInicio === agora.getDate();

  const [novaRecorrencia] = await db
    .insert(recorrencias)
    .values({
      userId,
      descricao: descricao || null,
      categoria: categoria || null,
      valor: valorNum.toFixed(2),
      tipo,
      formaPagamento: formaPagamento || "dinheiro",
      contaId: contaId || null,
      cartaoId: cartaoId ? Number(cartaoId) : null,
      estabelecimentoId: estabelecimentoId || null,
      diaDoMes,
      dataInicio,
      repeticoesTotal: repeticoesTotal ? Number(repeticoesTotal) : null,
      repeticoesGeradas: 0,
      ativa: true,
    })
    .returning();

  // ✅ Se a data escolhida é hoje, gera a primeira ocorrência imediatamente
  // (com o impacto financeiro sendo aplicado agora mesmo, já que a
  // transação está de fato ocorrendo hoje). Se for uma data futura, não
  // gera nada agora — fica pro cron gerar no dia certo, como qualquer
  // outra ocorrência futura.
  if (ehHoje) {
    const [transacaoGerada] = await db
      .insert(transacoes)
      .values({
        userId,
        tipo,
        valor: valorNum.toFixed(2),
        data: dataInicio,
        descricao: descricao || null,
        categoria: categoria || null,
        formaPagamento: formaPagamento || "dinheiro",
        contaId: contaId || null,
        cartaoId: cartaoId ? Number(cartaoId) : null,
        estabelecimentoId: estabelecimentoId || null,
        recorrente: true,
        origemRecorrenciaId: novaRecorrencia.id,
      })
      .returning();

    if (formaPagamento === "cartao" && cartaoId) {
      const [cartao] = await db
        .select()
        .from(cartoes)
        .where(eq(cartoes.id, Number(cartaoId)))
        .limit(1);
      if (cartao && cartao.tipo === "credito") {
        const diaFechamento = cartao.diaFechamento || 1;
        const { mes: mesCalc, ano: anoCalc } = calcularFaturaDaTransacao(
          dataInicio,
          diaFechamento,
        );
        const { mes: mesFatura, ano: anoFatura } = proximaFaturaAberta(
          mesCalc,
          anoCalc,
          diaFechamento,
        );

        const [faturaExistente] = await db
          .select()
          .from(faturas)
          .where(
            and(
              eq(faturas.cartaoId, Number(cartaoId)),
              eq(faturas.userId, userId),
              eq(faturas.mes, mesFatura),
              eq(faturas.ano, anoFatura),
            ),
          )
          .limit(1);

        if (faturaExistente) {
          await db
            .update(faturas)
            .set({
              total: (Number(faturaExistente.total) + valorNum).toFixed(2),
              updatedAt: new Date(),
            })
            .where(eq(faturas.id, faturaExistente.id));
        } else {
          await db.insert(faturas).values({
            userId,
            cartaoId: Number(cartaoId),
            mes: mesFatura,
            ano: anoFatura,
            total: valorNum.toFixed(2),
            paga: false,
          });
        }

        await db
          .update(cartoes)
          .set({
            limiteDisponivel: (
              Number(cartao.limiteDisponivel) - valorNum
            ).toFixed(2),
          })
          .where(eq(cartoes.id, Number(cartaoId)));
      }
    } else if (contaId) {
      const [conta] = await db
        .select()
        .from(contas)
        .where(eq(contas.id, contaId))
        .limit(1);
      if (conta) {
        const saldoAtual = Number(conta.saldoAtual);
        const novoSaldo =
          tipo === "entrada" ? saldoAtual + valorNum : saldoAtual - valorNum;
        await db
          .update(contas)
          .set({ saldoAtual: novoSaldo.toFixed(2), updatedAt: new Date() })
          .where(eq(contas.id, contaId));
      }
    }

    await db
      .update(recorrencias)
      .set({
        repeticoesGeradas: 1,
        ultimaGeracaoMes: agora.getMonth() + 1,
        ultimaGeracaoAno: agora.getFullYear(),
      })
      .where(eq(recorrencias.id, novaRecorrencia.id));
  }

  return NextResponse.json(novaRecorrencia, { status: 201 });
}
