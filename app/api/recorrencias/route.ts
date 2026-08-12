import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { recorrencias, transacoes, contas, cartoes, faturas, extratoConta } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import { calcularFaturaDaTransacao, proximaFaturaAberta } from "@/utils/faturaUtils";

export async function GET(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const lista = await db.select().from(recorrencias).where(eq(recorrencias.userId, userId));
  return NextResponse.json(lista);
}

// ✅ NOVO: reversão completa do impacto financeiro de uma transação — cobre
// tanto conta (dinheiro/PIX/débito) quanto cartão de crédito (fatura +
// limite). Usado ao converter uma transação "à vista" existente em
// recorrência. Baseado na lógica já usada em DELETE /api/transacoes/[id],
// que é mais completa que o reverterExtratoESaldo usado no PUT (esse só
// cobre o caso de conta, nunca reverte fatura/limite de cartão).
async function reverterTransacaoCompleta(
  transacao: typeof transacoes.$inferSelect,
  userId: string
): Promise<void> {
  const valor = Number(transacao.valor);

  if (transacao.contaId && transacao.formaPagamento !== "cartao") {
    const [conta] = await db.select().from(contas).where(eq(contas.id, transacao.contaId)).limit(1);
    if (conta) {
      const novoSaldo =
        transacao.tipo === "entrada" ? Number(conta.saldoAtual) - valor : Number(conta.saldoAtual) + valor;
      await db.update(contas)
        .set({ saldoAtual: novoSaldo.toFixed(2), updatedAt: new Date() })
        .where(and(eq(contas.id, transacao.contaId), eq(contas.userId, userId)));
    }
  }

  await db.delete(extratoConta).where(and(eq(extratoConta.referenciaId, transacao.id), eq(extratoConta.userId, userId)));

  if (transacao.cartaoId && transacao.formaPagamento === "cartao") {
    const [cartao] = await db.select().from(cartoes).where(eq(cartoes.id, transacao.cartaoId)).limit(1);
    if (cartao) {
      if (cartao.tipo === "debito" && cartao.contaVinculadaId) {
        const [conta] = await db.select().from(contas).where(eq(contas.id, cartao.contaVinculadaId)).limit(1);
        if (conta) {
          await db.update(contas)
            .set({ saldoAtual: (Number(conta.saldoAtual) + valor).toFixed(2), updatedAt: new Date() })
            .where(and(eq(contas.id, conta.id), eq(contas.userId, userId)));
        }
      } else if (cartao.tipo === "credito") {
        const { mes: mesFatura, ano: anoFatura } = calcularFaturaDaTransacao(new Date(transacao.data), cartao.diaFechamento || 1);
        const [fatura] = await db.select().from(faturas)
          .where(and(eq(faturas.cartaoId, transacao.cartaoId), eq(faturas.userId, userId), eq(faturas.mes, mesFatura), eq(faturas.ano, anoFatura)))
          .limit(1);
        if (fatura) {
          const novoTotal = Number(fatura.total) - valor;
          if (novoTotal <= 0) {
            await db.delete(faturas).where(eq(faturas.id, fatura.id));
          } else {
            await db.update(faturas).set({ total: novoTotal.toFixed(2), updatedAt: new Date() }).where(eq(faturas.id, fatura.id));
          }
        }
        await db.update(cartoes)
          .set({ limiteDisponivel: (Number(cartao.limiteDisponivel) + valor).toFixed(2) })
          .where(and(eq(cartoes.id, transacao.cartaoId), eq(cartoes.userId, userId)));
      }
    }
  }
}

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json();
  const {
    descricao, categoria, valor, tipo, formaPagamento,
    contaId, cartaoId, estabelecimentoId, data, repeticoesTotal,
    origemTransacaoId, // ✅ NOVO
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

  // ✅ CORRIGIDO: parseia a string "YYYY-MM-DD" pelos componentes, nunca
  // via new Date(string) + getters locais — isso é o bug clássico de fuso
  // (mesmo padrão evitado em calcularFaturaDaTransacao). new Date("2026-08-11")
  // é meia-noite UTC; lida com getDate() local, o dia pode "voltar" um dia
  // dependendo do fuso do servidor.
  const [anoStr, mesStr, diaStr] = String(data).slice(0, 10).split("-");
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

  // ✅ NOVO: se estamos convertendo uma transação "à vista" existente,
  // reverte o impacto financeiro dela e a remove — ela será substituída
  // pela primeira ocorrência do template (se a data for hoje) ou
  // simplesmente deixará de existir até o cron gerar a próxima ocorrência
  if (origemTransacaoId) {
    const [transacaoOrigem] = await db
      .select()
      .from(transacoes)
      .where(and(eq(transacoes.id, origemTransacaoId), eq(transacoes.userId, userId)))
      .limit(1);

    if (!transacaoOrigem) {
      return NextResponse.json({ error: "Transação de origem não encontrada" }, { status: 404 });
    }
    if (transacaoOrigem.parcelado || transacaoOrigem.recorrente) {
      return NextResponse.json(
        { error: "Esta transação já é parcelada ou recorrente — não é possível convertê-la diretamente" },
        { status: 400 }
      );
    }

    await reverterTransacaoCompleta(transacaoOrigem, userId);
    await db.delete(transacoes).where(and(eq(transacoes.id, origemTransacaoId), eq(transacoes.userId, userId)));
  }

  const [novaRecorrencia] = await db.insert(recorrencias).values({
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
  }).returning();

  // Se a data escolhida é hoje, gera a primeira ocorrência imediatamente
  // (com o impacto financeiro sendo aplicado agora mesmo). Se for uma data
  // futura, não gera nada agora — fica pro cron gerar no dia certo.
  if (ehHoje) {
    const [transacaoGerada] = await db.insert(transacoes).values({
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
    }).returning();

    if (formaPagamento === "cartao" && cartaoId) {
      const [cartao] = await db.select().from(cartoes).where(eq(cartoes.id, Number(cartaoId))).limit(1);
      if (cartao && cartao.tipo === "credito") {
        const diaFechamento = cartao.diaFechamento || 1;
        const { mes: mesCalc, ano: anoCalc } = calcularFaturaDaTransacao(dataInicio, diaFechamento);
        const { mes: mesFatura, ano: anoFatura } = proximaFaturaAberta(mesCalc, anoCalc, diaFechamento);

        const [faturaExistente] = await db.select().from(faturas)
          .where(and(eq(faturas.cartaoId, Number(cartaoId)), eq(faturas.userId, userId), eq(faturas.mes, mesFatura), eq(faturas.ano, anoFatura)))
          .limit(1);

        if (faturaExistente) {
          await db.update(faturas)
            .set({ total: (Number(faturaExistente.total) + valorNum).toFixed(2), updatedAt: new Date() })
            .where(eq(faturas.id, faturaExistente.id));
        } else {
          await db.insert(faturas).values({ userId, cartaoId: Number(cartaoId), mes: mesFatura, ano: anoFatura, total: valorNum.toFixed(2), paga: false });
        }

        await db.update(cartoes)
          .set({ limiteDisponivel: (Number(cartao.limiteDisponivel) - valorNum).toFixed(2) })
          .where(eq(cartoes.id, Number(cartaoId)));
      }
    } else if (contaId) {
      const [conta] = await db.select().from(contas).where(eq(contas.id, contaId)).limit(1);
      if (conta) {
        const saldoAtual = Number(conta.saldoAtual);
        const novoSaldo = tipo === "entrada" ? saldoAtual + valorNum : saldoAtual - valorNum;
        await db.update(contas)
          .set({ saldoAtual: novoSaldo.toFixed(2), updatedAt: new Date() })
          .where(eq(contas.id, contaId));
      }
    }

    await db.update(recorrencias)
      .set({ repeticoesGeradas: 1, ultimaGeracaoMes: agora.getMonth() + 1, ultimaGeracaoAno: agora.getFullYear() })
      .where(eq(recorrencias.id, novaRecorrencia.id));
  }

  return NextResponse.json(novaRecorrencia, { status: 201 });
}