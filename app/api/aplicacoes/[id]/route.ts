import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { aplicacoes } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import { respostaDeErro } from "@/lib/rota";
import { ehTipoAplicacao, indexadoresDoTipo, TIPO_APLICACAO_LABEL } from "@/utils/tipoAplicacao";
import { INDEXADOR_LABEL, type Indexador } from "@/utils/tesouroUtils";

/**
 * Define (ou troca) o tipo do produto: CDB, LCI, Tesouro Direto... Só o tipo
 * muda: o cálculo depende do indexador, e a tributação cadastrada continua a
 * mesma. O tipo precisa aceitar o indexador da aplicação.
 */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { id } = await context.params;
    const { tipo }: Partial<Record<"tipo", unknown>> = await req.json();
    if (!ehTipoAplicacao(tipo))
      return NextResponse.json({ error: "Escolha o tipo da aplicação" }, { status: 400 });

    const [aplicacao] = await db.select().from(aplicacoes)
      .where(and(eq(aplicacoes.id, id), eq(aplicacoes.userId, userId))).limit(1);
    if (!aplicacao) return NextResponse.json({ error: "Aplicação não encontrada" }, { status: 404 });

    if (!(indexadoresDoTipo(tipo) as string[]).includes(aplicacao.indexador)) {
      const indexador = INDEXADOR_LABEL[aplicacao.indexador as Indexador] ?? aplicacao.indexador;
      return NextResponse.json(
        { error: `${TIPO_APLICACAO_LABEL[tipo]} não combina com o indexador desta aplicação (${indexador})` },
        { status: 400 },
      );
    }

    const [atualizada] = await db.update(aplicacoes)
      .set({ tipo, updatedAt: new Date() })
      .where(eq(aplicacoes.id, aplicacao.id))
      .returning();

    return NextResponse.json(atualizada);
  } catch (error) {
    return respostaDeErro(error, "Erro ao definir o tipo da aplicação");
  }
}
