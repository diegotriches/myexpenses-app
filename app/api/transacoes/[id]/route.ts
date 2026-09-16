// app/api/transacoes/[id]/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { transacoes, contas, extratoConta, cartoes, faturas, antecipacoesParcela } from "@/db/schema";
import { or, eq, and, sql, inArray } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import { calcularFaturaDaTransacao, faturaEstaFechada } from "@/utils/faturaUtils";

// ── helpers financeiros ────────────────────────────────────────

async function transacaoEstaEmFaturaPaga(
  userId: string,
  transacao: { formaPagamento: string | null; cartaoId: number | null; data: string | Date }
): Promise<boolean> {
  if (transacao.formaPagamento !== "cartao" || !transacao.cartaoId) return false;

  const [cartao] = await db.select().from(cartoes)
    .where(and(eq(cartoes.id, transacao.cartaoId), eq(cartoes.userId, userId))).limit(1);
  if (!cartao || cartao.tipo !== "credito") return false;

  const diaFechamento = cartao.diaFechamento || 1;
  const { mes, ano } = calcularFaturaDaTransacao(new Date(transacao.data), diaFechamento);

  const [fatura] = await db.select({ paga: faturas.paga }).from(faturas)
    .where(and(eq(faturas.cartaoId, transacao.cartaoId), eq(faturas.userId, userId), eq(faturas.mes, mes), eq(faturas.ano, ano)))
    .limit(1);

  return fatura?.paga === true;
}

const MSG_BLOQUEIO_FATURA_PAGA = "Esta transação faz parte de uma fatura já paga. Não é possível excluí-la, para preservar o histórico.";

async function processarExtratoESaldo(transacao: typeof transacoes.$inferSelect, userId: string) {
  const valorNum = Number(transacao.valor);
  if (transacao.cartaoId && transacao.formaPagamento === "cartao") {
    const [cartao] = await db.select().from(cartoes).where(eq(cartoes.id, transacao.cartaoId)).limit(1);
    if (!cartao) return;
    if (cartao.tipo === "debito" && cartao.contaVinculadaId) {
      const [conta] = await db.select().from(contas).where(eq(contas.id, cartao.contaVinculadaId)).limit(1);
      if (!conta) return;
      const novoSaldo = Number(conta.saldoAtual) - valorNum;
      await db.update(contas).set({ saldoAtual: novoSaldo.toFixed(2), updatedAt: new Date() }).where(and(eq(contas.id, conta.id), eq(contas.userId, userId)));
      await db.insert(extratoConta).values({ userId, contaId: conta.id, data: new Date(transacao.data).toISOString().split("T")[0], tipo: "saida", valor: valorNum.toFixed(2), descricao: transacao.descricao || `Compra no débito - ${cartao.nome}`, saldoApos: novoSaldo.toFixed(2), origem: "TRANSACAO_MANUAL", referenciaId: transacao.id });
    } else if (cartao.tipo === "credito") {
      const { mes: mesFatura, ano: anoFatura } = calcularFaturaDaTransacao(new Date(transacao.data), cartao.diaFechamento || 1);
      const [faturaExistente] = await db.select().from(faturas).where(and(eq(faturas.cartaoId, transacao.cartaoId), eq(faturas.userId, userId), eq(faturas.mes, mesFatura), eq(faturas.ano, anoFatura))).limit(1);
      if (faturaExistente) { await db.update(faturas).set({ total: (Number(faturaExistente.total) + valorNum).toFixed(2), updatedAt: new Date() }).where(eq(faturas.id, faturaExistente.id)); }
      else { await db.insert(faturas).values({ userId, cartaoId: transacao.cartaoId, mes: mesFatura, ano: anoFatura, total: valorNum.toFixed(2), paga: false }); }
      await db.update(cartoes).set({ limiteDisponivel: sql`CAST(${cartoes.limiteDisponivel} AS NUMERIC) - ${valorNum}` }).where(and(eq(cartoes.id, transacao.cartaoId), eq(cartoes.userId, userId)));
    }
  } else if (transacao.contaId && transacao.formaPagamento !== "cartao") {
    const [conta] = await db.select().from(contas).where(eq(contas.id, transacao.contaId)).limit(1);
    if (!conta) return;
    const saldoAtual = Number(conta.saldoAtual);
    const novoSaldo  = transacao.tipo === "entrada" ? saldoAtual + valorNum : saldoAtual - valorNum;
    await db.update(contas).set({ saldoAtual: novoSaldo.toFixed(2), updatedAt: new Date() }).where(and(eq(contas.id, transacao.contaId), eq(contas.userId, userId)));
    await db.insert(extratoConta).values({ userId, contaId: transacao.contaId, data: new Date(transacao.data).toISOString().split("T")[0], tipo: transacao.tipo === "entrada" ? "entrada" : "saida", valor: valorNum.toFixed(2), descricao: transacao.descricao || "Transação manual", saldoApos: novoSaldo.toFixed(2), origem: "TRANSACAO_MANUAL", referenciaId: transacao.id });
  }
}

async function reverterExtratoESaldo(transacao: typeof transacoes.$inferSelect, userId: string) {
  const valor = Number(transacao.valor);
  if (transacao.contaId && transacao.formaPagamento !== "cartao") {
    const [conta] = await db.select().from(contas).where(eq(contas.id, transacao.contaId)).limit(1);
    if (conta) {
      const novoSaldo = transacao.tipo === "entrada" ? Number(conta.saldoAtual) - valor : Number(conta.saldoAtual) + valor;
      await db.update(contas).set({ saldoAtual: novoSaldo.toFixed(2), updatedAt: new Date() }).where(and(eq(contas.id, transacao.contaId), eq(contas.userId, userId)));
    }
  }
  await db.delete(extratoConta).where(and(eq(extratoConta.referenciaId, transacao.id), eq(extratoConta.userId, userId)));
}

async function atualizarExtratoESaldo(transacaoAntiga: typeof transacoes.$inferSelect, transacaoNova: typeof transacoes.$inferSelect, userId: string) {
  const contaAntiga = transacaoAntiga.contaId;
  const contaNova   = transacaoNova.contaId;
  const formaNova   = transacaoNova.formaPagamento;
  if (formaNova === "cartao") { if (contaAntiga && transacaoAntiga.formaPagamento !== "cartao") await reverterExtratoESaldo(transacaoAntiga, userId); return; }
  if (!contaNova) { if (contaAntiga && transacaoAntiga.formaPagamento !== "cartao") await reverterExtratoESaldo(transacaoAntiga, userId); return; }
  if (contaAntiga !== contaNova) {
    if (contaAntiga && transacaoAntiga.formaPagamento !== "cartao") await reverterExtratoESaldo(transacaoAntiga, userId);
    await processarExtratoESaldo(transacaoNova, userId);
  } else {
    const valorNovo   = Number(transacaoNova.valor);
    const valorAntigo = Number(transacaoAntiga.valor);
    try {
      const [extratoExistente] = await db.select().from(extratoConta).where(and(eq(extratoConta.referenciaId, transacaoAntiga.id), eq(extratoConta.userId, userId))).limit(1);
      if (extratoExistente) {
        const [conta] = await db.select().from(contas).where(and(eq(contas.id, contaNova), eq(contas.userId, userId))).limit(1);
        if (!conta) { await processarExtratoESaldo(transacaoNova, userId); return; }
        const impactoAntigo = transacaoAntiga.tipo === "entrada" ?  valorAntigo : -valorAntigo;
        const impactoNovo   = transacaoNova.tipo   === "entrada" ?  valorNovo   : -valorNovo;
        const novoSaldoAtual = Number(conta.saldoAtual) + (impactoNovo - impactoAntigo);
        await db.update(contas).set({ saldoAtual: novoSaldoAtual.toFixed(2), updatedAt: new Date() }).where(and(eq(contas.id, contaNova), eq(contas.userId, userId)));
        await db.update(extratoConta).set({ data: new Date(transacaoNova.data).toISOString().split("T")[0], tipo: transacaoNova.tipo === "entrada" ? "entrada" : "saida", valor: valorNovo.toFixed(2), descricao: transacaoNova.descricao || extratoExistente.descricao, saldoApos: novoSaldoAtual.toFixed(2) }).where(and(eq(extratoConta.id, extratoExistente.id), eq(extratoConta.userId, userId)));
      } else { await processarExtratoESaldo(transacaoNova, userId); }
    } catch (e) { console.error("⚠️ Erro ao atualizar extrato:", e); }
  }
}

async function buscarAntecipacaoBloqueante(
  userId: string,
  transacao: { id: string; parcelamentoId: string | null }
) {
  const condicoesOr = [eq(antecipacoesParcela.transacaoSinteticaId, transacao.id)];
  if (transacao.parcelamentoId) {
    condicoesOr.push(eq(antecipacoesParcela.parcelamentoId, transacao.parcelamentoId));
  }

  const candidatas = await db.select().from(antecipacoesParcela)
    .where(and(eq(antecipacoesParcela.userId, userId), or(...condicoesOr)));

  for (const a of candidatas) {
    const [fatura] = await db.select({ paga: faturas.paga }).from(faturas)
      .where(eq(faturas.id, a.faturaAtualId)).limit(1);
    if (fatura && !fatura.paga) return a; // bloqueado
  }
  return null;
}

const MSG_BLOQUEIO_EDITAR  = "Esta transação faz parte de uma antecipação pendente. Desfaça a antecipação na aba Parcelas antes de editar.";
const MSG_BLOQUEIO_EXCLUIR = "Esta transação faz parte de uma antecipação pendente. Desfaça a antecipação na aba Parcelas antes de excluir.";

// ── Adicionar ao import de "@/utils/faturaUtils": faturaEstaFechada
// (junto com calcularFaturaDaTransacao)
//
// ── Adicionar este helper no arquivo (mesmo formato do usado em
// app/api/transacoes/route.ts):

async function verificarFaturaAberta(
  userId: string,
  cartaoId: number,
  diaFechamento: number,
  dataTransacao: string | Date
): Promise<{ bloqueado: boolean; motivo?: string }> {
  const { mes, ano } = calcularFaturaDaTransacao(dataTransacao as string, diaFechamento);

  if (faturaEstaFechada(mes, ano, diaFechamento)) {
    return { bloqueado: true, motivo: `A fatura de ${String(mes).padStart(2, "0")}/${ano} já está fechada` };
  }

  const [faturaExistente] = await db.select({ paga: faturas.paga }).from(faturas)
    .where(and(eq(faturas.cartaoId, cartaoId), eq(faturas.userId, userId), eq(faturas.mes, mes), eq(faturas.ano, ano)))
    .limit(1);

  if (faturaExistente?.paga) {
    return { bloqueado: true, motivo: `A fatura de ${String(mes).padStart(2, "0")}/${ano} já está paga` };
  }

  return { bloqueado: false };
}

// ── PUT ───────────────────────────────────────────────────────────────────────

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { id } = await params;
    if (!id) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

    const json         = await req.json();
    const { modoEdicao } = json;

    const estabelecimentoId = json.estabelecimentoId ?? null;

    // ── ÚNICA ────────────────────────────────────────────────────────────────
    if (modoEdicao === "unica") {
      const [transacaoExistente] = await db.select().from(transacoes)
        .where(and(eq(transacoes.id, id), eq(transacoes.userId, userId))).limit(1);
      if (!transacaoExistente) return NextResponse.json({ error: "Transação não encontrada" }, { status: 404 });

      const bloqueioAntecipacao = await buscarAntecipacaoBloqueante(userId, transacaoExistente);
      if (bloqueioAntecipacao) return NextResponse.json({ error: MSG_BLOQUEIO_EDITAR }, { status: 400 });

      const dataParaAtualizar = json.data ? new Date(json.data) : new Date(transacaoExistente.data);
      const isParcelado   = json.parcelado  === true;
      const isRecorrente  = json.recorrente === true;
      const eraParcelado  = transacaoExistente.parcelado  === true;
      const eraRecorrente = transacaoExistente.recorrente === true;

      // ✅ NOVO: bloqueia se o resultado da edição é uma despesa no cartão
      // de crédito numa data cuja fatura já está fechada ou paga. Vale
      // pra edição simples e pra conversão à vista → parcelado (a primeira
      // parcela usa a mesma data escolhida no formulário).
      const vaiParaCartaoCredito = json.formaPagamento === "cartao" && json.tipo === "saida" && json.cartaoId;
      if (vaiParaCartaoCredito) {
        const [cartaoDestino] = await db.select().from(cartoes)
          .where(and(eq(cartoes.id, Number(json.cartaoId)), eq(cartoes.userId, userId))).limit(1);
        if (cartaoDestino && cartaoDestino.tipo === "credito") {
          const diaFechamento = cartaoDestino.diaFechamento || 1;
          const verificacao = await verificarFaturaAberta(userId, cartaoDestino.id, diaFechamento, dataParaAtualizar);
          if (verificacao.bloqueado) {
            return NextResponse.json(
              { error: `${verificacao.motivo}. Escolha uma data cuja fatura ainda esteja aberta.` },
              { status: 400 }
            );
          }
        }
      }

      if (isParcelado && !eraParcelado) {
        await reverterExtratoESaldo(transacaoExistente, userId);

        const totalParcelas  = json.parcelas as number;
        const valorParcela   = Number(json.valor) / totalParcelas;
        const parcelamentoId = crypto.randomUUID();
        const [parcela1] = await db.update(transacoes).set({ tipo: json.tipo, descricao: json.descricao, valor: valorParcela.toFixed(2), data: dataParaAtualizar, categoria: json.categoria, contaId: json.formaPagamento === "cartao" ? null : (json.contaId || null), formaPagamento: json.formaPagamento, cartaoId: json.formaPagamento === "cartao" ? json.cartaoId : null, estabelecimentoId, parcelado: true, parcelas: totalParcelas, parcelaAtual: 1, parcelamentoId, recorrente: false, recorrenciaId: null, repeticoes: null, updatedAt: new Date() }).where(and(eq(transacoes.id, id), eq(transacoes.userId, userId))).returning();
        const parcelasParaCriar = [];
        for (let i = 2; i <= totalParcelas; i++) {
          const dataParcela = new Date(dataParaAtualizar); dataParcela.setMonth(dataParcela.getMonth() + (i - 1));
          parcelasParaCriar.push({ userId, tipo: json.tipo as string, descricao: json.descricao as string | null, valor: valorParcela.toFixed(2), data: dataParcela, categoria: json.categoria as string | null, contaId: json.formaPagamento === "cartao" ? null : (json.contaId || null), formaPagamento: json.formaPagamento as string, cartaoId: json.formaPagamento === "cartao" ? json.cartaoId : null, estabelecimentoId, parcelado: true, parcelas: totalParcelas, parcelaAtual: i, parcelamentoId, recorrente: false, recorrenciaId: null, repeticoes: null });
        }
        const novasParcelas = await db.insert(transacoes).values(parcelasParaCriar).returning();
        return NextResponse.json({ parcela1, novasParcelas, parcelamentoId, totalParcelas });
      }

      if (isRecorrente && !eraRecorrente) {
        await reverterExtratoESaldo(transacaoExistente, userId);

        const totalRepeticoes = json.repeticoes as number;
        const recorrenciaId   = crypto.randomUUID();
        const [repeticao1] = await db.update(transacoes).set({ tipo: json.tipo, descricao: json.descricao, valor: String(json.valor), data: dataParaAtualizar, categoria: json.categoria, contaId: json.contaId || null, formaPagamento: json.formaPagamento, cartaoId: json.formaPagamento === "cartao" ? json.cartaoId : null, estabelecimentoId, recorrente: true, recorrenciaId, repeticoes: totalRepeticoes, parcelado: false, parcelamentoId: null, parcelas: null, parcelaAtual: null, updatedAt: new Date() }).where(and(eq(transacoes.id, id), eq(transacoes.userId, userId))).returning();
        const repeticoesParaCriar = [];
        for (let i = 2; i <= totalRepeticoes; i++) {
          const dataRepeticao = new Date(dataParaAtualizar); dataRepeticao.setMonth(dataRepeticao.getMonth() + (i - 1));
          repeticoesParaCriar.push({ userId, tipo: json.tipo as string, descricao: json.descricao as string | null, valor: String(json.valor), data: dataRepeticao, categoria: json.categoria as string | null, contaId: json.contaId as string | null, formaPagamento: json.formaPagamento as string, cartaoId: json.formaPagamento === "cartao" ? json.cartaoId : null, estabelecimentoId, recorrente: true, recorrenciaId, repeticoes: totalRepeticoes, parcelado: false, parcelamentoId: null, parcelas: null, parcelaAtual: null });
        }
        const novasRepeticoes = await db.insert(transacoes).values(repeticoesParaCriar).returning();
        return NextResponse.json({ repeticao1, novasRepeticoes, recorrenciaId, totalRepeticoes });
      }

      if (eraRecorrente && !isRecorrente) {
        await reverterExtratoESaldo(transacaoExistente, userId);
        await db.delete(transacoes).where(and(eq(transacoes.id, id), eq(transacoes.userId, userId)));
        const [novaTransacao] = await db.insert(transacoes).values({ userId, tipo: json.tipo as string, descricao: json.descricao as string | null, valor: String(json.valor), data: dataParaAtualizar, categoria: json.categoria as string | null, contaId: json.formaPagamento === "cartao" ? null : (json.contaId || null), formaPagamento: json.formaPagamento as string, cartaoId: json.formaPagamento === "cartao" ? json.cartaoId : null, estabelecimentoId, recorrente: false, recorrenciaId: null, repeticoes: null, parcelado: false, parcelamentoId: null, parcelas: null, parcelaAtual: null }).returning();
        await processarExtratoESaldo(novaTransacao, userId);
        return NextResponse.json({ novaTransacao, ocorrenciaOriginalId: id });
      }

      // edição simples
      const parcelamentoId = isParcelado  ? (transacaoExistente.parcelamentoId || crypto.randomUUID()) : null;
      const recorrenciaId  = isRecorrente ? (transacaoExistente.recorrenciaId  || crypto.randomUUID()) : null;
      const [updated] = await db.update(transacoes).set({ tipo: json.tipo, descricao: json.descricao, valor: String(json.valor), data: dataParaAtualizar, categoria: json.categoria, contaId: json.formaPagamento === "cartao" ? null : (json.contaId || null), formaPagamento: json.formaPagamento, cartaoId: json.formaPagamento === "cartao" ? json.cartaoId : null, estabelecimentoId, parcelado: isParcelado, parcelas: isParcelado ? (json.parcelas ?? null) : null, parcelaAtual: isParcelado ? (transacaoExistente.parcelaAtual ?? 1) : null, parcelamentoId, recorrente: isRecorrente, repeticoes: isRecorrente ? (json.repeticoes ?? null) : null, recorrenciaId, updatedAt: new Date() }).where(and(eq(transacoes.id, id), eq(transacoes.userId, userId))).returning();
      await atualizarExtratoESaldo(transacaoExistente, updated, userId);
      return NextResponse.json(updated);
    }

    // ── TODAS AS PARCELAS ────────────────────────────────────────────────────
    if (modoEdicao === "todas_parcelas") {
      if (!json.parcelamentoId) return NextResponse.json({ error: "parcelamentoId é obrigatório" }, { status: 400 });

      const bloqueioGrupo = await buscarAntecipacaoBloqueante(userId, { id: "", parcelamentoId: json.parcelamentoId });
      if (bloqueioGrupo) return NextResponse.json({ error: MSG_BLOQUEIO_EDITAR }, { status: 400 });

      const transacoesParceladas = await db.select().from(transacoes)
        .where(and(eq(transacoes.parcelamentoId, json.parcelamentoId), eq(transacoes.userId, userId)))
        .orderBy(transacoes.parcelaAtual);
      if (!transacoesParceladas.length) return NextResponse.json({ error: "Parcelamento não encontrado" }, { status: 404 });

      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const parcelasPassadas = transacoesParceladas.filter((t) => new Date(t.data) <= hoje);
      const parcelasFuturasAtuais = transacoesParceladas.filter((t) => new Date(t.data) > hoje);

      const totalParcelasAtuais = transacoesParceladas.length;
      const totalParcelasNovo   = json.parcelas ? Number(json.parcelas) : totalParcelasAtuais;

      if (totalParcelasNovo < parcelasPassadas.length) {
        return NextResponse.json(
          { error: `Não é possível reduzir para menos de ${parcelasPassadas.length} parcelas — esse é o número de parcelas já vencidas` },
          { status: 400 }
        );
      }

      const totalFuturasNovo = totalParcelasNovo - parcelasPassadas.length;
      const valorParcela     = Number(json.valor) / totalParcelasNovo;
      const quantidadeManterFuturas = Math.min(parcelasFuturasAtuais.length, totalFuturasNovo);

      const atualizadas = [];
      for (let i = 0; i < quantidadeManterFuturas; i++) {
        const t = parcelasFuturasAtuais[i];
        const [updated] = await db.update(transacoes).set({
          tipo: json.tipo, descricao: json.descricao, valor: valorParcela.toFixed(2),
          categoria: json.categoria,
          contaId: json.formaPagamento === "cartao" ? null : (json.contaId || null),
          formaPagamento: json.formaPagamento,
          cartaoId: json.formaPagamento === "cartao" ? json.cartaoId : null,
          estabelecimentoId, parcelado: true, parcelas: totalParcelasNovo,
          parcelaAtual: t.parcelaAtual, parcelamentoId: json.parcelamentoId,
          updatedAt: new Date(),
        }).where(and(eq(transacoes.id, t.id), eq(transacoes.userId, userId))).returning();
        if (updated) { atualizadas.push(updated); await atualizarExtratoESaldo(t, updated, userId); }
      }

      let deletadas = 0;
      if (totalFuturasNovo < parcelasFuturasAtuais.length) {
        const excedentes = parcelasFuturasAtuais.slice(totalFuturasNovo);
        for (const t of excedentes) await reverterExtratoESaldo(t, userId);
        await db.delete(transacoes).where(and(inArray(transacoes.id, excedentes.map(t => t.id)), eq(transacoes.userId, userId)));
        deletadas = excedentes.length;
      }

      let criadas: (typeof transacoes.$inferSelect)[] = [];
      if (totalFuturasNovo > parcelasFuturasAtuais.length) {
        const ultimaParcela = transacoesParceladas[transacoesParceladas.length - 1];
        const dataBase = new Date(ultimaParcela.data);
        const novasData = [];
        for (let i = totalParcelasAtuais + 1; i <= totalParcelasNovo; i++) {
          const dataNova = new Date(dataBase); dataNova.setMonth(dataBase.getMonth() + (i - totalParcelasAtuais));
          novasData.push({
            userId, tipo: json.tipo as string, descricao: json.descricao as string | null,
            valor: valorParcela.toFixed(2), data: dataNova, categoria: json.categoria as string | null,
            contaId: json.formaPagamento === "cartao" ? null : (json.contaId || null),
            formaPagamento: json.formaPagamento as string,
            cartaoId: json.formaPagamento === "cartao" ? json.cartaoId : null,
            estabelecimentoId, parcelado: true, parcelas: totalParcelasNovo, parcelaAtual: i,
            parcelamentoId: json.parcelamentoId,
          });
        }
        criadas = await db.insert(transacoes).values(novasData).returning();
        for (const nova of criadas) await processarExtratoESaldo(nova, userId);
      }

      if (parcelasPassadas.length > 0 && totalParcelasNovo !== totalParcelasAtuais) {
        await db.update(transacoes)
          .set({ parcelas: totalParcelasNovo, updatedAt: new Date() })
          .where(and(inArray(transacoes.id, parcelasPassadas.map(t => t.id)), eq(transacoes.userId, userId)));
      }

      return NextResponse.json({ atualizadas, deletadas, criadas, parcelasPassadasPreservadas: parcelasPassadas.length });
    }

    // ── TODA A RECORRÊNCIA ───────────────────────────────────────────────────
    if (modoEdicao === "toda_recorrencia") {
      if (!json.recorrenciaId) return NextResponse.json({ error: "recorrenciaId é obrigatório" }, { status: 400 });
      const transacoesRecorrentes = await db.select().from(transacoes).where(and(eq(transacoes.recorrenciaId, json.recorrenciaId), eq(transacoes.userId, userId))).orderBy(transacoes.data);
      if (!transacoesRecorrentes.length) return NextResponse.json({ error: "Recorrência não encontrada" }, { status: 404 });
      const totalRepeticoesAtuais = transacoesRecorrentes.length;
      const totalRepeticoesNovo   = json.repeticoes ? Number(json.repeticoes) : totalRepeticoesAtuais;
      const quantidadeManter      = Math.min(totalRepeticoesAtuais, totalRepeticoesNovo);
      const atualizadas           = [];
      for (let i = 0; i < quantidadeManter; i++) {
        const t = transacoesRecorrentes[i];
        const [updated] = await db.update(transacoes).set({ tipo: json.tipo, descricao: json.descricao, valor: String(json.valor), categoria: json.categoria, contaId: json.formaPagamento === "cartao" ? null : (json.contaId || null), formaPagamento: json.formaPagamento, cartaoId: json.formaPagamento === "cartao" ? json.cartaoId : null, estabelecimentoId, recorrente: true, recorrenciaId: json.recorrenciaId, repeticoes: totalRepeticoesNovo, updatedAt: new Date() }).where(and(eq(transacoes.id, t.id), eq(transacoes.userId, userId))).returning();
        if (updated) { atualizadas.push(updated); await atualizarExtratoESaldo(t, updated, userId); }
      }
      let deletadas = 0;
      if (totalRepeticoesNovo < totalRepeticoesAtuais) {
        const excedentes = transacoesRecorrentes.slice(totalRepeticoesNovo);
        for (const t of excedentes) await reverterExtratoESaldo(t, userId);
        await db.delete(transacoes).where(and(inArray(transacoes.id, excedentes.map(t => t.id)), eq(transacoes.userId, userId)));
        deletadas = excedentes.length;
      }
      let criadas: (typeof transacoes.$inferSelect)[] = [];
      if (totalRepeticoesNovo > totalRepeticoesAtuais) {
        const ultimaRepeticao = transacoesRecorrentes[transacoesRecorrentes.length - 1];
        const dataBase = new Date(ultimaRepeticao.data);
        const novasData = [];
        for (let i = totalRepeticoesAtuais + 1; i <= totalRepeticoesNovo; i++) {
          const dataNova = new Date(dataBase); dataNova.setMonth(dataBase.getMonth() + (i - totalRepeticoesAtuais));
          novasData.push({ userId, tipo: json.tipo as string, descricao: json.descricao as string | null, valor: String(json.valor), data: dataNova, categoria: json.categoria as string | null, contaId: json.formaPagamento === "cartao" ? null : (json.contaId || null), formaPagamento: json.formaPagamento as string, cartaoId: json.formaPagamento === "cartao" ? json.cartaoId : null, estabelecimentoId, recorrente: true, recorrenciaId: json.recorrenciaId, repeticoes: totalRepeticoesNovo, parcelado: false, parcelamentoId: null, parcelas: null, parcelaAtual: null });
        }
        criadas = await db.insert(transacoes).values(novasData).returning();
        for (const nova of criadas) await processarExtratoESaldo(nova, userId);
      }
      return NextResponse.json({ atualizadas, deletadas, criadas });
    }

    return NextResponse.json({ error: "Modo de edição inválido" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao atualizar transação" }, { status: 500 });
  }
}

// ── DELETE ─────────────────────────────────────────────────────────────────

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { id } = await params;
    if (!id) return NextResponse.json({ error: "ID inválido." }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const tipo = searchParams.get("tipo");
    const tiposPermitidos = ["unica", "todas_parcelas", "toda_recorrencia"];
    if (tipo && !tiposPermitidos.includes(tipo)) return NextResponse.json({ error: "Tipo inválido." }, { status: 400 });

    const [mov] = await db.select().from(transacoes).where(and(eq(transacoes.id, id), eq(transacoes.userId, userId))).limit(1);
    if (!mov) return NextResponse.json({ error: "Transação não encontrada" }, { status: 404 });
    if (mov.transferenciaId) return NextResponse.json({ error: "Esta transação faz parte de uma transferência." }, { status: 400 });

    const bloqueio = await buscarAntecipacaoBloqueante(userId, mov);
    if (bloqueio) return NextResponse.json({ error: MSG_BLOQUEIO_EXCLUIR }, { status: 400 });

    // ✅ NOVO: exclusão única — bloqueia se a transação (à vista, ou uma
    // ocorrência isolada de parcelada/recorrente) pertence a uma fatura
    // já paga
    if (!tipo || tipo === "unica") {
      const emFaturaPaga = await transacaoEstaEmFaturaPaga(userId, mov);
      if (emFaturaPaga) return NextResponse.json({ error: MSG_BLOQUEIO_FATURA_PAGA }, { status: 400 });
    }

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    let transacoesParaDeletar: typeof mov[] = [];
    if (!tipo || tipo === "unica") {
      transacoesParaDeletar = [mov];
    } else if (tipo === "todas_parcelas" && mov.parcelamentoId) {
      const todasDoGrupo = await db.select().from(transacoes)
        .where(and(eq(transacoes.parcelamentoId, mov.parcelamentoId), eq(transacoes.userId, userId)));
      const futuras = todasDoGrupo.filter((t) => new Date(t.data) > hoje);
      // ✅ NOVO: também exclui do lote qualquer item cuja fatura já esteja
      // paga (cobre o caso de uma parcela futura cuja fatura foi
      // adiantada e já quitada por completo)
      transacoesParaDeletar = [];
      for (const t of futuras) {
        const emFaturaPaga = await transacaoEstaEmFaturaPaga(userId, t);
        if (!emFaturaPaga) transacoesParaDeletar.push(t);
      }
    } else if (tipo === "toda_recorrencia" && mov.recorrenciaId) {
      const todasDoGrupo = await db.select().from(transacoes)
        .where(and(eq(transacoes.recorrenciaId, mov.recorrenciaId), eq(transacoes.userId, userId)));
      const futuras = todasDoGrupo.filter((t) => new Date(t.data) > hoje);
      transacoesParaDeletar = [];
      for (const t of futuras) {
        const emFaturaPaga = await transacaoEstaEmFaturaPaga(userId, t);
        if (!emFaturaPaga) transacoesParaDeletar.push(t);
      }
    }

    for (const transacao of transacoesParaDeletar) {
      const valor = Number(transacao.valor);
      if (transacao.contaId && transacao.formaPagamento !== "cartao") {
        const [conta] = await db.select().from(contas).where(eq(contas.id, transacao.contaId)).limit(1);
        if (conta) { const novoSaldo = transacao.tipo === "entrada" ? Number(conta.saldoAtual) - valor : Number(conta.saldoAtual) + valor; await db.update(contas).set({ saldoAtual: novoSaldo.toFixed(2), updatedAt: new Date() }).where(and(eq(contas.id, transacao.contaId), eq(contas.userId, userId))); }
      }
      await db.delete(extratoConta).where(and(eq(extratoConta.referenciaId, transacao.id), eq(extratoConta.userId, userId)));
      if (transacao.cartaoId && transacao.formaPagamento === "cartao") {
        const [cartao] = await db.select().from(cartoes).where(eq(cartoes.id, transacao.cartaoId)).limit(1);
        if (cartao) {
          if (cartao.tipo === "debito" && cartao.contaVinculadaId) {
            const [conta] = await db.select().from(contas).where(eq(contas.id, cartao.contaVinculadaId)).limit(1);
            if (conta) await db.update(contas).set({ saldoAtual: (Number(conta.saldoAtual) + valor).toFixed(2), updatedAt: new Date() }).where(and(eq(contas.id, conta.id), eq(contas.userId, userId)));
          } else if (cartao.tipo === "credito") {
            const { mes: mesFatura, ano: anoFatura } = calcularFaturaDaTransacao(new Date(transacao.data), cartao.diaFechamento || 1);
            const [fatura] = await db.select().from(faturas).where(and(eq(faturas.cartaoId, transacao.cartaoId), eq(faturas.userId, userId), eq(faturas.mes, mesFatura), eq(faturas.ano, anoFatura))).limit(1);
            if (fatura) { const novoTotal = Number(fatura.total) - valor; if (novoTotal <= 0) { await db.delete(faturas).where(eq(faturas.id, fatura.id)); } else { await db.update(faturas).set({ total: novoTotal.toFixed(2), updatedAt: new Date() }).where(eq(faturas.id, fatura.id)); } }
            await db.update(cartoes).set({ limiteDisponivel: sql`CAST(${cartoes.limiteDisponivel} AS NUMERIC) + ${valor}` }).where(and(eq(cartoes.id, transacao.cartaoId), eq(cartoes.userId, userId)));
          }
        }
      }
    }

    if (tipo === "todas_parcelas" && mov.parcelamentoId) {
      const antecipacoesDoGrupo = await db.select().from(antecipacoesParcela)
        .where(and(eq(antecipacoesParcela.parcelamentoId, mov.parcelamentoId), eq(antecipacoesParcela.userId, userId)));

      const idsSeraoDeletados = new Set(transacoesParaDeletar.map((t) => t.id));

      for (const antecipacao of antecipacoesDoGrupo) {
        const foiMesclada = antecipacao.valorOriginalTransacaoMesclada !== null;
        const linhaJaTratada = foiMesclada && idsSeraoDeletados.has(antecipacao.transacaoSinteticaId);

        if (!linhaJaTratada) {
          if (!foiMesclada) {
            await db.delete(transacoes)
              .where(and(eq(transacoes.id, antecipacao.transacaoSinteticaId), eq(transacoes.userId, userId)));
          }
          const [faturaAtual] = await db.select().from(faturas)
            .where(and(eq(faturas.id, antecipacao.faturaAtualId), eq(faturas.userId, userId)))
            .limit(1);
          if (faturaAtual) {
            const novoTotal = Number(faturaAtual.total) - Number(antecipacao.valorComDesconto);
            if (novoTotal <= 0) {
              await db.delete(faturas).where(eq(faturas.id, faturaAtual.id));
            } else {
              await db.update(faturas).set({
                total: novoTotal.toFixed(2),
                limiteExtraAoPagar: Math.max(0, Number(faturaAtual.limiteExtraAoPagar ?? 0) - Number(antecipacao.desconto)).toFixed(2),
                updatedAt: new Date(),
              }).where(eq(faturas.id, faturaAtual.id));
            }
          }
        } else {
          const [faturaAtual] = await db.select().from(faturas)
            .where(and(eq(faturas.id, antecipacao.faturaAtualId), eq(faturas.userId, userId)))
            .limit(1);
          if (faturaAtual) {
            await db.update(faturas).set({
              limiteExtraAoPagar: Math.max(0, Number(faturaAtual.limiteExtraAoPagar ?? 0) - Number(antecipacao.desconto)).toFixed(2),
              updatedAt: new Date(),
            }).where(eq(faturas.id, faturaAtual.id));
          }
        }

        await db.delete(antecipacoesParcela).where(eq(antecipacoesParcela.id, antecipacao.id));
      }
    }

    const idsParaDeletar = transacoesParaDeletar.map(t => t.id);
    if (idsParaDeletar.length === 1) await db.delete(transacoes).where(and(eq(transacoes.id, idsParaDeletar[0]), eq(transacoes.userId, userId)));
    else if (idsParaDeletar.length > 1) await db.delete(transacoes).where(and(inArray(transacoes.id, idsParaDeletar), eq(transacoes.userId, userId)));

    return NextResponse.json({ sucesso: true, deletadas: transacoesParaDeletar.length });
  } catch (err: any) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erro desconhecido" }, { status: 500 });
  }
}