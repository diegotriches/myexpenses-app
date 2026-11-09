import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { respostaDeErro } from "@/lib/rota";

/**
 * GET /api/auth/verify-reset-token?token=xxx
 * 
 * Verifica se o token de reset é válido
 * Usado pela página /reset-password antes de exibir o formulário
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const token = searchParams.get("token");

    console.log("🔍 Verificando token de reset...");

    // Validação de entrada
    if (!token) {
      return NextResponse.json(
        { 
          valid: false, 
          error: "Token não fornecido" 
        },
        { status: 400 }
      );
    }

    // Buscar usuário com o token E que ainda não expirou
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        resetTokenExpiry: users.resetTokenExpiry,
      })
      .from(users)
      .where(
        and(
          eq(users.resetToken, token),
          gt(users.resetTokenExpiry, new Date()) // Token ainda não expirou
        )
      )
      .limit(1);

    if (!user) {
      console.log("❌ Token inválido ou expirado");
      return NextResponse.json({
        valid: false,
        error: "Token inválido ou expirado. Solicite uma nova recuperação de senha.",
      });
    }

    console.log("✅ Token válido para usuário:", user.email);

    // Calcular tempo restante
    const now = new Date();
    const expiry = new Date(user.resetTokenExpiry!);
    const minutesRemaining = Math.floor((expiry.getTime() - now.getTime()) / 60000);

    return NextResponse.json({
      valid: true,
      email: user.email,
      name: user.name,
      expiresIn: `${minutesRemaining} minutos`,
    });

  } catch (error) {
    return respostaDeErro(error, "Erro ao verificar token");
  }
}