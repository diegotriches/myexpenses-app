import { NextResponse } from "next/server";
import { db } from "@/db";
import { transacoes, contas, extratoConta, cartoes, faturas } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getUserIdFromSession } from "@/lib/auth/helpers";

// PUT - Atualizar transação
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 🔐 Autenticação
    const userId = await getUserIdFromSession();
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const json = await req.json();
    const { modoEdicao } = json;

    // EDIÇÃO DE UMA ÚNICA TRANSAÇÃO
    if (modoEdicao === "unica") {
      // 🔐 Verificar ownership antes de atualizar
      const [transacaoExistente] = await db
        .select()
        .from(transacoes)
        .where(
          and(
            eq(transacoes.id, id),
            eq(transacoes.userId, userId)
          )
        )
        .limit(1);

      if (!transacaoExistente) {
        return NextResponse.json(
          { error: "Transação não encontrada ou acesso negado" },
          { status: 404 }
        );
      }

      // Atualizar
      const [updated] = await db
        .update(transacoes)
        .set({
          tipo: json.tipo,
          descricao: json.descricao,
          valor: String(json.valor),
          data: json.data,
          categoria: json.categoria,
          contaId: json.contaId,
          formaPagamento: json.formaPagamento,
          cartaoId: json.formaPagamento === "cartao" ? json.cartaoId : null,
        })
        .where(
          and(
            eq(transacoes.id, id),
            eq(transacoes.userId, userId) // 🔐 Garantir ownership
          )
        )
        .returning();

      return NextResponse.json(updated);
    }

    // EDIÇÃO DE TODAS AS PARCELAS
    if (modoEdicao === "todas_parcelas") {
      if (!json.parcelamentoId) {
        return NextResponse.json(
          { error: "parcelamentoId é obrigatório" },
          { status: 400 }
        );
      }

      // 🔐 Buscar parcelas do usuário
      const transacoesParceladas = await db
        .select()
        .from(transacoes)
        .where(
          and(
            eq(transacoes.parcelamentoId, json.parcelamentoId),
            eq(transacoes.userId, userId) // 🔐 Filtrar por userId
          )
        );

      if (!transacoesParceladas.length) {
        return NextResponse.json(
          { error: "Parcelamento não encontrado" },
          { status: 404 }
        );
      }

      const valorParcela = Number(json.valor) / json.parcelas;

      const atualizadas = [];

      for (const t of transacoesParceladas) {
        const [updated] = await db
          .update(transacoes)
          .set({
            tipo: json.tipo,
            descricao: json.descricao,
            valor: String(valorParcela),
            categoria: json.categoria,
            contaId: json.contaId,
            formaPagamento: json.formaPagamento,
            cartaoId:
              json.formaPagamento === "cartao" ? json.cartaoId : null,

            parcelado: true,
            parcelas: json.parcelas,
            parcelaAtual: t.parcelaAtual,
            parcelamentoId: json.parcelamentoId,
          })
          .where(
            and(
              eq(transacoes.id, t.id),
              eq(transacoes.userId, userId) // 🔐 Garantir ownership
            )
          )
          .returning();

        if (updated) atualizadas.push(updated);
      }

      return NextResponse.json(atualizadas);
    }

    // FALLBACK
    return NextResponse.json(
      { error: "Modo de edição inválido" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Erro ao atualizar transação:", error);

    if (error instanceof Error && error.message === "Não autenticado") {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: error.message ?? "Erro ao atualizar transação" },
      { status: 500 }
    );
  }
}

// DELETE - Deletar transação (com remoção de extrato e ajuste de saldo)
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 🔐 Autenticação
    const userId = await getUserIdFromSession();
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "ID inválido." }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const tipo = searchParams.get("tipo");
    const tiposPermitidos = ["unica", "todas_parcelas", "toda_recorrencia"];

    if (tipo && !tiposPermitidos.includes(tipo)) {
      return NextResponse.json({ error: "Tipo inválido." }, { status: 400 });
    }

    // 🔐 Buscar transação e verificar ownership
    const [mov] = await db
      .select()
      .from(transacoes)
      .where(
        and(
          eq(transacoes.id, id),
          eq(transacoes.userId, userId) // 🔐 Verificar ownership
        )
      )
      .limit(1);

    if (!mov) {
      return NextResponse.json(
        { error: "Transação não encontrada ou acesso negado" },
        { status: 404 }
      );
    }

    // Bloqueio de transferência
    if (mov.transferenciaId) {
      return NextResponse.json(
        { error: "Esta transação faz parte de uma transferência. Use exclusão de transferências." },
        { status: 400 }
      );
    }

    // ===================================================================
    // DELETAR COM AJUSTE DE SALDO E REMOÇÃO DE EXTRATO
    // ===================================================================

    // Buscar transações a serem deletadas
    let transacoesParaDeletar: typeof mov[] = [];

    if (!tipo || tipo === "unica") {
      transacoesParaDeletar = [mov];
    } else if (tipo === "todas_parcelas" && mov.parcelamentoId) {
      transacoesParaDeletar = await db
        .select()
        .from(transacoes)
        .where(
          and(
            eq(transacoes.parcelamentoId, mov.parcelamentoId),
            eq(transacoes.userId, userId)
          )
        );
    } else if (tipo === "toda_recorrencia" && mov.recorrenciaId) {
      transacoesParaDeletar = await db
        .select()
        .from(transacoes)
        .where(
          and(
            eq(transacoes.recorrenciaId, mov.recorrenciaId),
            eq(transacoes.userId, userId)
          )
        );
    }

    // Processar cada transação
    for (const transacao of transacoesParaDeletar) {
      const valor = Number(transacao.valor);

      // 1. Reverter saldo da conta (se não for cartão de crédito)
      if (transacao.contaId && transacao.formaPagamento !== "cartao") {
        const [conta] = await db
          .select()
          .from(contas)
          .where(eq(contas.id, transacao.contaId))
          .limit(1);

        if (conta) {
          const saldoAtual = Number(conta.saldoAtual);
          // Reverter: entrada vira saída, saída vira entrada
          const novoSaldo = transacao.tipo === "entrada"
            ? saldoAtual - valor
            : saldoAtual + valor;

          await db
            .update(contas)
            .set({
              saldoAtual: novoSaldo.toString(),
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(contas.id, transacao.contaId),
                eq(contas.userId, userId)
              )
            );
        }
      }

      // 2. Remover do extrato (se existir)
      await db
        .delete(extratoConta)
        .where(
          and(
            eq(extratoConta.referenciaId, transacao.id),
            eq(extratoConta.userId, userId)
          )
        );

      // 3. Reverter fatura se for cartão de crédito
      if (transacao.cartaoId && transacao.formaPagamento === "cartao") {
        const dataTransacao = new Date(transacao.data);
        const mes = dataTransacao.getMonth() + 1;
        const ano = dataTransacao.getFullYear();

        const [fatura] = await db
          .select()
          .from(faturas)
          .where(
            and(
              eq(faturas.cartaoId, transacao.cartaoId),
              eq(faturas.userId, userId),
              eq(faturas.mes, mes),
              eq(faturas.ano, ano)
            )
          )
          .limit(1);

        if (fatura) {
          const totalAtual = Number(fatura.total);
          const novoTotal = totalAtual - valor;

          if (novoTotal <= 0) {
            // Deletar fatura se ficar zerada
            await db
              .delete(faturas)
              .where(eq(faturas.id, fatura.id));
          } else {
            // Atualizar total da fatura
            await db
              .update(faturas)
              .set({
                total: novoTotal.toString(),
                updatedAt: new Date(),
              })
              .where(eq(faturas.id, fatura.id));
          }
        }

        // Reverter limite disponível do cartão
        const [cartao] = await db
          .select()
          .from(cartoes)
          .where(eq(cartoes.id, transacao.cartaoId))
          .limit(1);

        if (cartao) {
          const novoLimiteDisponivel = cartao.limiteDisponivel + valor;
          
          await db
            .update(cartoes)
            .set({
              limiteDisponivel: novoLimiteDisponivel,
            })
            .where(
              and(
                eq(cartoes.id, transacao.cartaoId),
                eq(cartoes.userId, userId)
              )
            );
        }
      }
    }

    // 4. Deletar as transações
    const idsParaDeletar = transacoesParaDeletar.map(t => t.id);

    await db
      .delete(transacoes)
      .where(
        and(
          eq(transacoes.userId, userId),
          // Deletar pelos IDs coletados
          tipo === "unica"
            ? eq(transacoes.id, id)
            : tipo === "todas_parcelas" && mov.parcelamentoId
              ? eq(transacoes.parcelamentoId, mov.parcelamentoId)
              : tipo === "toda_recorrencia" && mov.recorrenciaId
                ? eq(transacoes.recorrenciaId, mov.recorrenciaId)
                : eq(transacoes.id, id)
        )
      );

    return NextResponse.json({ 
      sucesso: true,
      deletadas: transacoesParaDeletar.length 
    });

  } catch (err: any) {
    console.error("Erro ao deletar transação:", err);

    if (err instanceof Error && err.message === "Não autenticado") {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro desconhecido" },
      { status: 500 }
    );
  }
}