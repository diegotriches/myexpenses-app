// src/app/api/users/me/route.ts

import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getUserId } from "@/lib/auth";

// GET - Buscar dados do usuário logado
export async function GET(req: NextRequest) {
  try {
    // ✅ Verificar autenticação
    const userId = await getUserId();
    
    if (!userId) {
      return NextResponse.json(
        { message: "Não autenticado. Faça login para acessar esta rota." },
        { status: 401 }
      );
    }

    // ✅ Buscar usuário
    const [usuario] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
        emailVerified: users.emailVerified,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!usuario) {
      return NextResponse.json(
        { message: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(usuario);

  } catch (error) {
    console.error("❌ Erro ao buscar usuário:", error);

    return NextResponse.json(
      { message: "Erro ao buscar usuário" },
      { status: 500 }
    );
  }
}