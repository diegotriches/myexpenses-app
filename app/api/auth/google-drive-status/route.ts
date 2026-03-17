// src/app/api/auth/google-drive-status/route.ts

/**
 * GET /api/auth/google-drive-status
 * Verifica se o usuário tem o Google Drive autorizado corretamente.
 *
 * Usa refresh_token como critério primário (igual ao cron de backup),
 * com scope como verificação complementar.
 *
 * Retorna:
 * - temContaGoogle:     existe registro na tabela accounts com provider=google
 * - temDriveAutorizado: tem refresh_token E scope drive.file presente
 * - precisaReautorizar: tem Google mas falta refresh_token ou scope do Drive
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

    const [contaGoogle] = await db
      .select({
        scope:         accounts.scope,
        refresh_token: accounts.refresh_token,
        access_token:  accounts.access_token,
      })
      .from(accounts)
      .where(
        and(
          eq(accounts.userId,   userId),
          eq(accounts.provider, "google")
        )
      )
      .limit(1);

    // Sem conta Google vinculada
    if (!contaGoogle) {
      return NextResponse.json({
        temContaGoogle:     false,
        temDriveAutorizado: false,
        precisaReautorizar: false,
      });
    }

    const scope           = contaGoogle.scope || "";
    const temDriveScope   = scope.includes("drive.file") || scope.includes("drive");
    const temRefreshToken = !!contaGoogle.refresh_token;

    // Drive autorizado = tem refresh_token (longa duração) E scope correto
    // O access_token sozinho não basta pois expira em ~1h sem possibilidade de renovação
    const temDriveAutorizado = temRefreshToken && temDriveScope;

    // Precisa reautorizar se tem conta Google mas Drive não está autorizado
    const precisaReautorizar = !temDriveAutorizado;

    return NextResponse.json({
      temContaGoogle:     true,
      temDriveAutorizado,
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