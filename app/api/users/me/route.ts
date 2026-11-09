import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getUserId } from "@/lib/auth";
import { respostaDeErro } from "@/lib/rota";

export async function GET() {
  try {
    const userId = await getUserId();

    if (!userId) {
      return NextResponse.json(
        { message: "Não autenticado. Faça login para acessar esta rota." },
        { status: 401 }
      );
    }

    const [usuario] = await db
      .select({
        id:            users.id,
        name:          users.name,
        email:         users.email,
        image:         users.image,
        emailVerified: users.emailVerified,
        createdAt:     users.createdAt,
        // ✅ NOVO: inclui password apenas para derivar hasPassword —
        // não é exposto diretamente na resposta
        password:      users.password,
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

    // ✅ Remove password do objeto e expõe hasPassword no lugar
    const { password, ...resto } = usuario;

    return NextResponse.json({
      ...resto,
      hasPassword: !!password,
    });
  } catch (error) {
    return respostaDeErro(error, "Erro ao buscar usuário");
  }
}