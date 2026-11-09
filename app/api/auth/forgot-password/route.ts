import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { sendPasswordResetEmail } from "@/lib/email";

/**
 * POST /api/auth/forgot-password
 * 
 * Solicita recuperação de senha
 * 
 * Body:
 * - email: string (obrigatório, formato válido)
 * 
 * Fluxo:
 * 1. Valida formato do email
 * 2. Busca usuário no banco
 * 3. Gera token único e seguro (32 bytes)
 * 4. Define expiração (1 hora)
 * 5. Salva token no banco
 * 6. Envia email com link de recuperação
 * 
 * Segurança:
 * - SEMPRE retorna sucesso (não revela se email existe)
 * - Previne enumeração de usuários
 * - Token expira em 1 hora
 * - Token é único e criptograficamente seguro
 * 
 * Retorna:
 * - 200: Mensagem genérica de sucesso (sempre)
 * - 400: E-mail inválido ou não fornecido
 * - 500: Erro interno
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    console.log("🔐 Solicitação de recuperação de senha:", email);

    // ========================================
    // VALIDAÇÃO DE ENTRADA
    // ========================================
    
    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email é obrigatório" },
        { status: 400 }
      );
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "E-mail inválido" },
        { status: 400 }
      );
    }

    const emailLowerCase = email.toLowerCase().trim();

    // ========================================
    // BUSCAR USUÁRIO NO BANCO
    // ========================================
    
    const [user] = await db
      .select({ 
        id: users.id, 
        email: users.email,
        name: users.name 
      })
      .from(users)
      .where(eq(users.email, emailLowerCase))
      .limit(1);

    // ⚠️ IMPORTANTE: Por segurança, SEMPRE retornar sucesso
    // Não revelar se o email existe ou não (evita enumeração de usuários)
    if (!user) {
      console.log("⚠️ Email não encontrado (não revelado ao usuário):", emailLowerCase);
      return NextResponse.json({ 
        message: "Se o email estiver cadastrado, você receberá instruções para redefinir sua senha." 
      });
    }

    // ========================================
    // GERAR TOKEN ÚNICO E SEGURO
    // ========================================
    
    const resetToken = crypto.randomBytes(32).toString("hex");
    
    // Token expira em 1 hora
    const resetTokenExpiry = new Date();
    resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 1);

    console.log("🔑 Token gerado:", resetToken.substring(0, 10) + "...");
    console.log("⏰ Expira em:", resetTokenExpiry.toLocaleString("pt-BR"));

    // ========================================
    // SALVAR TOKEN NO BANCO
    // ========================================
    
    await db
      .update(users)
      .set({
        resetToken,
        resetTokenExpiry,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    console.log("✅ Token salvo no banco");

    // ========================================
    // ENVIAR EMAIL COM LINK DE RECUPERAÇÃO
    // ========================================
    
    try {
      await sendPasswordResetEmail(user.email, user.name || "Usuário", resetToken);
      console.log("✅ Email de recuperação enviado com sucesso");
    } catch (emailError) {
      console.error("❌ Erro ao enviar email:", emailError);
      // Não revelar erro de email ao usuário (segurança)
    }

    // ========================================
    // RETORNAR SUCESSO GENÉRICO
    // ========================================
    
    return NextResponse.json({
      message: "Se o email estiver cadastrado, você receberá instruções para redefinir sua senha.",
    });

  } catch (error) {
    console.error("❌ Erro ao processar recuperação de senha:", error);
    return NextResponse.json(
      { error: "Erro ao processar solicitação. Tente novamente." },
      { status: 500 }
    );
  }
}