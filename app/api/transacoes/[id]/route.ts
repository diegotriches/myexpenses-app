// app/api/transacoes/[id]/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { transacoes } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import { garantirDono } from "@/lib/garantirDono";
import { ErroFinanceiro, type TransacaoBanco } from "@/lib/movimentacaoConta";
import {
  aplicarImpacto,
  atualizarImpacto,
  buscarAntecipacaoBloqueante,
  mudaImpacto,
  possuiEstorno,
  reverterImpacto,
  transacaoEmFaturaPaga,
} from "@/lib/impactoTransacao";
import { adicionarMeses } from "@/utils/dateUtils";
import { distribuirValor } from "@/utils/faturaUtils";
import { lerValorPositivo } from "@/lib/validators/financeiro";

type Transacao = typeof transacoes.$inferSelect;
type NovaTransacao = typeof transacoes.$inferInsert;

interface CorpoEdicao {
  modoEdicao?: string;
  tipo: string;
  descricao: string | null;
  valor: string | number;
  data?: string;
  categoria: string | null;
  formaPagamento: string;
  contaId?: string | null;
  cartaoId?: string | number | null;
  estabelecimentoId?: string | null;
  parcelado?: boolean;
  parcelas?: number | string;
  parcelamentoId?: string;
  recorrente?: boolean;
  repeticoes?: number | string;
  recorrenciaId?: string;
}

interface Edicao {
  tx: TransacaoBanco;
  userId: string;
  id: string;
  json: CorpoEdicao;
  camposBase: Pick<NovaTransacao, "tipo" | "descricao" | "categoria" | "formaPagamento" | "contaId" | "cartaoId" | "estabelecimentoId">;
}

const MSG_ANTECIPACAO_EDITAR  = "Esta transação faz parte de uma antecipação pendente. Desfaça a antecipação na aba Parcelas antes de editar.";
const MSG_ANTECIPACAO_EXCLUIR = "Esta transação faz parte de uma antecipação pendente. Desfaça a antecipação na aba Parcelas antes de excluir.";
const MSG_ORIGEM_PAGA         = "Esta transação faz parte de uma fatura já paga. Estorne o pagamento da fatura para alterar o valor, a data ou a forma de pagamento.";
const MSG_DESTINO_PAGO        = "A fatura dessa data já está paga. Estorne o pagamento da fatura ou escolha outra data.";
const MSG_COM_ESTORNO         = "Esta compra tem estorno lançado. Exclua o estorno antes de alterar o valor ou excluir a compra.";
const MSG_EXCLUIR_PAGA        = "Esta transação faz parte de uma fatura já paga. Não é possível excluí-la, para preservar o histórico.";

function montarProposta(camposBase: Edicao["camposBase"], valor: string, data: Date) {
  return {
    tipo: camposBase.tipo,
    valor,
    data,
    formaPagamento: camposBase.formaPagamento ?? null,
    contaId: camposBase.contaId ?? null,
    cartaoId: camposBase.cartaoId ?? null,
  };
}

// Fatura paga não pode ter o valor alterado: nem a de origem, nem a de destino
async function garantirFaturasAbertas(
  tx: TransacaoBanco,
  userId: string,
  antiga: Transacao,
  nova: Pick<Transacao, "tipo" | "formaPagamento" | "cartaoId" | "data">,
) {
  if (await transacaoEmFaturaPaga(tx, userId, antiga)) throw new ErroFinanceiro(MSG_ORIGEM_PAGA);
  if (nova.tipo === "saida" && await transacaoEmFaturaPaga(tx, userId, nova)) throw new ErroFinanceiro(MSG_DESTINO_PAGO);
}

async function editarUnica({ tx, userId, id, json, camposBase }: Edicao) {
  const [existente] = await tx.select().from(transacoes)
    .where(and(eq(transacoes.id, id), eq(transacoes.userId, userId))).limit(1).for("update");
  if (!existente) throw new ErroFinanceiro("Transação não encontrada", 404);

  if (existente.tipo === "estorno") throw new ErroFinanceiro("Estorno não pode ser editado. Exclua e lance novamente.");
  if (await buscarAntecipacaoBloqueante(tx, userId, existente)) throw new ErroFinanceiro(MSG_ANTECIPACAO_EDITAR);

  const data = json.data ? new Date(json.data) : new Date(existente.data);
  const isParcelado  = json.parcelado  === true;
  const isRecorrente = json.recorrente === true;
  const eraParcelado  = existente.parcelado  === true;
  const eraRecorrente = existente.recorrente === true;
  const viraParcelado  = isParcelado  && !eraParcelado;
  const viraRecorrente = isRecorrente && !eraRecorrente;

  const proposta = montarProposta(camposBase, String(json.valor), data);
  if (viraParcelado || viraRecorrente || mudaImpacto(existente, proposta)) {
    if (await possuiEstorno(tx, userId, [existente.id])) throw new ErroFinanceiro(MSG_COM_ESTORNO);
    await garantirFaturasAbertas(tx, userId, existente, proposta);
  }

  if (viraParcelado) {
    await reverterImpacto(tx, existente, userId);

    const totalParcelas  = Number(json.parcelas);
    const valorParcela   = (Number(json.valor) / totalParcelas).toFixed(2);
    const parcelamentoId = crypto.randomUUID();
    const grupo = { parcelado: true, parcelas: totalParcelas, parcelamentoId, recorrente: false, recorrenciaId: null, repeticoes: null };

    const [parcela1] = await tx.update(transacoes)
      .set({ ...camposBase, ...grupo, valor: valorParcela, data, parcelaAtual: 1, updatedAt: new Date() })
      .where(and(eq(transacoes.id, id), eq(transacoes.userId, userId))).returning();

    const parcelasParaCriar: NovaTransacao[] = [];
    for (let i = 2; i <= totalParcelas; i++) {
      parcelasParaCriar.push({ ...camposBase, ...grupo, userId, valor: valorParcela, data: adicionarMeses(data, i - 1), parcelaAtual: i });
    }
    const novasParcelas = parcelasParaCriar.length ? await tx.insert(transacoes).values(parcelasParaCriar).returning() : [];

    await aplicarImpacto(tx, parcela1, userId);
    for (const parcela of novasParcelas) await aplicarImpacto(tx, parcela, userId);

    return { parcela1, novasParcelas, parcelamentoId, totalParcelas };
  }

  if (viraRecorrente) {
    await reverterImpacto(tx, existente, userId);

    const totalRepeticoes = Number(json.repeticoes);
    const recorrenciaId   = crypto.randomUUID();
    const grupo = { recorrente: true, recorrenciaId, repeticoes: totalRepeticoes, parcelado: false, parcelamentoId: null, parcelas: null, parcelaAtual: null };

    const [repeticao1] = await tx.update(transacoes)
      .set({ ...camposBase, ...grupo, valor: String(json.valor), data, updatedAt: new Date() })
      .where(and(eq(transacoes.id, id), eq(transacoes.userId, userId))).returning();

    const repeticoesParaCriar: NovaTransacao[] = [];
    for (let i = 2; i <= totalRepeticoes; i++) {
      repeticoesParaCriar.push({ ...camposBase, ...grupo, userId, valor: String(json.valor), data: adicionarMeses(data, i - 1) });
    }
    const novasRepeticoes = repeticoesParaCriar.length ? await tx.insert(transacoes).values(repeticoesParaCriar).returning() : [];

    await aplicarImpacto(tx, repeticao1, userId);
    for (const repeticao of novasRepeticoes) await aplicarImpacto(tx, repeticao, userId);

    return { repeticao1, novasRepeticoes, recorrenciaId, totalRepeticoes };
  }

  // Edição simples, inclusive de uma ocorrência que deixa de ser recorrente
  const [atualizada] = await tx.update(transacoes)
    .set({
      ...camposBase,
      valor: String(json.valor),
      data,
      parcelado: isParcelado,
      parcelas: isParcelado ? (json.parcelas !== undefined ? Number(json.parcelas) : null) : null,
      parcelaAtual: isParcelado ? (existente.parcelaAtual ?? 1) : null,
      parcelamentoId: isParcelado ? (existente.parcelamentoId || crypto.randomUUID()) : null,
      recorrente: isRecorrente,
      repeticoes: isRecorrente ? (json.repeticoes !== undefined ? Number(json.repeticoes) : null) : null,
      recorrenciaId: isRecorrente ? (existente.recorrenciaId || crypto.randomUUID()) : null,
      updatedAt: new Date(),
    })
    .where(and(eq(transacoes.id, id), eq(transacoes.userId, userId))).returning();

  await atualizarImpacto(tx, existente, atualizada, userId);

  return eraRecorrente && !isRecorrente ? { novaTransacao: atualizada, ocorrenciaOriginalId: id } : atualizada;
}

async function editarTodasParcelas({ tx, userId, json, camposBase }: Edicao) {
  const parcelamentoId = json.parcelamentoId;
  if (!parcelamentoId) throw new ErroFinanceiro("parcelamentoId é obrigatório");

  if (await buscarAntecipacaoBloqueante(tx, userId, { id: crypto.randomUUID(), parcelamentoId })) {
    throw new ErroFinanceiro(MSG_ANTECIPACAO_EDITAR);
  }

  const parcelas = await tx.select().from(transacoes)
    .where(and(eq(transacoes.parcelamentoId, parcelamentoId), eq(transacoes.userId, userId)))
    .orderBy(transacoes.parcelaAtual)
    .for("update");
  if (!parcelas.length) throw new ErroFinanceiro("Parcelamento não encontrado", 404);

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const passadas = parcelas.filter((t) => new Date(t.data) <= hoje);
  const futuras  = parcelas.filter((t) => new Date(t.data) > hoje);

  const totalAtual = parcelas.length;
  const totalNovo  = json.parcelas ? Number(json.parcelas) : totalAtual;

  if (totalNovo < passadas.length) {
    throw new ErroFinanceiro(`Não é possível reduzir para menos de ${passadas.length} parcelas — esse é o número de parcelas já vencidas`);
  }

  const futurasNovo = totalNovo - passadas.length;
  const excedentes  = futuras.slice(futurasNovo);
  const mantidas    = [...passadas, ...futuras.slice(0, futurasNovo)];

  for (const t of excedentes) {
    if (await transacaoEmFaturaPaga(tx, userId, t)) throw new ErroFinanceiro(MSG_ORIGEM_PAGA);
  }

  // Só fatura paga congela o valor. O total informado é sempre respeitado:
  // o que as parcelas congeladas não cobrem é dividido entre as demais.
  const emFaturaPaga = new Set<string>();
  for (const t of mantidas) {
    if (await transacaoEmFaturaPaga(tx, userId, t)) emFaturaPaga.add(t.id);
  }

  const congeladas = mantidas.filter((t) => emFaturaPaga.has(t.id));
  const centavosCongelados = congeladas.reduce((soma, t) => soma + Math.round(Number(t.valor) * 100), 0);
  const centavosRestantes  = Math.round(Number(json.valor) * 100) - centavosCongelados;
  const abertas = totalNovo - congeladas.length;

  if (abertas === 0 && centavosRestantes !== 0) {
    throw new ErroFinanceiro("Todas as parcelas estão em faturas pagas: o valor total não pode ser alterado.");
  }
  if (abertas > 0 && centavosRestantes <= 0) {
    throw new ErroFinanceiro(`O valor total deve ser maior que o já quitado em faturas pagas (R$ ${(centavosCongelados / 100).toFixed(2)}).`);
  }

  const valoresAbertos = distribuirValor(centavosRestantes, abertas);
  let proximoValor = 0;
  const planejadas = mantidas.map((t) => ({
    antiga: t,
    valor: emFaturaPaga.has(t.id) ? t.valor : valoresAbertos[proximoValor++],
  }));

  // Valida tudo antes da primeira gravação
  if (await possuiEstorno(tx, userId, parcelas.map((t) => t.id)) && (
    excedentes.length > 0 ||
    totalNovo > totalAtual ||
    planejadas.some(({ antiga, valor }) => mudaImpacto(antiga, montarProposta(camposBase, valor, antiga.data)))
  )) {
    throw new ErroFinanceiro(MSG_COM_ESTORNO);
  }

  for (const { antiga, valor } of planejadas) {
    const proposta = montarProposta(camposBase, valor, antiga.data);
    if (mudaImpacto(antiga, proposta)) await garantirFaturasAbertas(tx, userId, antiga, proposta);
  }

  const atualizadas: Transacao[] = [];
  for (const { antiga, valor } of planejadas) {
    const [atualizada] = await tx.update(transacoes)
      .set({ ...camposBase, valor, parcelado: true, parcelas: totalNovo, updatedAt: new Date() })
      .where(and(eq(transacoes.id, antiga.id), eq(transacoes.userId, userId))).returning();
    atualizadas.push(atualizada);
    await atualizarImpacto(tx, antiga, atualizada, userId);
  }

  for (const t of excedentes) await reverterImpacto(tx, t, userId);
  if (excedentes.length) {
    await tx.delete(transacoes).where(and(inArray(transacoes.id, excedentes.map((t) => t.id)), eq(transacoes.userId, userId)));
  }

  let criadas: Transacao[] = [];
  if (totalNovo > totalAtual) {
    const dataBase = new Date(parcelas[parcelas.length - 1].data);
    const novas: NovaTransacao[] = [];
    for (let i = totalAtual + 1; i <= totalNovo; i++) {
      novas.push({ ...camposBase, userId, valor: valoresAbertos[proximoValor++], data: adicionarMeses(dataBase, i - totalAtual), parcelado: true, parcelas: totalNovo, parcelaAtual: i, parcelamentoId });
    }
    criadas = await tx.insert(transacoes).values(novas).returning();
    for (const nova of criadas) await aplicarImpacto(tx, nova, userId);
  }

  return { atualizadas, deletadas: excedentes.length, criadas, parcelasEmFaturaPaga: congeladas.length };
}

async function editarTodaRecorrencia({ tx, userId, json, camposBase }: Edicao) {
  const recorrenciaId = json.recorrenciaId;
  if (!recorrenciaId) throw new ErroFinanceiro("recorrenciaId é obrigatório");

  const repeticoes = await tx.select().from(transacoes)
    .where(and(eq(transacoes.recorrenciaId, recorrenciaId), eq(transacoes.userId, userId)))
    .orderBy(transacoes.data)
    .for("update");
  if (!repeticoes.length) throw new ErroFinanceiro("Recorrência não encontrada", 404);

  const totalAtual = repeticoes.length;
  const totalNovo  = json.repeticoes ? Number(json.repeticoes) : totalAtual;
  const mantidas   = repeticoes.slice(0, totalNovo);
  const excedentes = repeticoes.slice(totalNovo);
  const valor      = String(json.valor);

  for (const t of mantidas) {
    const proposta = montarProposta(camposBase, valor, t.data);
    if (mudaImpacto(t, proposta)) await garantirFaturasAbertas(tx, userId, t, proposta);
  }
  for (const t of excedentes) {
    if (await transacaoEmFaturaPaga(tx, userId, t)) throw new ErroFinanceiro(MSG_ORIGEM_PAGA);
  }

  const atualizadas: Transacao[] = [];
  for (const t of mantidas) {
    const [atualizada] = await tx.update(transacoes)
      .set({ ...camposBase, valor, recorrente: true, recorrenciaId, repeticoes: totalNovo, updatedAt: new Date() })
      .where(and(eq(transacoes.id, t.id), eq(transacoes.userId, userId))).returning();
    atualizadas.push(atualizada);
    await atualizarImpacto(tx, t, atualizada, userId);
  }

  for (const t of excedentes) await reverterImpacto(tx, t, userId);
  if (excedentes.length) {
    await tx.delete(transacoes).where(and(inArray(transacoes.id, excedentes.map((t) => t.id)), eq(transacoes.userId, userId)));
  }

  let criadas: Transacao[] = [];
  if (totalNovo > totalAtual) {
    const dataBase = new Date(repeticoes[repeticoes.length - 1].data);
    const novas: NovaTransacao[] = [];
    for (let i = totalAtual + 1; i <= totalNovo; i++) {
      novas.push({ ...camposBase, userId, valor, data: adicionarMeses(dataBase, i - totalAtual), recorrente: true, recorrenciaId, repeticoes: totalNovo, parcelado: false, parcelamentoId: null, parcelas: null, parcelaAtual: null });
    }
    criadas = await tx.insert(transacoes).values(novas).returning();
    for (const nova of criadas) await aplicarImpacto(tx, nova, userId);
  }

  return { atualizadas, deletadas: excedentes.length, criadas };
}

// ── PUT ───────────────────────────────────────────────────────────────────────

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { id } = await params;
    if (!id) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

    const json: CorpoEdicao = await req.json();
    const estabelecimentoId = json.estabelecimentoId ?? null;

    const erroDono = await garantirDono(userId, { contaId: json.contaId, cartaoId: json.cartaoId, estabelecimentoId });
    if (erroDono) return NextResponse.json({ error: erroDono }, { status: 404 });

    if (lerValorPositivo(json.valor) === null) return NextResponse.json({ error: "Valor inválido" }, { status: 400 });

    const noCartao = json.formaPagamento === "cartao";
    const camposBase: Edicao["camposBase"] = {
      tipo: json.tipo,
      descricao: json.descricao,
      categoria: json.categoria,
      formaPagamento: json.formaPagamento,
      contaId: noCartao ? null : (json.contaId || null),
      cartaoId: noCartao ? Number(json.cartaoId) : null,
      estabelecimentoId,
    };

    const resposta = await db.transaction(async (tx) => {
      const edicao: Edicao = { tx, userId, id, json, camposBase };
      if (json.modoEdicao === "unica") return editarUnica(edicao);
      if (json.modoEdicao === "todas_parcelas") return editarTodasParcelas(edicao);
      if (json.modoEdicao === "toda_recorrencia") return editarTodaRecorrencia(edicao);
      throw new ErroFinanceiro("Modo de edição inválido");
    });

    return NextResponse.json(resposta);
  } catch (error: unknown) {
    if (error instanceof ErroFinanceiro) return NextResponse.json({ error: error.message }, { status: error.status });
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
    if (tipo && !["unica", "todas_parcelas", "toda_recorrencia"].includes(tipo)) {
      return NextResponse.json({ error: "Tipo inválido." }, { status: 400 });
    }

    const deletadas = await db.transaction(async (tx) => {
      const [mov] = await tx.select().from(transacoes)
        .where(and(eq(transacoes.id, id), eq(transacoes.userId, userId))).limit(1).for("update");
      if (!mov) throw new ErroFinanceiro("Transação não encontrada", 404);
      if (mov.transferenciaId) throw new ErroFinanceiro("Esta transação faz parte de uma transferência.");

      if (await buscarAntecipacaoBloqueante(tx, userId, mov)) throw new ErroFinanceiro(MSG_ANTECIPACAO_EXCLUIR);

      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      let paraExcluir: Transacao[] = [];
      if (!tipo || tipo === "unica") {
        if (await transacaoEmFaturaPaga(tx, userId, mov)) throw new ErroFinanceiro(MSG_EXCLUIR_PAGA);
        paraExcluir = [mov];
      } else {
        const coluna = tipo === "todas_parcelas" ? transacoes.parcelamentoId : transacoes.recorrenciaId;
        const grupoId = tipo === "todas_parcelas" ? mov.parcelamentoId : mov.recorrenciaId;
        if (grupoId) {
          const grupo = await tx.select().from(transacoes)
            .where(and(eq(coluna, grupoId), eq(transacoes.userId, userId)))
            .for("update");
          for (const t of grupo) {
            // Parcelas: todas, menos as de fatura já quitada. Recorrência: só as futuras,
            // pois as ocorrências passadas são histórico real
            const noPeriodo = tipo === "todas_parcelas" || new Date(t.data) > hoje;
            if (noPeriodo && !(await transacaoEmFaturaPaga(tx, userId, t))) paraExcluir.push(t);
          }
        }
      }

      if (await possuiEstorno(tx, userId, paraExcluir.map((t) => t.id))) throw new ErroFinanceiro(MSG_COM_ESTORNO);

      for (const t of paraExcluir) await reverterImpacto(tx, t, userId);

      if (paraExcluir.length) {
        await tx.delete(transacoes)
          .where(and(inArray(transacoes.id, paraExcluir.map((t) => t.id)), eq(transacoes.userId, userId)));
      }

      return paraExcluir.length;
    });

    return NextResponse.json({ sucesso: true, deletadas });
  } catch (error: unknown) {
    if (error instanceof ErroFinanceiro) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro desconhecido" }, { status: 500 });
  }
}
