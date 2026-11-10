import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { adiantamentosFatura, faturas, contas, cartoes } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import { ErroFinanceiro, movimentarConta } from "@/lib/movimentacaoConta";
import { hojeBrt } from "@/utils/aplicacaoSimulacao";
import { respostaDeErro } from "@/lib/rota";
import { formatarMoeda } from "@/utils/formatadores";

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/cartoes/[id]/fatura/adiantamento?mes=M&ano=A
// Registra um adiantamento parcial ou total na fatura indicada.
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId  = await getUserId();
    if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { id }   = await params;
    const cartaoId = Number(id);
    if (!cartaoId) return NextResponse.json({ error: "Cartão inválido" }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const ano = Number(searchParams.get("ano"));
    const mes = Number(searchParams.get("mes"));
    if (isNaN(ano) || isNaN(mes) || mes < 1 || mes > 12)
      return NextResponse.json({ error: "Ano ou mês inválido" }, { status: 400 });

    const { contaId, valor, descricao } = await req.json();

    if (!contaId) return NextResponse.json({ error: "Conta é obrigatória" }, { status: 400 });

    const valorNum = Number(valor);
    if (isNaN(valorNum) || valorNum <= 0)
      return NextResponse.json({ error: "Valor deve ser maior que zero" }, { status: 400 });

    // ── 1. Buscar fatura ──────────────────────────────────────────────────────
    const [fatura] = await db
      .select()
      .from(faturas)
      .where(and(
        eq(faturas.cartaoId, cartaoId),
        eq(faturas.userId,   userId),
        eq(faturas.ano,      ano),
        eq(faturas.mes,      mes)
      ))
      .limit(1);

    if (!fatura)
      return NextResponse.json({ error: "Fatura não encontrada" }, { status: 404 });
    if (fatura.paga)
      return NextResponse.json({ error: "Fatura já está paga — use o pagamento normal" }, { status: 400 });

    const totalFatura = Number(fatura.total);
    if (totalFatura <= 0)
      return NextResponse.json({ error: "Fatura sem saldo a adiantar" }, { status: 400 });

    // fatura.total já vem líquido dos adiantamentos anteriores
    const saldoRestante = totalFatura;

    if (valorNum > saldoRestante)
      return NextResponse.json(
        { error: `Valor excede o saldo restante da fatura (${formatarMoeda(saldoRestante)})` },
        { status: 400 }
      );

    // ── 2. Buscar conta ───────────────────────────────────────────────────────
    const [conta] = await db
      .select()
      .from(contas)
      .where(and(eq(contas.id, contaId), eq(contas.userId, userId)))
      .limit(1);

    if (!conta)  return NextResponse.json({ error: "Conta não encontrada" }, { status: 404 });
    if (!conta.ativo) return NextResponse.json({ error: "Conta inativa" }, { status: 400 });

    // ── 3. Buscar cartão ──────────────────────────────────────────────────────
    const [cartao] = await db
      .select()
      .from(cartoes)
      .where(and(eq(cartoes.id, cartaoId), eq(cartoes.userId, userId)))
      .limit(1);

    if (!cartao) return NextResponse.json({ error: "Cartão não encontrado" }, { status: 404 });

    const descricaoFinal = descricao?.trim() ||
      `Adiantamento fatura ${cartao.nome} - ${String(mes).padStart(2, "0")}/${ano}`;

    const { adiantamento, saldoDepois, novoTotalFatura } = await db.transaction(async (tx) => {
      const [atual] = await tx.select().from(faturas).where(eq(faturas.id, fatura.id)).limit(1).for("update");
      if (!atual || atual.paga) throw new ErroFinanceiro("Fatura já está paga — use o pagamento normal");

      const restante = Number(atual.total);
      if (valorNum > restante) {
        throw new ErroFinanceiro(`Valor excede o saldo restante da fatura (${formatarMoeda(restante)})`);
      }

      const [novo] = await tx
        .insert(adiantamentosFatura)
        .values({
          userId,
          faturaId:  fatura.id,
          contaId,
          valor:     valorNum.toFixed(2),
          descricao: descricaoFinal,
        })
        .returning();

      const { saldoApos } = await movimentarConta(tx, {
        userId,
        contaId,
        tipo:      "saida",
        valor:     valorNum,
        data:      hojeBrt(),
        descricao: descricaoFinal,
        origem:    "PAGAMENTO_FATURA",
        referenciaId: novo.id,
        mensagemSaldoInsuficiente: "Saldo insuficiente na conta selecionada",
      });

      const novoTotal = restante - valorNum;
      await tx
        .update(faturas)
        .set({ total: novoTotal.toFixed(2), updatedAt: new Date() })
        .where(eq(faturas.id, fatura.id));

      await tx
        .update(cartoes)
        .set({
          limiteDisponivel: sql`CAST(${cartoes.limiteDisponivel} AS NUMERIC) + ${valorNum}`,
        })
        .where(and(eq(cartoes.id, cartaoId), eq(cartoes.userId, userId)));

      return { adiantamento: novo, saldoDepois: saldoApos, novoTotalFatura: novoTotal };
    });

    return NextResponse.json(
      {
        message:       "Adiantamento registrado com sucesso",
        adiantamento,
        novoTotalFatura,
        saldoConta:    saldoDepois,
      },
      { status: 201 }
    );
  } catch (error) {
    return respostaDeErro(error, "Erro ao registrar adiantamento");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/cartoes/[id]/fatura/adiantamento?mes=M&ano=A
// Lista todos os adiantamentos de uma fatura.
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId  = await getUserId();
    if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { id }   = await params;
    const cartaoId = Number(id);

    const { searchParams } = new URL(req.url);
    const ano = Number(searchParams.get("ano"));
    const mes = Number(searchParams.get("mes"));

    const [fatura] = await db
      .select()
      .from(faturas)
      .where(and(
        eq(faturas.cartaoId, cartaoId),
        eq(faturas.userId,   userId),
        eq(faturas.ano,      ano),
        eq(faturas.mes,      mes)
      ))
      .limit(1);

    if (!fatura) return NextResponse.json([], { status: 200 });

    const lista = await db
      .select()
      .from(adiantamentosFatura)
      .where(and(
        eq(adiantamentosFatura.faturaId, fatura.id),
        eq(adiantamentosFatura.userId,   userId)
      ))
      .orderBy(adiantamentosFatura.createdAt);

    return NextResponse.json(lista);
  } catch (error) {
    return respostaDeErro(error, "Erro ao listar adiantamentos");
  }
}