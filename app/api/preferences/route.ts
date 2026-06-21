// src/app/api/preferences/route.ts

import { db } from "@/db";
import { preferences } from "@/db/schema";
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getUserId } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ message: "Não autenticado" }, { status: 401 });
    }

    const [userPreferences] = await db
      .select()
      .from(preferences)
      .where(eq(preferences.userId, userId))
      .limit(1);

    if (!userPreferences) {
      const [novaPreferencia] = await db
        .insert(preferences)
        .values({
          userId,
          tema: "system",
          idioma: "pt-BR",
          moeda: "BRL",
          notificacoes: true,
          formatoData: "DD/MM/YYYY",
          inicioSemana: "domingo",
          backupAutomatico: true,
        })
        .returning();

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

export async function PUT(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ message: "Não autenticado" }, { status: 401 });
    }

    const body = await req.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json({ message: "Dados inválidos" }, { status: 400 });
    }

    if (body.tema && !["light", "dark", "system"].includes(body.tema)) {
      return NextResponse.json(
        { message: "Tema inválido. Use: light, dark ou system" },
        { status: 400 }
      );
    }

    if (body.formatoData && !["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"].includes(body.formatoData)) {
      return NextResponse.json({ message: "Formato de data inválido" }, { status: 400 });
    }

    if (body.inicioSemana && !["domingo", "segunda"].includes(body.inicioSemana)) {
      return NextResponse.json(
        { message: "Início de semana inválido. Use: domingo ou segunda" },
        { status: 400 }
      );
    }

    // ✅ NOVO: valida backupAutomatico
    if (body.backupAutomatico !== undefined && typeof body.backupAutomatico !== "boolean") {
      return NextResponse.json(
        { message: "backupAutomatico deve ser um valor booleano (true/false)" },
        { status: 400 }
      );
    }

    // Remove campo removido do schema caso venha no body
    delete body.notificacoesEmail;

    const [existing] = await db
      .select()
      .from(preferences)
      .where(eq(preferences.userId, userId))
      .limit(1);

    let atualizado;

    if (!existing) {
      [atualizado] = await db
        .insert(preferences)
        .values({ userId, ...body })
        .returning();
    } else {
      [atualizado] = await db
        .update(preferences)
        .set({ ...body, updatedAt: new Date() })
        .where(eq(preferences.userId, userId))
        .returning();
    }

    if (!atualizado) {
      return NextResponse.json({ message: "Erro ao atualizar preferências" }, { status: 500 });
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

export async function DELETE(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ message: "Não autenticado" }, { status: 401 });
    }

    await db.delete(preferences).where(eq(preferences.userId, userId));

    const [novaPreferencia] = await db
      .insert(preferences)
      .values({
        userId,
        tema: "system",
        idioma: "pt-BR",
        moeda: "BRL",
        notificacoes: true,
        formatoData: "DD/MM/YYYY",
        inicioSemana: "domingo",
        backupAutomatico: true,
      })
      .returning();

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