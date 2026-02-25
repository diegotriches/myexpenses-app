// app/api/transacoes/[id]/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { transacoes, contas, extratoConta, cartoes, faturas } from "@/db/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import { calcularFaturaDaTransacao } from "@/utils/faturaUtils";

// ============================================================
// HELPER: processa extrato + saldo para uma transação criada
// ============================================================
async function processarExtratoESaldo(
  transacao: typeof transacoes.$inferSelect,
  userId: string
) {
  const valorNum = Number(transacao.valor);

  if (transacao.cartaoId && transacao.formaPagamento === "cartao") {
    const [cartao] = await db.select().from(cartoes)
      .where(eq(cartoes.id, transacao.cartaoId)).limit(1);
    if (!cartao) return;

    if (cartao.tipo === "debito" && cartao.contaVinculadaId) {
      const [conta] = await db.select().from(contas)
        .where(eq(contas.id, cartao.contaVinculadaId)).limit(1);
      if (!conta) return;

      const novoSaldo = Number(conta.saldoAtual) - valorNum;
      await db.update(contas)
        .set({ saldoAtual: novoSaldo.toFixed(2), updatedAt: new Date() })
        .where(and(eq(contas.id, conta.id), eq(contas.userId, userId)));

      await db.insert(extratoConta).values({
        userId, contaId: conta.id,
        data: new Date(transacao.data).toISOString().split("T")[0],
        tipo: "saida", valor: valorNum.toFixed(2),
        descricao: transacao.descricao || `Compra no débito - ${cartao.nome}`,
        saldoApos: novoSaldo.toFixed(2),
        origem: "TRANSACAO_MANUAL", referenciaId: transacao.id,
      });

    } else if (cartao.tipo === "credito") {
      const { mes: mesFatura, ano: anoFatura } = calcularFaturaDaTransacao(
        new Date(transacao.data), cartao.diaFechamento || 1
      );

      const [faturaExistente] = await db.select().from(faturas)
        .where(and(
          eq(faturas.cartaoId, transacao.cartaoId),
          eq(faturas.userId, userId),
          eq(faturas.mes, mesFatura),
          eq(faturas.ano, anoFatura)
        )).limit(1);

      if (faturaExistente) {
        await db.update(faturas)
          .set({ total: (Number(faturaExistente.total) + valorNum).toFixed(2), updatedAt: new Date() })
          .where(eq(faturas.id, faturaExistente.id));
      } else {
        await db.insert(faturas).values({
          userId, cartaoId: transacao.cartaoId,
          mes: mesFatura, ano: anoFatura,
          total: valorNum.toFixed(2), paga: false,
        });
      }

      await db.update(cartoes)
        .set({ limiteDisponivel: sql`CAST(${cartoes.limiteDisponivel} AS NUMERIC) - ${valorNum}` })
        .where(and(eq(cartoes.id, transacao.cartaoId), eq(cartoes.userId, userId)));
    }

  } else if (transacao.contaId && transacao.formaPagamento !== "cartao") {
    const [conta] = await db.select().from(contas)
      .where(eq(contas.id, transacao.contaId)).limit(1);
    if (!conta) return;

    const saldoAtual = Number(conta.saldoAtual);
    const novoSaldo  = transacao.tipo === "entrada"
      ? saldoAtual + valorNum
      : saldoAtual - valorNum;

    await db.update(contas)
      .set({ saldoAtual: novoSaldo.toFixed(2), updatedAt: new Date() })
      .where(and(eq(contas.id, transacao.contaId), eq(contas.userId, userId)));

    await db.insert(extratoConta).values({
      userId, contaId: transacao.contaId,
      data: new Date(transacao.data).toISOString().split("T")[0],
      tipo: transacao.tipo === "entrada" ? "entrada" : "saida",
      valor: valorNum.toFixed(2),
      descricao: transacao.descricao || "Transação manual",
      saldoApos: novoSaldo.toFixed(2),
      origem: "TRANSACAO_MANUAL", referenciaId: transacao.id,
    });
  }
}

// ============================================================
// HELPER: reverte extrato + saldo de uma transação existente
// ============================================================
async function reverterExtratoESaldo(
  transacao: typeof transacoes.$inferSelect,
  userId: string
) {
  const valor = Number(transacao.valor);

  if (transacao.contaId && transacao.formaPagamento !== "cartao") {
    const [conta] = await db.select().from(contas)
      .where(eq(contas.id, transacao.contaId)).limit(1);

    if (conta) {
      const novoSaldo = transacao.tipo === "entrada"
        ? Number(conta.saldoAtual) - valor
        : Number(conta.saldoAtual) + valor;

      await db.update(contas)
        .set({ saldoAtual: novoSaldo.toFixed(2), updatedAt: new Date() })
        .where(and(eq(contas.id, transacao.contaId), eq(contas.userId, userId)));
    }
  }

  await db.delete(extratoConta)
    .where(and(eq(extratoConta.referenciaId, transacao.id), eq(extratoConta.userId, userId)));
}

// ============================================================
// HELPER: atualiza extrato de uma transação existente,
// tratando troca de conta corretamente
// ============================================================
async function atualizarExtratoESaldo(
  transacaoAntiga: typeof transacoes.$inferSelect,
  transacaoNova: typeof transacoes.$inferSelect,
  userId: string
) {
  const contaAntiga = transacaoAntiga.contaId;
  const contaNova   = transacaoNova.contaId;
  const formaNova   = transacaoNova.formaPagamento;

  // Se a nova forma de pagamento é cartão, apenas remove extrato/saldo antigos
  if (formaNova === "cartao") {
    if (contaAntiga && transacaoAntiga.formaPagamento !== "cartao") {
      await reverterExtratoESaldo(transacaoAntiga, userId);
    }
    return;
  }

  // Sem conta nova — remove extrato/saldo antigos se havia
  if (!contaNova) {
    if (contaAntiga && transacaoAntiga.formaPagamento !== "cartao") {
      await reverterExtratoESaldo(transacaoAntiga, userId);
    }
    return;
  }

  const contaMudou = contaAntiga !== contaNova;

  if (contaMudou) {
    // ── Reverte conta antiga ──────────────────────────────────────────
    if (contaAntiga && transacaoAntiga.formaPagamento !== "cartao") {
      await reverterExtratoESaldo(transacaoAntiga, userId);
    }
    // ── Aplica na conta nova ──────────────────────────────────────────
    await processarExtratoESaldo(transacaoNova, userId);
  } else {
    // ── Mesma conta: atualiza valor e descrição no extrato existente ──
    const valorNovo  = Number(transacaoNova.valor);
    const valorAntigo = Number(transacaoAntiga.valor);

    try {
      const [extratoExistente] = await db.select().from(extratoConta)
        .where(and(
          eq(extratoConta.referenciaId, transacaoAntiga.id),
          eq(extratoConta.userId, userId)
        )).limit(1);

      if (extratoExistente) {
        let novoSaldoApos = Number(extratoExistente.saldoApos);

        if (valorAntigo !== valorNovo) {
          novoSaldoApos = novoSaldoApos + (valorNovo - valorAntigo);
          await db.update(contas)
            .set({ saldoAtual: novoSaldoApos.toFixed(2), updatedAt: new Date() })
            .where(and(eq(contas.id, contaNova), eq(contas.userId, userId)));
        }

        await db.update(extratoConta)
          .set({
            data: new Date(transacaoNova.data).toISOString().split("T")[0],
            tipo: transacaoNova.tipo === "entrada" ? "entrada" : "saida",
            valor: Math.abs(valorNovo).toFixed(2),
            descricao: transacaoNova.descricao || extratoExistente.descricao,
            saldoApos: novoSaldoApos.toFixed(2),
          })
          .where(and(eq(extratoConta.id, extratoExistente.id), eq(extratoConta.userId, userId)));
      } else {
        // Não havia extrato — cria do zero
        await processarExtratoESaldo(transacaoNova, userId);
      }
    } catch (e) {
      console.error("⚠️ Erro ao atualizar extrato:", e);
    }
  }
}

// PUT - Atualizar transação
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { id } = await params;
    if (!id) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

    const json = await req.json();
    const { modoEdicao } = json;

    // ============================================
    // EDIÇÃO DE UMA ÚNICA TRANSAÇÃO
    // ============================================
    if (modoEdicao === "unica") {
      const [transacaoExistente] = await db.select().from(transacoes)
        .where(and(eq(transacoes.id, id), eq(transacoes.userId, userId)))
        .limit(1);

      if (!transacaoExistente) {
        return NextResponse.json({ error: "Transação não encontrada" }, { status: 404 });
      }

      const dataParaAtualizar = json.data
        ? (typeof json.data === "string" ? new Date(json.data) : json.data)
        : new Date(transacaoExistente.data);

      const isParcelado   = json.parcelado  === true;
      const isRecorrente  = json.recorrente === true;
      const eraParcelado  = transacaoExistente.parcelado  === true;
      const eraRecorrente = transacaoExistente.recorrente === true;

      // ── Convertendo à vista → parcelado ──────────────────────────────
      if (isParcelado && !eraParcelado) {
        const totalParcelas  = json.parcelas as number;
        const valorParcela   = Number(json.valor) / totalParcelas;
        const parcelamentoId = crypto.randomUUID();

        const [parcela1] = await db.update(transacoes)
          .set({
            tipo: json.tipo, descricao: json.descricao,
            valor: valorParcela.toFixed(2), data: dataParaAtualizar,
            categoria: json.categoria,
            contaId: json.formaPagamento === "cartao" ? null : (json.contaId || null),
            formaPagamento: json.formaPagamento,
            cartaoId: json.formaPagamento === "cartao" ? json.cartaoId : null,
            parcelado: true, parcelas: totalParcelas, parcelaAtual: 1, parcelamentoId,
            recorrente: false, recorrenciaId: null, repeticoes: null,
            updatedAt: new Date(),
          })
          .where(and(eq(transacoes.id, id), eq(transacoes.userId, userId)))
          .returning();

        const parcelasParaCriar = [];
        for (let i = 2; i <= totalParcelas; i++) {
          const dataParcela = new Date(dataParaAtualizar);
          dataParcela.setMonth(dataParcela.getMonth() + (i - 1));
          parcelasParaCriar.push({
            userId, tipo: json.tipo as string, descricao: json.descricao as string | null,
            valor: valorParcela.toFixed(2), data: dataParcela,
            categoria: json.categoria as string | null,
            contaId: json.formaPagamento === "cartao" ? null : (json.contaId || null),
            formaPagamento: json.formaPagamento as string,
            cartaoId: json.formaPagamento === "cartao" ? json.cartaoId : null,
            parcelado: true, parcelas: totalParcelas, parcelaAtual: i, parcelamentoId,
            recorrente: false, recorrenciaId: null, repeticoes: null,
          });
        }

        const novasParcelas = await db.insert(transacoes).values(parcelasParaCriar).returning();
        return NextResponse.json({ parcela1, novasParcelas, parcelamentoId, totalParcelas });
      }

      // ── Convertendo à vista → recorrente ─────────────────────────────
      if (isRecorrente && !eraRecorrente) {
        const totalRepeticoes = json.repeticoes as number;
        const recorrenciaId   = crypto.randomUUID();

        const [repeticao1] = await db.update(transacoes)
          .set({
            tipo: json.tipo, descricao: json.descricao,
            valor: String(json.valor), data: dataParaAtualizar,
            categoria: json.categoria, contaId: json.contaId || null,
            formaPagamento: json.formaPagamento,
            cartaoId: json.formaPagamento === "cartao" ? json.cartaoId : null,
            recorrente: true, recorrenciaId, repeticoes: totalRepeticoes,
            parcelado: false, parcelamentoId: null, parcelas: null, parcelaAtual: null,
            updatedAt: new Date(),
          })
          .where(and(eq(transacoes.id, id), eq(transacoes.userId, userId)))
          .returning();

        const repeticoesParaCriar = [];
        for (let i = 2; i <= totalRepeticoes; i++) {
          const dataRepeticao = new Date(dataParaAtualizar);
          dataRepeticao.setMonth(dataRepeticao.getMonth() + (i - 1));
          repeticoesParaCriar.push({
            userId, tipo: json.tipo as string, descricao: json.descricao as string | null,
            valor: String(json.valor), data: dataRepeticao,
            categoria: json.categoria as string | null, contaId: json.contaId as string | null,
            formaPagamento: json.formaPagamento as string,
            cartaoId: json.formaPagamento === "cartao" ? json.cartaoId : null,
            recorrente: true, recorrenciaId, repeticoes: totalRepeticoes,
            parcelado: false, parcelamentoId: null, parcelas: null, parcelaAtual: null,
          });
        }

        const novasRepeticoes = await db.insert(transacoes).values(repeticoesParaCriar).returning();
        return NextResponse.json({ repeticao1, novasRepeticoes, recorrenciaId, totalRepeticoes });
      }

      // ── Editar única ocorrência de uma recorrência ────────────────────
      if (eraRecorrente && !isRecorrente) {
        await reverterExtratoESaldo(transacaoExistente, userId);

        await db.delete(transacoes)
          .where(and(eq(transacoes.id, id), eq(transacoes.userId, userId)));

        const [novaTransacao] = await db.insert(transacoes)
          .values({
            userId,
            tipo:           json.tipo          as string,
            descricao:      json.descricao      as string | null,
            valor:          String(json.valor),
            data:           dataParaAtualizar,
            categoria:      json.categoria      as string | null,
            contaId:        json.formaPagamento === "cartao" ? null : (json.contaId || null),
            formaPagamento: json.formaPagamento as string,
            cartaoId:       json.formaPagamento === "cartao" ? json.cartaoId : null,
            recorrente: false, recorrenciaId: null, repeticoes: null,
            parcelado:  false, parcelamentoId: null, parcelas: null, parcelaAtual: null,
          })
          .returning();

        await processarExtratoESaldo(novaTransacao, userId);
        return NextResponse.json({ novaTransacao, ocorrenciaOriginalId: id });
      }

      // ── Caso padrão: edição simples ───────────────────────────────────
      const parcelamentoId = isParcelado
        ? (transacaoExistente.parcelamentoId || crypto.randomUUID()) : null;
      const recorrenciaId = isRecorrente
        ? (transacaoExistente.recorrenciaId  || crypto.randomUUID()) : null;

      const [updated] = await db.update(transacoes)
        .set({
          tipo: json.tipo, descricao: json.descricao,
          valor: String(json.valor), data: dataParaAtualizar,
          categoria: json.categoria,
          contaId: json.formaPagamento === "cartao" ? null : (json.contaId || null),
          formaPagamento: json.formaPagamento,
          cartaoId: json.formaPagamento === "cartao" ? json.cartaoId : null,
          parcelado: isParcelado,
          parcelas: isParcelado ? (json.parcelas ?? null) : null,
          parcelaAtual: isParcelado ? (transacaoExistente.parcelaAtual ?? 1) : null,
          parcelamentoId,
          recorrente: isRecorrente,
          repeticoes: isRecorrente ? (json.repeticoes ?? null) : null,
          recorrenciaId,
          updatedAt: new Date(),
        })
        .where(and(eq(transacoes.id, id), eq(transacoes.userId, userId)))
        .returning();

      // ✅ Usa helper que trata troca de conta corretamente
      await atualizarExtratoESaldo(transacaoExistente, updated, userId);

      return NextResponse.json(updated);
    }

    // ============================================
    // EDIÇÃO DE TODAS AS PARCELAS
    // ============================================
    if (modoEdicao === "todas_parcelas") {
      if (!json.parcelamentoId) {
        return NextResponse.json({ error: "parcelamentoId é obrigatório" }, { status: 400 });
      }

      const transacoesParceladas = await db.select().from(transacoes)
        .where(and(eq(transacoes.parcelamentoId, json.parcelamentoId), eq(transacoes.userId, userId)))
        .orderBy(transacoes.parcelaAtual);

      if (!transacoesParceladas.length) {
        return NextResponse.json({ error: "Parcelamento não encontrado" }, { status: 404 });
      }

      const totalParcelasAtuais = transacoesParceladas.length;
      const totalParcelasNovo   = json.parcelas ? Number(json.parcelas) : totalParcelasAtuais;
      const valorParcela        = Number(json.valor) / totalParcelasNovo;
      const quantidadeManter    = Math.min(totalParcelasAtuais, totalParcelasNovo);
      const atualizadas         = [];

      for (let i = 0; i < quantidadeManter; i++) {
        const t = transacoesParceladas[i];

        const [updated] = await db.update(transacoes)
          .set({
            tipo: json.tipo, descricao: json.descricao,
            valor: valorParcela.toFixed(2), categoria: json.categoria,
            contaId: json.formaPagamento === "cartao" ? null : (json.contaId || null),
            formaPagamento: json.formaPagamento,
            cartaoId: json.formaPagamento === "cartao" ? json.cartaoId : null,
            parcelado: true, parcelas: totalParcelasNovo,
            parcelaAtual: t.parcelaAtual, parcelamentoId: json.parcelamentoId,
            updatedAt: new Date(),
          })
          .where(and(eq(transacoes.id, t.id), eq(transacoes.userId, userId)))
          .returning();

        if (updated) {
          atualizadas.push(updated);
          // ✅ Usa helper que trata troca de conta corretamente
          await atualizarExtratoESaldo(t, updated, userId);
        }
      }

      // ── Deleta excedentes (reduziu parcelas) ──────────────────────────
      let deletadas = 0;
      if (totalParcelasNovo < totalParcelasAtuais) {
        const excedentes    = transacoesParceladas.slice(totalParcelasNovo);
        const idsExcedentes = excedentes.map(t => t.id);
        for (const t of excedentes) await reverterExtratoESaldo(t, userId);
        await db.delete(transacoes)
          .where(and(inArray(transacoes.id, idsExcedentes), eq(transacoes.userId, userId)));
        deletadas = idsExcedentes.length;
      }

      // ── Cria novas parcelas (aumentou parcelas) ───────────────────────
      let criadas: (typeof transacoes.$inferSelect)[] = [];
      if (totalParcelasNovo > totalParcelasAtuais) {
        const ultimaParcela = transacoesParceladas[transacoesParceladas.length - 1];
        const dataBase      = new Date(ultimaParcela.data);
        const novasData     = [];

        for (let i = totalParcelasAtuais + 1; i <= totalParcelasNovo; i++) {
          const dataNova = new Date(dataBase);
          dataNova.setMonth(dataBase.getMonth() + (i - totalParcelasAtuais));
          novasData.push({
            userId, tipo: json.tipo as string, descricao: json.descricao as string | null,
            valor: valorParcela.toFixed(2), data: dataNova,
            categoria: json.categoria as string | null,
            contaId: json.formaPagamento === "cartao" ? null : (json.contaId || null),
            formaPagamento: json.formaPagamento as string,
            cartaoId: json.formaPagamento === "cartao" ? json.cartaoId : null,
            parcelado: true, parcelas: totalParcelasNovo,
            parcelaAtual: i, parcelamentoId: json.parcelamentoId,
          });
        }

        criadas = await db.insert(transacoes).values(novasData).returning();
        for (const nova of criadas) await processarExtratoESaldo(nova, userId);
      }

      return NextResponse.json({ atualizadas, deletadas, criadas });
    }

    // ============================================
    // EDIÇÃO DE TODA A RECORRÊNCIA
    // ============================================
    if (modoEdicao === "toda_recorrencia") {
      if (!json.recorrenciaId) {
        return NextResponse.json({ error: "recorrenciaId é obrigatório" }, { status: 400 });
      }

      const transacoesRecorrentes = await db.select().from(transacoes)
        .where(and(eq(transacoes.recorrenciaId, json.recorrenciaId), eq(transacoes.userId, userId)))
        .orderBy(transacoes.data);

      if (!transacoesRecorrentes.length) {
        return NextResponse.json({ error: "Recorrência não encontrada" }, { status: 404 });
      }

      const totalRepeticoesAtuais = transacoesRecorrentes.length;
      const totalRepeticoesNovo   = json.repeticoes ? Number(json.repeticoes) : totalRepeticoesAtuais;
      const quantidadeManter      = Math.min(totalRepeticoesAtuais, totalRepeticoesNovo);
      const atualizadas           = [];

      for (let i = 0; i < quantidadeManter; i++) {
        const t = transacoesRecorrentes[i];

        const [updated] = await db.update(transacoes)
          .set({
            tipo: json.tipo, descricao: json.descricao,
            valor: String(json.valor), categoria: json.categoria,
            contaId: json.formaPagamento === "cartao" ? null : (json.contaId || null),
            formaPagamento: json.formaPagamento,
            cartaoId: json.formaPagamento === "cartao" ? json.cartaoId : null,
            recorrente: true, recorrenciaId: json.recorrenciaId,
            repeticoes: totalRepeticoesNovo,
            updatedAt: new Date(),
          })
          .where(and(eq(transacoes.id, t.id), eq(transacoes.userId, userId)))
          .returning();

        if (updated) {
          atualizadas.push(updated);
          // ✅ Usa helper que trata troca de conta corretamente
          await atualizarExtratoESaldo(t, updated, userId);
        }
      }

      // ── Deleta excedentes (reduziu meses) ─────────────────────────────
      let deletadas = 0;
      if (totalRepeticoesNovo < totalRepeticoesAtuais) {
        const excedentes    = transacoesRecorrentes.slice(totalRepeticoesNovo);
        const idsExcedentes = excedentes.map(t => t.id);
        for (const t of excedentes) await reverterExtratoESaldo(t, userId);
        await db.delete(transacoes)
          .where(and(inArray(transacoes.id, idsExcedentes), eq(transacoes.userId, userId)));
        deletadas = idsExcedentes.length;
      }

      // ── Cria novas repetições (aumentou meses) ────────────────────────
      let criadas: (typeof transacoes.$inferSelect)[] = [];
      if (totalRepeticoesNovo > totalRepeticoesAtuais) {
        const ultimaRepeticao = transacoesRecorrentes[transacoesRecorrentes.length - 1];
        const dataBase        = new Date(ultimaRepeticao.data);
        const novasData       = [];

        for (let i = totalRepeticoesAtuais + 1; i <= totalRepeticoesNovo; i++) {
          const dataNova = new Date(dataBase);
          dataNova.setMonth(dataBase.getMonth() + (i - totalRepeticoesAtuais));
          novasData.push({
            userId,
            tipo:           json.tipo          as string,
            descricao:      json.descricao     as string | null,
            valor:          String(json.valor),
            data:           dataNova,
            categoria:      json.categoria     as string | null,
            contaId:        json.formaPagamento === "cartao" ? null : (json.contaId || null),
            formaPagamento: json.formaPagamento as string,
            cartaoId:       json.formaPagamento === "cartao" ? json.cartaoId : null,
            recorrente: true, recorrenciaId: json.recorrenciaId,
            repeticoes: totalRepeticoesNovo,
            parcelado: false, parcelamentoId: null, parcelas: null, parcelaAtual: null,
          });
        }

        criadas = await db.insert(transacoes).values(novasData).returning();
        for (const nova of criadas) await processarExtratoESaldo(nova, userId);
      }

      return NextResponse.json({ atualizadas, deletadas, criadas });
    }

    return NextResponse.json({ error: "Modo de edição inválido" }, { status: 400 });

  } catch (error: any) {
    console.error("Erro ao atualizar transação:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao atualizar transação" },
      { status: 500 }
    );
  }
}

// DELETE - Deletar transação
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { id } = await params;
    if (!id) return NextResponse.json({ error: "ID inválido." }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const tipo = searchParams.get("tipo");
    const tiposPermitidos = ["unica", "todas_parcelas", "toda_recorrencia"];

    if (tipo && !tiposPermitidos.includes(tipo)) {
      return NextResponse.json({ error: "Tipo inválido." }, { status: 400 });
    }

    const [mov] = await db.select().from(transacoes)
      .where(and(eq(transacoes.id, id), eq(transacoes.userId, userId)))
      .limit(1);

    if (!mov) {
      return NextResponse.json({ error: "Transação não encontrada" }, { status: 404 });
    }

    if (mov.transferenciaId) {
      return NextResponse.json(
        { error: "Esta transação faz parte de uma transferência. Use exclusão de transferências." },
        { status: 400 }
      );
    }

    let transacoesParaDeletar: typeof mov[] = [];

    if (!tipo || tipo === "unica") {
      transacoesParaDeletar = [mov];
    } else if (tipo === "todas_parcelas" && mov.parcelamentoId) {
      transacoesParaDeletar = await db.select().from(transacoes)
        .where(and(eq(transacoes.parcelamentoId, mov.parcelamentoId), eq(transacoes.userId, userId)));
    } else if (tipo === "toda_recorrencia" && mov.recorrenciaId) {
      transacoesParaDeletar = await db.select().from(transacoes)
        .where(and(eq(transacoes.recorrenciaId, mov.recorrenciaId), eq(transacoes.userId, userId)));
    }

    for (const transacao of transacoesParaDeletar) {
      const valor = Number(transacao.valor);

      if (transacao.contaId && transacao.formaPagamento !== "cartao") {
        const [conta] = await db.select().from(contas)
          .where(eq(contas.id, transacao.contaId)).limit(1);

        if (conta) {
          const novoSaldo = transacao.tipo === "entrada"
            ? Number(conta.saldoAtual) - valor
            : Number(conta.saldoAtual) + valor;

          await db.update(contas)
            .set({ saldoAtual: novoSaldo.toFixed(2), updatedAt: new Date() })
            .where(and(eq(contas.id, transacao.contaId), eq(contas.userId, userId)));
        }
      }

      await db.delete(extratoConta)
        .where(and(eq(extratoConta.referenciaId, transacao.id), eq(extratoConta.userId, userId)));

      if (transacao.cartaoId && transacao.formaPagamento === "cartao") {
        const [cartao] = await db.select().from(cartoes)
          .where(eq(cartoes.id, transacao.cartaoId)).limit(1);

        if (cartao) {
          if (cartao.tipo === "debito" && cartao.contaVinculadaId) {
            const [conta] = await db.select().from(contas)
              .where(eq(contas.id, cartao.contaVinculadaId)).limit(1);

            if (conta) {
              await db.update(contas)
                .set({ saldoAtual: (Number(conta.saldoAtual) + valor).toFixed(2), updatedAt: new Date() })
                .where(and(eq(contas.id, conta.id), eq(contas.userId, userId)));
            }
          } else if (cartao.tipo === "credito") {
            const { mes: mesFatura, ano: anoFatura } = calcularFaturaDaTransacao(
              new Date(transacao.data), cartao.diaFechamento || 1
            );

            const [fatura] = await db.select().from(faturas)
              .where(and(
                eq(faturas.cartaoId, transacao.cartaoId),
                eq(faturas.userId, userId),
                eq(faturas.mes, mesFatura),
                eq(faturas.ano, anoFatura)
              )).limit(1);

            if (fatura) {
              const novoTotal = Number(fatura.total) - valor;
              if (novoTotal <= 0) {
                await db.delete(faturas).where(eq(faturas.id, fatura.id));
              } else {
                await db.update(faturas)
                  .set({ total: novoTotal.toFixed(2), updatedAt: new Date() })
                  .where(eq(faturas.id, fatura.id));
              }
            }

            await db.update(cartoes)
              .set({ limiteDisponivel: sql`CAST(${cartoes.limiteDisponivel} AS NUMERIC) + ${valor}` })
              .where(and(eq(cartoes.id, transacao.cartaoId), eq(cartoes.userId, userId)));
          }
        }
      }
    }

    const idsParaDeletar = transacoesParaDeletar.map(t => t.id);

    if (idsParaDeletar.length === 1) {
      await db.delete(transacoes)
        .where(and(eq(transacoes.id, idsParaDeletar[0]), eq(transacoes.userId, userId)));
    } else if (idsParaDeletar.length > 1) {
      await db.delete(transacoes)
        .where(and(inArray(transacoes.id, idsParaDeletar), eq(transacoes.userId, userId)));
    }

    return NextResponse.json({ sucesso: true, deletadas: transacoesParaDeletar.length });

  } catch (err: any) {
    console.error("❌ Erro ao deletar transação:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro desconhecido" },
      { status: 500 }
    );
  }
}