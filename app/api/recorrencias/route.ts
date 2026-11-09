import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { recorrencias, transacoes } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import { hojeBrt } from "@/utils/aplicacaoSimulacao";
import { garantirDono } from "@/lib/garantirDono";
import { ErroFinanceiro } from "@/lib/movimentacaoConta";
import { buscarAntecipacaoBloqueante, possuiEstorno, reverterImpacto, transacaoEmFaturaPaga } from "@/lib/impactoTransacao";
import { aplicarImpactoRecorrencia } from "@/lib/aplicarImpacto";
import { notificarImpactoRecorrencia } from "@/lib/notificarRecorrencia";

export async function GET(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const lista = await db.select().from(recorrencias).where(eq(recorrencias.userId, userId));
  return NextResponse.json(lista);
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

  // Antes de qualquer escrita, inclusive a reversão da transação de origem
  const erroDono = await garantirDono(userId, { contaId, cartaoId, estabelecimentoId });
  if (erroDono) return NextResponse.json({ error: erroDono }, { status: 404 });

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

  const ehHoje = String(data).slice(0, 10) === hojeBrt();

  try {
    const { novaRecorrencia, geracao } = await db.transaction(async (tx) => {
      // Convertendo uma transação à vista: ela é revertida e removida, e será
      // substituída pela primeira ocorrência (se a data for hoje) ou pelo cron
      if (origemTransacaoId) {
        const [transacaoOrigem] = await tx
          .select()
          .from(transacoes)
          .where(and(eq(transacoes.id, origemTransacaoId), eq(transacoes.userId, userId)))
          .limit(1)
          .for("update");

        if (!transacaoOrigem) throw new ErroFinanceiro("Transação de origem não encontrada", 404);
        if (transacaoOrigem.parcelado || transacaoOrigem.recorrente) {
          throw new ErroFinanceiro("Esta transação já é parcelada ou recorrente — não é possível convertê-la diretamente");
        }
        if (transacaoOrigem.tipo === "estorno" || await possuiEstorno(tx, userId, [transacaoOrigem.id])) {
          throw new ErroFinanceiro("Compras com estorno e estornos não podem ser convertidos em recorrência.");
        }
        if (await transacaoEmFaturaPaga(tx, userId, transacaoOrigem)) {
          throw new ErroFinanceiro("Esta transação faz parte de uma fatura já paga. Estorne o pagamento antes de convertê-la.");
        }
        if (await buscarAntecipacaoBloqueante(tx, userId, transacaoOrigem)) {
          throw new ErroFinanceiro("Esta transação faz parte de uma antecipação pendente. Desfaça a antecipação antes de convertê-la.");
        }

        await reverterImpacto(tx, transacaoOrigem, userId);
        await tx.delete(transacoes).where(and(eq(transacoes.id, origemTransacaoId), eq(transacoes.userId, userId)));
      }

      const [criada] = await tx.insert(recorrencias).values({
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

      // Data de hoje gera a primeira ocorrência agora; data futura fica para o cron
      if (!ehHoje) return { novaRecorrencia: criada, geracao: null };

      const [transacaoGerada] = await tx.insert(transacoes).values({
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
        origemRecorrenciaId: criada.id,
      }).returning();

      // Mesmo helper do cron: devolve alerta se o saldo ou o limite ficou
      // negativo (nunca bloqueia a geração)
      const alerta = await aplicarImpactoRecorrencia(tx, {
        userId,
        tipo,
        valor: valorNum,
        data: dataInicio,
        formaPagamento: formaPagamento || "dinheiro",
        contaId: contaId || null,
        cartaoId: cartaoId ? Number(cartaoId) : null,
        transacaoId: transacaoGerada.id,
        descricao: descricao || null,
      });

      await tx.update(recorrencias)
        .set({ repeticoesGeradas: 1, ultimaGeracaoMes: mesInicio, ultimaGeracaoAno: anoInicio })
        .where(eq(recorrencias.id, criada.id));

      return { novaRecorrencia: criada, geracao: { transacaoId: transacaoGerada.id, alerta } };
    });

    if (geracao?.alerta) {
      await notificarImpactoRecorrencia({
        userId,
        recorrenciaId: novaRecorrencia.id,
        transacaoId: geracao.transacaoId,
        descricao: descricao || null,
        valor: valorNum,
        dataTexto: `${String(diaInicio).padStart(2, "0")}/${String(mesInicio).padStart(2, "0")}`,
        alerta: geracao.alerta,
      });
    }

    return NextResponse.json(novaRecorrencia, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof ErroFinanceiro) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Erro ao criar recorrência:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao criar recorrência" }, { status: 500 });
  }
}
