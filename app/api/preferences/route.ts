// src/app/api/preferences/route.ts

import { db } from "@/db";
import { preferences } from "@/db/schema";
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import type { BackupFrequencia } from "@/types/preferences";

const FREQUENCIAS_VALIDAS: BackupFrequencia[] = ["diario", "semanal", "mensal"];

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
          tema:              "system",
          idioma:            "pt-BR",
          moeda:             "BRL",
          notificacoes:      true,
          formatoData:       "DD/MM/YYYY",
          inicioSemana:      "domingo",
          backupAutomatico:  true,
          backupFrequencia:  "semanal",
          backupDiaSemana:   0,
          backupDiaMes:      1,
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

    // ── Validações ────────────────────────────────────────────────────────────

    if (body.tema && !["light", "dark", "system"].includes(body.tema)) {
      return NextResponse.json({ message: "Tema inválido. Use: light, dark ou system" }, { status: 400 });
    }

    if (body.formatoData && !["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"].includes(body.formatoData)) {
      return NextResponse.json({ message: "Formato de data inválido" }, { status: 400 });
    }

    if (body.inicioSemana && !["domingo", "segunda"].includes(body.inicioSemana)) {
      return NextResponse.json({ message: "Início de semana inválido. Use: domingo ou segunda" }, { status: 400 });
    }

    if (body.backupAutomatico !== undefined && typeof body.backupAutomatico !== "boolean") {
      return NextResponse.json({ message: "backupAutomatico deve ser um booleano" }, { status: 400 });
    }

    if (body.backupFrequencia !== undefined && !FREQUENCIAS_VALIDAS.includes(body.backupFrequencia)) {
      return NextResponse.json(
        { message: `backupFrequencia inválida. Use: ${FREQUENCIAS_VALIDAS.join(", ")}` },
        { status: 400 }
      );
    }

    if (body.backupDiaSemana !== undefined) {
      const dia = Number(body.backupDiaSemana);
      if (!Number.isInteger(dia) || dia < 0 || dia > 6) {
        return NextResponse.json({ message: "backupDiaSemana deve ser um número entre 0 (domingo) e 6 (sábado)" }, { status: 400 });
      }
    }

    if (body.backupDiaMes !== undefined) {
      const dia = Number(body.backupDiaMes);
      if (!Number.isInteger(dia) || dia < 1 || dia > 31) {
        return NextResponse.json({ message: "backupDiaMes deve ser um número entre 1 e 31" }, { status: 400 });
      }
    }

    // Remove campos que não devem ser atualizados diretamente
    delete body.id;
    delete body.userId;
    delete body.createdAt;
    delete body.ultimoBackupEm; // atualizado apenas pelo cron

    const dados = { ...body, updatedAt: new Date() };

    const [existing] = await db
      .select()
      .from(preferences)
      .where(eq(preferences.userId, userId))
      .limit(1);

    let resultado;

    if (!existing) {
      [resultado] = await db
        .insert(preferences)
        .values({
          userId,
          tema:             "system",
          idioma:           "pt-BR",
          moeda:            "BRL",
          notificacoes:     true,
          formatoData:      "DD/MM/YYYY",
          inicioSemana:     "domingo",
          backupAutomatico: true,
          backupFrequencia: "semanal",
          backupDiaSemana:  0,
          backupDiaMes:     1,
          ...dados,
        })
        .returning();
    } else {
      [resultado] = await db
        .update(preferences)
        .set(dados)
        .where(eq(preferences.userId, userId))
        .returning();
    }

    if (!resultado) {
      return NextResponse.json({ message: "Erro ao atualizar preferências" }, { status: 500 });
    }

    return NextResponse.json(resultado);
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
        tema:             "system",
        idioma:           "pt-BR",
        moeda:            "BRL",
        notificacoes:     true,
        formatoData:      "DD/MM/YYYY",
        inicioSemana:     "domingo",
        backupAutomatico: true,
        backupFrequencia: "semanal",
        backupDiaSemana:  0,
        backupDiaMes:     1,
      })
      .returning();

    return NextResponse.json({
      message:     "Preferências restauradas ao padrão",
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