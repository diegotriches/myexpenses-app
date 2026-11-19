import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { aplicacoes, aportesAplicacao, contas } from "@/db/schema";
import { and, asc, eq } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import { ErroFinanceiro, movimentarConta } from "@/lib/movimentacaoConta";
import { respostaDeErro } from "@/lib/rota";
import { recalcularAplicacao } from "@/lib/aplicacaoEngine";
import { dataPrimeiroAporte, desfazerLancamentoAporte, temResgateDesde } from "@/lib/aporteExtrato";
import { hojeBrt } from "@/utils/aplicacaoSimulacao";
import { nomePadraoAplicacao } from "@/utils/tipoAplicacao";

type Contexto = { params: Promise<{ id: string; aporteId: string }> };

const erro = (mensagem: string, status = 400) => NextResponse.json({ error: mensagem }, { status });

const MSG_RESGATE = "Há resgate na data deste aporte ou depois: o valor resgatado foi calculado com ele, então o aporte não pode mudar";

/** Aplicação e aporte do usuário, ou a resposta de erro */
async function carregar(userId: string, id: string, aporteId: string) {
  const [aplicacao] = await db.select().from(aplicacoes)
    .where(and(eq(aplicacoes.id, id), eq(aplicacoes.userId, userId))).limit(1);
  if (!aplicacao) return { resposta: erro("Aplicação não encontrada", 404) } as const;

  const [aporte] = await db.select().from(aportesAplicacao)
    .where(and(eq(aportesAplicacao.id, aporteId), eq(aportesAplicacao.aplicacaoId, aplicacao.id))).limit(1);
  if (!aporte) return { resposta: erro("Aporte não encontrado", 404) } as const;

  return { aplicacao, aporte } as const;
}

/** A data da aplicação acompanha o primeiro aporte (barra de prazo, ordem) */
async function atualizarDataAplicacao(aplicacaoId: string) {
  const primeira = await dataPrimeiroAporte(db, aplicacaoId);
  if (!primeira) return;
  await db.update(aplicacoes)
    .set({ dataAplicacao: new Date(`${primeira}T12:00:00-03:00`), updatedAt: new Date() })
    .where(eq(aplicacoes.id, aplicacaoId));
}

async function recalcular(aplicacaoId: string) {
  try { await recalcularAplicacao(aplicacaoId); }
  catch (e) { console.error("[Aplicações] recálculo após mudar aporte falhou:", e); }
}

/**
 * Liga ou desliga o desconto de um aporte na conta, depois de criado.
 * - `descontado: true`: aporte histórico (o valor não saiu da conta) passa a
 *   debitar a conta, com o lançamento no extrato na data do aporte.
 * - `descontado: false`: desfaz o desconto (feito na criação ou por aqui):
 *   devolve o valor à conta, apaga o lançamento e o aporte volta a ser histórico.
 * O rendimento não muda: o aporte já conta desde a sua data nos dois casos.
 */
export async function PATCH(req: NextRequest, context: Contexto) {
  try {
    const userId = await getUserId();
    if (!userId) return erro("Não autenticado", 401);

    const { id, aporteId } = await context.params;
    const { descontado }: Partial<Record<"descontado", unknown>> = await req.json();
    if (typeof descontado !== "boolean") return erro("Informe se o aporte deve ser descontado da conta");

    const r = await carregar(userId, id, aporteId);
    if ("resposta" in r) return r.resposta;
    const { aplicacao, aporte } = r;

    // Aportes antigos podem não ter a conta gravada: usa a da aplicação
    const contaId = aporte.contaId ?? aplicacao.contaId;
    const [conta] = await db.select().from(contas)
      .where(and(eq(contas.id, contaId), eq(contas.userId, userId))).limit(1);
    if (!conta) return erro("Conta do aporte não encontrada", 404);

    const valor = Number(aporte.valor);
    const nome = aplicacao.descricao || nomePadraoAplicacao(aplicacao);

    if (descontado) {
      if (!aporte.historico) return erro("Este aporte já foi descontado da conta");
      if (!conta.ativo) return erro("Conta inativa");

      // O primeiro aporte é a própria aplicação: mesmo texto do extrato da criação
      const [primeiro] = await db.select({ id: aportesAplicacao.id }).from(aportesAplicacao)
        .where(eq(aportesAplicacao.aplicacaoId, aplicacao.id))
        .orderBy(asc(aportesAplicacao.data), asc(aportesAplicacao.createdAt)).limit(1);

      await db.transaction(async (tx) => {
        await movimentarConta(tx, {
          userId,
          contaId: conta.id,
          tipo: "saida",
          valor,
          data: aporte.data,
          descricao: `${primeiro?.id === aporte.id ? "Aplicação" : "Aporte"} — ${nome}`,
          origem: "APLICACAO",
          referenciaId: aplicacao.id,
          mensagemSaldoInsuficiente: "Saldo insuficiente na conta para descontar esse aporte",
        });
        await tx.update(aportesAplicacao)
          .set({ historico: false, contaId: conta.id })
          .where(eq(aportesAplicacao.id, aporte.id));
      });
    } else {
      if (aporte.historico) return erro("Este aporte não foi descontado da conta");

      await db.transaction(async (tx) => {
        await desfazerLancamentoAporte(tx, { userId, aplicacaoId: aplicacao.id, contaId: conta.id, data: aporte.data, valor });
        await tx.update(aportesAplicacao)
          .set({ historico: true })
          .where(eq(aportesAplicacao.id, aporte.id));
      });
    }

    return NextResponse.json({ ok: true, descontado });
  } catch (error) {
    return respostaDeErro(error, "Erro ao alterar o desconto do aporte");
  }
}

/**
 * Edita valor, data e conta de um aporte. Se ele saiu da conta, o lançamento
 * antigo é desfeito e o novo é feito com os dados novos (mesmo texto), tudo na
 * mesma transação e conferindo o saldo; se era histórico, continua histórico.
 * Recusa se houver resgate na data antiga ou nova do aporte, ou depois.
 */
export async function PUT(req: NextRequest, context: Contexto) {
  try {
    const userId = await getUserId();
    if (!userId) return erro("Não autenticado", 401);

    const { id, aporteId } = await context.params;
    const corpo: Partial<Record<"valor" | "data" | "contaId", unknown>> = await req.json();

    const r = await carregar(userId, id, aporteId);
    if ("resposta" in r) return r.resposta;
    const { aplicacao, aporte } = r;
    if (aplicacao.resgatada) return erro("Esta aplicação já foi resgatada");

    const valor = Number(corpo.valor);
    if (isNaN(valor) || valor <= 0) return erro("Valor inválido");

    const data = typeof corpo.data === "string" ? corpo.data : "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || isNaN(new Date(data).getTime())) return erro("Data inválida");
    if (data > hojeBrt()) return erro("A data do aporte não pode ser futura");
    if (aplicacao.dataVencimento && data >= new Date(aplicacao.dataVencimento).toISOString().slice(0, 10))
      return erro("A data do aporte deve ser anterior ao vencimento");

    const contaNovaId = typeof corpo.contaId === "string" && corpo.contaId ? corpo.contaId : aporte.contaId ?? aplicacao.contaId;
    const [contaNova] = await db.select().from(contas)
      .where(and(eq(contas.id, contaNovaId), eq(contas.userId, userId))).limit(1);
    if (!contaNova) return erro("Conta não encontrada", 404);

    const desde = data < aporte.data ? data : aporte.data;
    if (await temResgateDesde(db, aplicacao.id, desde)) return erro(MSG_RESGATE);

    const valorAntigo = Number(aporte.valor);
    const contaAntigaId = aporte.contaId ?? aplicacao.contaId;
    const nome = aplicacao.descricao || nomePadraoAplicacao(aplicacao);

    await db.transaction(async (tx) => {
      if (!aporte.historico) {
        if (!contaNova.ativo) throw new ErroFinanceiro("Conta inativa");
        const descricao = await desfazerLancamentoAporte(tx, {
          userId, aplicacaoId: aplicacao.id, contaId: contaAntigaId, data: aporte.data, valor: valorAntigo,
        });
        await movimentarConta(tx, {
          userId,
          contaId: contaNova.id,
          tipo: "saida",
          valor,
          data,
          descricao: descricao ?? `Aporte — ${nome}`,
          origem: "APLICACAO",
          referenciaId: aplicacao.id,
          mensagemSaldoInsuficiente: "Saldo insuficiente na conta para esse aporte",
        });
      }
      await tx.update(aportesAplicacao)
        .set({
          valor: valor.toFixed(2),
          data,
          contaId: contaNova.id,
          // o recálculo logo abaixo refaz o estado do lote
          principalRestante: valor.toFixed(8),
          valorAtual: valor.toFixed(8),
        })
        .where(eq(aportesAplicacao.id, aporte.id));
    });

    await atualizarDataAplicacao(aplicacao.id);
    await recalcular(aplicacao.id);

    return NextResponse.json({ ok: true, descontado: !aporte.historico });
  } catch (error) {
    return respostaDeErro(error, "Erro ao editar o aporte");
  }
}

/**
 * Exclui um aporte. Se ele saiu da conta, o valor volta e o lançamento sai do
 * extrato. O único aporte não pode sair (o caminho é excluir a aplicação), e
 * aporte com resgate na data dele ou depois também não.
 */
export async function DELETE(_req: NextRequest, context: Contexto) {
  try {
    const userId = await getUserId();
    if (!userId) return erro("Não autenticado", 401);

    const { id, aporteId } = await context.params;
    const r = await carregar(userId, id, aporteId);
    if ("resposta" in r) return r.resposta;
    const { aplicacao, aporte } = r;
    if (aplicacao.resgatada) return erro("Esta aplicação já foi resgatada");

    const quantos = await db.$count(aportesAplicacao, eq(aportesAplicacao.aplicacaoId, aplicacao.id));
    if (quantos <= 1) return erro("É o único aporte: para desfazer, exclua a aplicação");
    if (await temResgateDesde(db, aplicacao.id, aporte.data)) return erro(MSG_RESGATE);

    await db.transaction(async (tx) => {
      if (!aporte.historico) {
        await desfazerLancamentoAporte(tx, {
          userId, aplicacaoId: aplicacao.id, contaId: aporte.contaId ?? aplicacao.contaId,
          data: aporte.data, valor: Number(aporte.valor),
        });
      }
      await tx.delete(aportesAplicacao).where(eq(aportesAplicacao.id, aporte.id));
    });

    await atualizarDataAplicacao(aplicacao.id);
    await recalcular(aplicacao.id);

    return NextResponse.json({ ok: true, devolvido: aporte.historico ? 0 : Number(aporte.valor) });
  } catch (error) {
    return respostaDeErro(error, "Erro ao excluir o aporte");
  }
}
