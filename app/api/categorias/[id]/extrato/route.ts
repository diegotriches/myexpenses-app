import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { categorias, transacoes, contas, cartoes } from "@/db/schema";
import { and, eq, sql, desc, ilike } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import { respostaDeErro } from "@/lib/rota";

/**
 * GET /api/categorias/[id]/extrato?ano=2026[&mes=11][&tipo=saida][&busca=...][&limit=50][&offset=0]
 *
 * Extrato de uma categoria: lançamentos do período (data da compra, mesmo
 * para cartão), resumo, comparação com o período anterior e série mensal do ano.
 *
 * ⚠️ A transação guarda a categoria pelo NOME (transacoes.categoria), não por id.
 * Datas: o app grava as datas em UTC à meia-noite, então os limites do período
 * e a série mensal também usam UTC.
 */

const ANO_MIN = 2000;
const ANO_MAX = 2100;

function limites(ano: number, mes: number | null) {
  return mes
    ? { inicio: new Date(Date.UTC(ano, mes - 1, 1)), fim: new Date(Date.UTC(ano, mes, 1)) }
    : { inicio: new Date(Date.UTC(ano, 0, 1)), fim: new Date(Date.UTC(ano + 1, 0, 1)) };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { id } = await params;
    const sp = req.nextUrl.searchParams;

    const ano = parseInt(sp.get("ano") ?? "");
    if (isNaN(ano) || ano < ANO_MIN || ano > ANO_MAX)
      return NextResponse.json({ error: "Ano inválido" }, { status: 400 });

    const mesParam = sp.get("mes");
    const mes = mesParam ? parseInt(mesParam) : null;
    if (mes !== null && (isNaN(mes) || mes < 1 || mes > 12))
      return NextResponse.json({ error: "Mês inválido" }, { status: 400 });

    const tipoParam = sp.get("tipo");
    const tipo = tipoParam === "entrada" || tipoParam === "saida" ? tipoParam : null;
    const busca = (sp.get("busca") ?? "").trim();
    const limit = Math.min(Math.max(parseInt(sp.get("limit") ?? "50") || 50, 1), 200);
    const offset = Math.max(parseInt(sp.get("offset") ?? "0") || 0, 0);

    // Categoria (somente do usuário)
    const [categoria] = await db
      .select()
      .from(categorias)
      .where(and(eq(categorias.id, id), eq(categorias.userId, userId)))
      .limit(1);
    if (!categoria)
      return NextResponse.json({ error: "Categoria não encontrada" }, { status: 404 });

    const base = [eq(transacoes.userId, userId), eq(transacoes.categoria, categoria.nome)];

    const { inicio, fim } = limites(ano, mes);
    const noPeriodo = sql`${transacoes.data} >= ${inicio} AND ${transacoes.data} < ${fim}`;

    // Período anterior: mês anterior (ou ano anterior)
    const ant = mes
      ? limites(mes === 1 ? ano - 1 : ano, mes === 1 ? 12 : mes - 1)
      : limites(ano - 1, null);
    const noAnterior = sql`${transacoes.data} >= ${ant.inicio} AND ${transacoes.data} < ${ant.fim}`;

    // Totais por tipo (período atual e anterior)
    const totaisPorTipo = async (cond: ReturnType<typeof sql>) => {
      const linhas = await db
        .select({
          tipo: transacoes.tipo,
          total: sql<string>`coalesce(sum(${transacoes.valor}), 0)`,
          quantidade: sql<number>`count(*)::int`,
        })
        .from(transacoes)
        .where(and(...base, cond))
        .groupBy(transacoes.tipo);

      let totalEntrada = 0, totalSaida = 0, quantidade = 0;
      for (const l of linhas) {
        if (l.tipo === "entrada") totalEntrada = Number(l.total);
        else if (l.tipo === "saida") totalSaida += Number(l.total);
        else if (l.tipo === "estorno") totalSaida -= Number(l.total);
        quantidade += l.quantidade;
      }
      return { totalEntrada, totalSaida, quantidade };
    };

    const [atual, anterior] = await Promise.all([
      totaisPorTipo(noPeriodo),
      totaisPorTipo(noAnterior),
    ]);

    // Série mensal do ano inteiro (para o gráfico)
    const anoLim = limites(ano, null);
    const linhasMes = await db
      .select({
        mes: sql<number>`extract(month from ${transacoes.data} at time zone 'UTC')::int`,
        tipo: transacoes.tipo,
        total: sql<string>`coalesce(sum(${transacoes.valor}), 0)`,
      })
      .from(transacoes)
      .where(and(...base, sql`${transacoes.data} >= ${anoLim.inicio} AND ${transacoes.data} < ${anoLim.fim}`))
      .groupBy(sql`extract(month from ${transacoes.data} at time zone 'UTC')`, transacoes.tipo);

    const porMes = Array.from({ length: 12 }, (_, i) => ({ mes: i + 1, entrada: 0, saida: 0 }));
    for (const l of linhasMes) {
      const alvo = porMes[l.mes - 1];
      if (!alvo) continue;
      if (l.tipo === "entrada") alvo.entrada = Number(l.total);
      else if (l.tipo === "saida") alvo.saida += Number(l.total);
      else if (l.tipo === "estorno") alvo.saida -= Number(l.total);
    }

    // Lista paginada (aceita filtro de tipo e busca)
    const filtrosLista = [...base, noPeriodo];
    if (tipo) filtrosLista.push(eq(transacoes.tipo, tipo));
    if (busca) filtrosLista.push(ilike(transacoes.descricao, `%${busca}%`));

    const linhas = await db
      .select({
        id: transacoes.id,
        data: transacoes.data,
        tipo: transacoes.tipo,
        descricao: transacoes.descricao,
        valor: transacoes.valor,
        formaPagamento: transacoes.formaPagamento,
        contaId: transacoes.contaId,
        contaNome: contas.nome,
        cartaoId: transacoes.cartaoId,
        cartaoNome: cartoes.nome,
        parcelado: transacoes.parcelado,
        parcelas: transacoes.parcelas,
        parcelaAtual: transacoes.parcelaAtual,
        recorrente: transacoes.recorrente,
      })
      .from(transacoes)
      .leftJoin(contas, eq(contas.id, transacoes.contaId))
      .leftJoin(cartoes, eq(cartoes.id, transacoes.cartaoId))
      .where(and(...filtrosLista))
      .orderBy(desc(transacoes.data), desc(transacoes.createdAt))
      .limit(limit + 1)
      .offset(offset);

    const temMais = linhas.length > limit;
    const lancamentos = linhas.slice(0, limit).map((l) => ({
      ...l,
      valor: Number(l.valor),
    }));

    return NextResponse.json({
      categoria: { id: categoria.id, nome: categoria.nome, tipo: categoria.tipo, icone: categoria.icone },
      periodo: { ano, mes },
      resumo: atual,
      anterior,
      porMes,
      lancamentos,
      temMais,
    });
  } catch (error) {
    return respostaDeErro(error, "Erro ao buscar extrato da categoria");
  }
}