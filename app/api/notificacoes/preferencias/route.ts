// src/app/api/notificacoes/preferencias/route.ts

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { preferenciasNotificacao } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import type { PreferenciasNotificacao } from "@/types/notificacao";

/**
 * GET /api/notificacoes/preferencias
 * Busca preferências de notificação do usuário
 * Cria preferências padrão se não existirem
 */
export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // Buscar preferências existentes
    let [prefs] = await db
      .select()
      .from(preferenciasNotificacao)
      .where(eq(preferenciasNotificacao.userId, userId))
      .limit(1);

    // Criar preferências padrão se não existirem
    if (!prefs) {
      [prefs] = await db
        .insert(preferenciasNotificacao)
        .values({
          userId,
          faturas: true,
          limiteCartao: true,
          saldoBaixo: true,
          transacoesAltas: false,
          emailNotificacoes: false,
          diasAntesVencimento: 3,
          limiteMinimoConta: 100,
        })
        .returning();
    }

    return NextResponse.json(prefs);
  } catch (error: any) {
    console.error("Erro ao buscar preferências:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao buscar preferências" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/notificacoes/preferencias
 * Atualiza preferências de notificação do usuário
 */
export async function PUT(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const body: Partial<PreferenciasNotificacao> = await req.json();

    // Remover campos que não devem ser atualizados
    delete (body as any).id;
    delete (body as any).userId;
    delete (body as any).createdAt;

    // Adicionar timestamp de atualização
    const dados = {
      ...body,
      updatedAt: new Date(),
    };

    // Buscar preferências existentes
    const [existing] = await db
      .select()
      .from(preferenciasNotificacao)
      .where(eq(preferenciasNotificacao.userId, userId))
      .limit(1);

    let result;

    if (existing) {
      // Atualizar existente
      [result] = await db
        .update(preferenciasNotificacao)
        .set(dados)
        .where(eq(preferenciasNotificacao.userId, userId))
        .returning();
    } else {
      // Criar novo
      [result] = await db
        .insert(preferenciasNotificacao)
        .values({
          userId,
          ...dados,
        })
        .returning();
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Erro ao atualizar preferências:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao atualizar preferências" },
      { status: 500 }
    );
  }
}