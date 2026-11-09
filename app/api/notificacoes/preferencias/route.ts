import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { preferenciasNotificacao } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import type { PreferenciasNotificacao } from "@/types/notificacao";
import { respostaDeErro } from "@/lib/rota";

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    let [prefs] = await db
      .select()
      .from(preferenciasNotificacao)
      .where(eq(preferenciasNotificacao.userId, userId))
      .limit(1);

    if (!prefs) {
      [prefs] = await db
        .insert(preferenciasNotificacao)
        .values({
          userId,
          faturas: true,
          limiteCartao: true,
          saldoBaixo: true,
          transacoesAltas: false,
          diasAntesVencimento: 3,
          limiteMinimoConta: 100,
        })
        .returning();
    }

    return NextResponse.json(prefs);
  } catch (error) {
    return respostaDeErro(error, "Erro ao buscar preferências");
  }
}

export async function PUT(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const body: Partial<PreferenciasNotificacao> = await req.json();

    if (body.diasAntesVencimento !== undefined) {
      const dias = Number(body.diasAntesVencimento);
      if (isNaN(dias) || dias < 1 || dias > 30) {
        return NextResponse.json(
          { error: "diasAntesVencimento deve ser entre 1 e 30" },
          { status: 400 }
        );
      }
    }

    if (body.limiteMinimoConta !== undefined) {
      const limite = Number(body.limiteMinimoConta);
      if (isNaN(limite) || limite < 0) {
        return NextResponse.json(
          { error: "limiteMinimoConta deve ser maior ou igual a 0" },
          { status: 400 }
        );
      }
    }

    const camposBooleanos: (keyof PreferenciasNotificacao)[] = [
      'faturas',
      'limiteCartao',
      'saldoBaixo',
      'transacoesAltas',
    ];

    for (const campo of camposBooleanos) {
      if (body[campo] !== undefined && typeof body[campo] !== 'boolean') {
        return NextResponse.json(
          { error: `${campo} deve ser um valor booleano (true/false)` },
          { status: 400 }
        );
      }
    }

    delete (body as any).id;
    delete (body as any).userId;
    delete (body as any).createdAt;

    const dados = { ...body, updatedAt: new Date() };

    const [existing] = await db
      .select()
      .from(preferenciasNotificacao)
      .where(eq(preferenciasNotificacao.userId, userId))
      .limit(1);

    let result;

    if (existing) {
      [result] = await db
        .update(preferenciasNotificacao)
        .set(dados)
        .where(eq(preferenciasNotificacao.userId, userId))
        .returning();
    } else {
      [result] = await db
        .insert(preferenciasNotificacao)
        .values({
          userId,
          faturas: true,
          limiteCartao: true,
          saldoBaixo: true,
          transacoesAltas: false,
          diasAntesVencimento: 3,
          limiteMinimoConta: 100,
          ...dados,
        })
        .returning();
    }

    return NextResponse.json(result);
  } catch (error) {
    return respostaDeErro(error, "Erro ao atualizar preferências");
  }
}