import { NextResponse } from "next/server";
import { db } from "@/db";
import { categorias } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import {
  CATEGORIA_DESTINO,
  ehCategoriaDestino,
  tiposDeMovimentacao,
  outraCategoriaCobre,
  contarUso,
} from "@/utils/categoriaUtils";
import { respostaDeErro } from "@/lib/rota";

/**
 * GET /api/categorias/[id]/uso
 *
 * Só leitura: diz quantas movimentações e recorrências seriam movidas e para
 * qual categoria, se essa categoria fosse excluída agora. Usa as mesmas
 * regras do DELETE (via categoriaUtils), então o que o modal mostra bate
 * com o que de fato vai acontecer.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { id } = await params;

    const [categoria] = await db
      .select()
      .from(categorias)
      .where(and(eq(categorias.id, id), eq(categorias.userId, userId)))
      .limit(1);

    if (!categoria) {
      return NextResponse.json({ error: "Categoria não encontrada" }, { status: 404 });
    }

    if (ehCategoriaDestino(categoria.nome)) {
      return NextResponse.json({
        transacoes: 0,
        recorrencias: 0,
        destinos: [],
        bloqueada: true,
      });
    }

    let transacoes = 0;
    let recorrencias = 0;
    const destinos: string[] = [];

    for (const tipoMov of tiposDeMovimentacao(categoria)) {
      if (await outraCategoriaCobre(userId, categoria, tipoMov)) continue;

      const uso = await contarUso(userId, categoria.nome, tipoMov);
      if (uso.transacoes === 0 && uso.recorrencias === 0) continue;

      transacoes += uso.transacoes;
      recorrencias += uso.recorrencias;
      destinos.push(CATEGORIA_DESTINO[tipoMov].nome);
    }

    return NextResponse.json({ transacoes, recorrencias, destinos, bloqueada: false });
  } catch (err) {
    return respostaDeErro(err, "Erro ao verificar uso da categoria");
  }
}