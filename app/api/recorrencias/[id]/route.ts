import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { recorrencias } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import { garantirDono } from "@/lib/garantirDono";

const FORMAS_VALIDAS = ["dinheiro", "pix", "cartao"];

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await context.params;
  const body = await req.json();

  // ✅ EXPANDIDO: agora também permite editar valor, dia do mês, forma de
  // pagamento e conta/cartão — essas mudanças afetam só as PRÓXIMAS
  // gerações do cron; ocorrências já criadas no histórico não são
  // recalculadas retroativamente.
  const camposPermitidos: Record<string, any> = {};

  if (typeof body.ativa === "boolean") camposPermitidos.ativa = body.ativa;
  if (body.descricao !== undefined) camposPermitidos.descricao = body.descricao || null;
  if (body.categoria !== undefined) camposPermitidos.categoria = body.categoria || null;

  if (body.valor !== undefined) {
    const valorNum = Number(body.valor);
    if (isNaN(valorNum) || valorNum <= 0) {
      return NextResponse.json({ error: "Valor inválido" }, { status: 400 });
    }
    camposPermitidos.valor = valorNum.toFixed(2);
  }

  if (body.diaDoMes !== undefined) {
    const dia = Number(body.diaDoMes);
    if (!Number.isInteger(dia) || dia < 1 || dia > 31) {
      return NextResponse.json({ error: "diaDoMes deve ser um número entre 1 e 31" }, { status: 400 });
    }
    camposPermitidos.diaDoMes = dia;
  }

  if (body.formaPagamento !== undefined) {
    if (!FORMAS_VALIDAS.includes(body.formaPagamento)) {
      return NextResponse.json(
        { error: `formaPagamento inválida. Use: ${FORMAS_VALIDAS.join(", ")}` },
        { status: 400 }
      );
    }
    camposPermitidos.formaPagamento = body.formaPagamento;
  }

  // contaId/cartaoId — validados juntos com formaPagamento (final, após
  // aplicar a mudança) para garantir consistência
  if (body.contaId !== undefined) camposPermitidos.contaId = body.contaId || null;
  if (body.cartaoId !== undefined) {
    camposPermitidos.cartaoId = body.cartaoId ? Number(body.cartaoId) : null;
  }

  if (Object.keys(camposPermitidos).length === 0) {
    return NextResponse.json({ error: "Nenhum campo válido para atualizar" }, { status: 400 });
  }

  // Busca o registro atual para validar a combinação final de
  // formaPagamento + contaId/cartaoId (considerando campos não enviados
  // nesta requisição, que mantêm o valor já salvo)
  const [existente] = await db
    .select()
    .from(recorrencias)
    .where(and(eq(recorrencias.id, id), eq(recorrencias.userId, userId)))
    .limit(1);

  if (!existente) {
    return NextResponse.json({ error: "Recorrência não encontrada" }, { status: 404 });
  }

  const erroDono = await garantirDono(userId, { contaId: camposPermitidos.contaId, cartaoId: camposPermitidos.cartaoId });
  if (erroDono) return NextResponse.json({ error: erroDono }, { status: 404 });

  const formaPagamentoFinal = camposPermitidos.formaPagamento ?? existente.formaPagamento;
  const contaIdFinal = "contaId" in camposPermitidos ? camposPermitidos.contaId : existente.contaId;
  const cartaoIdFinal = "cartaoId" in camposPermitidos ? camposPermitidos.cartaoId : existente.cartaoId;

  if (formaPagamentoFinal === "cartao" && !cartaoIdFinal) {
    return NextResponse.json({ error: "cartaoId é obrigatório quando formaPagamento é cartao" }, { status: 400 });
  }
  if (formaPagamentoFinal !== "cartao" && !contaIdFinal) {
    return NextResponse.json({ error: "contaId é obrigatório quando formaPagamento não é cartao" }, { status: 400 });
  }

  const [atualizada] = await db
    .update(recorrencias)
    .set({ ...camposPermitidos, updatedAt: new Date() })
    .where(and(eq(recorrencias.id, id), eq(recorrencias.userId, userId)))
    .returning();

  return NextResponse.json(atualizada);
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await context.params;

  const [removida] = await db
    .delete(recorrencias)
    .where(and(eq(recorrencias.id, id), eq(recorrencias.userId, userId)))
    .returning();

  if (!removida) return NextResponse.json({ error: "Recorrência não encontrada" }, { status: 404 });
  return NextResponse.json({ message: "Recorrência cancelada" });
}