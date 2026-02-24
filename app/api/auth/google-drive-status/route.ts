// src/app/api/auth/google-drive-status/route.ts

/**
 * GET /api/auth/google-drive-status
 * Verifica se o usuário tem o Google Drive autorizado corretamente
 *
 * Retorna:
 * - temContaGoogle: se existe registro na tabela accounts com provider=google
 * - temDriveAutorizado: se o scope drive.file está presente
 * - precisaReautorizar: tem Google mas sem o scope do Drive (fez login antes da feature)
 */

import { NextResponse } from "next/server";
import { db } from "@/db";
import { accounts } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getUserId } from "@/lib/auth";

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // Busca conta Google na tabela accounts do NextAuth
    const [contaGoogle] = await db
      .select({
        scope: accounts.scope,
        refresh_token: accounts.refresh_token,
      })
      .from(accounts)
      .where(
        and(
          eq(accounts.userId, userId),
          eq(accounts.provider, "google")
        )
      )
      .limit(1);

    // Sem conta Google vinculada
    if (!contaGoogle) {
      return NextResponse.json({
        temContaGoogle: false,
        temDriveAutorizado: false,
        precisaReautorizar: false,
      });
    }

    const scope = contaGoogle.scope || "";
    const temDriveScope = scope.includes("drive.file") || scope.includes("drive");
    const temRefreshToken = !!contaGoogle.refresh_token;

    // Tem Google mas falta o scope do Drive ou o refresh_token
    // (usuário fez login antes da feature ser adicionada)
    const precisaReautorizar = !temDriveScope || !temRefreshToken;

    return NextResponse.json({
      temContaGoogle: true,
      temDriveAutorizado: temDriveScope && temRefreshToken,
      precisaReautorizar,
    });
  } catch (error: any) {
    console.error("[google-drive-status] Erro:", error.message);
    return NextResponse.json(
      { error: "Erro ao verificar status do Drive" },
      { status: 500 }
    );
  }
}