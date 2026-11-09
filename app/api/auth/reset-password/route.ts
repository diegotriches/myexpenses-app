import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";
import bcryptjs from "bcryptjs";
import { sendPasswordChangedEmail } from "@/lib/email";
import { validatePassword } from "@/lib/validators/password";
import { respostaDeErro } from "@/lib/rota";

/**
 * POST /api/auth/reset-password
 * 
 * Redefine a senha do usuário usando token válido
 * 
 * Body:
 * - token: string (obrigatório, token de recuperação)
 * - password: string (obrigatório, nova senha forte)
 * 
 * Fluxo:
 * 1. Valida entrada (token + senha)
 * 2. Valida senha forte (8+ chars, maiúscula, minúscula, número, especial)
 * 3. Busca usuário com token válido (não expirado)
 * 4. Criptografa nova senha
 * 5. Atualiza senha e limpa token
 * 6. Envia email de confirmação
 * 
 * Retorna:
 * - 200: Senha redefinida com sucesso
 * - 400: Validação falhou
 * - 401: Token inválido ou expirado
 * - 500: Erro interno
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, password } = body;

    console.log("🔐 Tentativa de redefinição de senha...");

    // ========================================
    // VALIDAÇÕES DE ENTRADA
    // ========================================
    
    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "Token é obrigatório" },
        { status: 400 }
      );
    }

    // ========================================
    // VALIDAÇÃO DE SENHA FORTE (usando validator)
    // ========================================
    
    const passwordValidation = validatePassword(password);
    
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.error },
        { status: 400 }
      );
    }

    // ========================================
    // BUSCAR USUÁRIO COM TOKEN VÁLIDO
    // ========================================
    
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        resetToken: users.resetToken,
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
      return NextResponse.json(
        { error: "Token inválido ou expirado. Solicite uma nova recuperação de senha." },
        { status: 401 }
      );
    }

    console.log("✅ Token válido para usuário:", user.email);

    // ========================================
    // CRIPTOGRAFAR NOVA SENHA
    // ========================================
    
    const hashedPassword = await bcryptjs.hash(password, 12);

    // ========================================
    // ATUALIZAR SENHA E LIMPAR TOKEN
    // ========================================
    
    await db
      .update(users)
      .set({
        password: hashedPassword,
        resetToken: null, // Limpar token usado
        resetTokenExpiry: null, // Limpar expiração
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    console.log("✅ Senha redefinida com sucesso para:", user.email);

    // ========================================
    // ENVIAR EMAIL DE CONFIRMAÇÃO
    // ========================================
    
    try {
      await sendPasswordChangedEmail(user.email, user.name || "Usuário");
      console.log("✅ Email de confirmação enviado");
    } catch (emailError) {
      console.error("❌ Erro ao enviar email de confirmação:", emailError);
      // Não bloquear o fluxo por erro de email
    }

    return NextResponse.json({
      message: "Senha redefinida com sucesso! Você já pode fazer login.",
      email: user.email,
    });

  } catch (error) {
    return respostaDeErro(error, "Erro ao redefinir senha. Tente novamente.");
  }
}