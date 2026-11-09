//
// Regras compartilhadas entre DELETE /api/categorias/[id] e
// GET /api/categorias/[id]/uso — as duas precisam concordar sobre o que
// vai ser movido e pra onde.

import { db } from "@/db";
import { categorias, transacoes, recorrencias, type CategoriaDb } from "@/db/schema";
import { and, eq, inArray, ne, sql } from "drizzle-orm";

export type TipoMovimentacao = "entrada" | "saida";

// Categoria que recebe as movimentações quando outra é excluída. Ajuste os
// nomes aqui se as categorias padrão do app tiverem outro nome — a busca
// ignora maiúsculas/minúsculas, então "Outras Despesas" também é reaproveitada.
export const CATEGORIA_DESTINO: Record<TipoMovimentacao, { nome: string }> = {
  saida:   { nome: "Outras despesas" },
  entrada: { nome: "Outras receitas" },
};

// Ícone usado só se a categoria de destino precisar ser criada. Troque por
// um dos nomes do seu iconOptions (se o nome não existir lá, a categoria
// funciona normalmente, só aparece sem ícone).
export const ICONE_CATEGORIA_DESTINO = "MoreHorizontal";

/** As categorias de destino não podem ser excluídas — não haveria pra onde mover. */
export function ehCategoriaDestino(nome: string): boolean {
  const n = nome.trim().toLowerCase();
  return Object.values(CATEGORIA_DESTINO).some((d) => d.nome.toLowerCase() === n);
}

/**
 * Tipos de movimentação afetados: categoria de despesa mexe só em saídas,
 * de receita só em entradas, e "ambos" nos dois.
 */
export function tiposDeMovimentacao(categoria: Pick<CategoriaDb, "tipo">): TipoMovimentacao[] {
  return categoria.tipo === "ambos" ? ["saida", "entrada"] : [categoria.tipo];
}

/**
 * Como não há nome único no banco, pode existir outra categoria com o mesmo
 * nome que continua cobrindo esse tipo. Nesse caso as movimentações seguem
 * válidas e não devem ser movidas.
 */
export async function outraCategoriaCobre(
  userId: string,
  categoria: Pick<CategoriaDb, "id" | "nome">,
  tipoMov: TipoMovimentacao
): Promise<boolean> {
  const [outra] = await db
    .select({ id: categorias.id })
    .from(categorias)
    .where(and(
      eq(categorias.userId, userId),
      ne(categorias.id, categoria.id),
      sql`lower(${categorias.nome}) = ${categoria.nome.toLowerCase()}`,
      inArray(categorias.tipo, [tipoMov, "ambos"]),
    ))
    .limit(1);
  return !!outra;
}

/** Quantas movimentações e recorrências usam essa categoria nesse tipo. */
export async function contarUso(userId: string, nome: string, tipoMov: TipoMovimentacao) {
  const [t] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(transacoes)
    .where(and(
      eq(transacoes.userId, userId),
      eq(transacoes.categoria, nome),
      eq(transacoes.tipo, tipoMov),
    ));

  const [r] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(recorrencias)
    .where(and(
      eq(recorrencias.userId, userId),
      eq(recorrencias.categoria, nome),
      eq(recorrencias.tipo, tipoMov),
    ));

  return { transacoes: t?.total ?? 0, recorrencias: r?.total ?? 0 };
}

/** Devolve a categoria de destino do usuário, criando se ainda não existir. */
export async function garantirCategoriaDestino(userId: string, tipoMov: TipoMovimentacao) {
  const destino = CATEGORIA_DESTINO[tipoMov];

  const [existente] = await db
    .select()
    .from(categorias)
    .where(and(
      eq(categorias.userId, userId),
      inArray(categorias.tipo, [tipoMov, "ambos"]),
      sql`lower(${categorias.nome}) = ${destino.nome.toLowerCase()}`,
    ))
    .limit(1);

  if (existente) return existente;

  const [nova] = await db
    .insert(categorias)
    .values({
      userId,
      nome: destino.nome,
      tipo: tipoMov,
      icone: ICONE_CATEGORIA_DESTINO,
    })
    .returning();

  return nova;
}