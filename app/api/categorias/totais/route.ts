// src/app/api/categorias/totais/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { transacoes, categorias } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getUserId } from "@/lib/auth";

/**
 * GET /api/categorias/totais?ano=2026
 *
 * Retorna para cada categoria do usuário:
 * - total: soma dos valores das transações no ano
 * - quantidade: número de transações no ano
 *
 * Agrupa por categoria (campo texto) nas transações,
 * depois cruza com a tabela de categorias para retornar
 * os dados indexados por categoriaId.
 *
 * Obs.: a tabela transacoes usa `categoria` como campo texto (nome),
 * não como FK. O join é feito pelo nome para manter compatibilidade.
 */
export async function GET(req: Request) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const ano = Number(searchParams.get("ano") ?? new Date().getFullYear());

    if (isNaN(ano) || ano < 2000 || ano > 2100) {
      return NextResponse.json({ error: "Ano inválido" }, { status: 400 });
    }

    // 1. Buscar todas as categorias do usuário
    const todasCategorias = await db
      .select({ id: categorias.id, nome: categorias.nome, tipo: categorias.tipo })
      .from(categorias)
      .where(eq(categorias.userId, userId));

    // 2. Agregar transações do ano por categoria (nome) e tipo
    //    Usamos sql`` para extrair o ano do timestamp com timezone
    const agregados = await db
      .select({
        categoriaNome: transacoes.categoria,
        tipo: transacoes.tipo,
        total: sql<string>`COALESCE(SUM(${transacoes.valor}), 0)`,
        quantidade: sql<number>`COUNT(*)::int`,
      })
      .from(transacoes)
      .where(
        and(
          eq(transacoes.userId, userId),
          sql`EXTRACT(YEAR FROM ${transacoes.data}) = ${ano}`,
          sql`${transacoes.categoria} IS NOT NULL`
        )
      )
      .groupBy(transacoes.categoria, transacoes.tipo);

    // 3. Montar mapa: categoriaNome → { totalEntrada, totalSaida, quantidade }
    const mapaAgregados = new Map<
      string,
      { totalEntrada: number; totalSaida: number; quantidade: number }
    >();

    for (const row of agregados) {
      if (!row.categoriaNome) continue;
      const nome = row.categoriaNome;
      const existing = mapaAgregados.get(nome) ?? {
        totalEntrada: 0,
        totalSaida: 0,
        quantidade: 0,
      };

      if (row.tipo === "entrada") {
        existing.totalEntrada += Number(row.total);
      } else if (row.tipo === "estorno") {
        existing.totalSaida -= Number(row.total);
      } else {
        existing.totalSaida += Number(row.total);
      }
      existing.quantidade += row.quantidade;
      mapaAgregados.set(nome, existing);
    }

    // 4. Cruzar com as categorias do usuário (por nome)
    //    e retornar objeto indexado por categoriaId
    const resultado: Record<
      string,
      { total: number; totalEntrada: number; totalSaida: number; quantidade: number }
    > = {};

    for (const cat of todasCategorias) {
      const dados = mapaAgregados.get(cat.nome);
      resultado[cat.id] = {
        total: (dados?.totalEntrada ?? 0) + (dados?.totalSaida ?? 0),
        totalEntrada: dados?.totalEntrada ?? 0,
        totalSaida: dados?.totalSaida ?? 0,
        quantidade: dados?.quantidade ?? 0,
      };
    }

    return NextResponse.json({ ano, totais: resultado });
  } catch (error) {
    console.error("Erro ao buscar totais de categorias:", error);
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}