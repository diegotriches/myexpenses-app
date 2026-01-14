// src/app/api/preferences/route.ts

import { db } from "@/db";
import { preferences } from "@/db/schema";
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getUserId } from "@/lib/auth";

// GET - Buscar preferências do usuário
export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId();

    if (!userId) {
      return NextResponse.json(
        { message: "Não autenticado" },
        { status: 401 }
      );
    }

    // Buscar preferências existentes
    const [userPreferences] = await db
      .select()
      .from(preferences)
      .where(eq(preferences.userId, userId))
      .limit(1);

    // Se não existir, criar preferências padrão
    if (!userPreferences) {
      const [novaPreferencia] = await db
        .insert(preferences)
        .values({
          userId,
          tema: "system",
          idioma: "pt-BR",
          moeda: "BRL",
          notificacoes: true,
          notificacoesEmail: false,
          formatoData: "DD/MM/YYYY",
          inicioSemana: "domingo",
        })
        .returning();

      console.log("✅ Preferências padrão criadas para usuário:", userId);
      return NextResponse.json(novaPreferencia);
    }

    return NextResponse.json(userPreferences);
  } catch (err: any) {
    console.error("❌ Erro ao buscar preferências:", err);
    return NextResponse.json(
      { message: err.message || "Erro ao buscar preferências" },
      { status: 500 }
    );
  }
}

// PUT - Atualizar preferências
export async function PUT(req: NextRequest) {
  try {
    const userId = await getUserId();

    if (!userId) {
      return NextResponse.json(
        { message: "Não autenticado" },
        { status: 401 }
      );
    }

    const body = await req.json();

    // Validação básica
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { message: "Dados inválidos" },
        { status: 400 }
      );
    }

    // Validar campos específicos se fornecidos
    if (body.tema && !["light", "dark", "system"].includes(body.tema)) {
      return NextResponse.json(
        { message: "Tema inválido. Use: light, dark ou system" },
        { status: 400 }
      );
    }

    if (body.formatoData && !["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"].includes(body.formatoData)) {
      return NextResponse.json(
        { message: "Formato de data inválido" },
        { status: 400 }
      );
    }

    if (body.inicioSemana && !["domingo", "segunda"].includes(body.inicioSemana)) {
      return NextResponse.json(
        { message: "Início de semana inválido. Use: domingo ou segunda" },
        { status: 400 }
      );
    }

    // Verificar se preferências existem
    const [existing] = await db
      .select()
      .from(preferences)
      .where(eq(preferences.userId, userId))
      .limit(1);

    let atualizado;

    if (!existing) {
      // Criar se não existir
      [atualizado] = await db
        .insert(preferences)
        .values({
          userId,
          ...body,
        })
        .returning();

      console.log("✅ Preferências criadas para usuário:", userId);
    } else {
      // Atualizar se existir
      [atualizado] = await db
        .update(preferences)
        .set({
          ...body,
          updatedAt: new Date(),
        })
        .where(eq(preferences.userId, userId))
        .returning();

      console.log("✅ Preferências atualizadas para usuário:", userId);
    }

    if (!atualizado) {
      return NextResponse.json(
        { message: "Erro ao atualizar preferências" },
        { status: 500 }
      );
    }

    return NextResponse.json(atualizado);
  } catch (err: any) {
    console.error("❌ Erro ao atualizar preferências:", err);
    return NextResponse.json(
      { message: err.message || "Erro ao atualizar preferências" },
      { status: 500 }
    );
  }
}

// DELETE - Deletar preferências (restaura para padrão)
export async function DELETE(req: NextRequest) {
  try {
    const userId = await getUserId();

    if (!userId) {
      return NextResponse.json(
        { message: "Não autenticado" },
        { status: 401 }
      );
    }

    // Deletar preferências existentes
    await db
      .delete(preferences)
      .where(eq(preferences.userId, userId));

    // Recriar com valores padrão
    const [novaPreferencia] = await db
      .insert(preferences)
      .values({
        userId,
        tema: "system",
        idioma: "pt-BR",
        moeda: "BRL",
        notificacoes: true,
        notificacoesEmail: false,
        formatoData: "DD/MM/YYYY",
        inicioSemana: "domingo",
      })
      .returning();

    console.log("✅ Preferências resetadas para usuário:", userId);

    return NextResponse.json({
      message: "Preferências restauradas ao padrão",
      preferences: novaPreferencia,
    });
  } catch (err: any) {
    console.error("❌ Erro ao deletar preferências:", err);
    return NextResponse.json(
      { message: err.message || "Erro ao deletar preferências" },
      { status: 500 }
    );
  }
}