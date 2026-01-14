import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import bcryptjs from "bcryptjs";
import { eq } from "drizzle-orm";
import { criarDadosIniciaisUsuario } from "@/services/onboardingService";
import { validatePassword } from "@/lib/validators/password";

/**
 * POST /api/auth/register
 * 
 * Registra novo usuário com email/senha
 * 
 * Body:
 * - name: string (obrigatório, min 2 chars)
 * - email: string (obrigatório, formato válido)
 * - password: string (obrigatório, senha forte)
 * 
 * Retorna:
 * - 201: Usuário criado com sucesso
 * - 400: Validação falhou
 * - 409: Email já cadastrado
 * - 500: Erro interno
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, password } = body;

    console.log("📝 Tentativa de registro:", email);

    // ========================================
    // VALIDAÇÃO DE CAMPOS OBRIGATÓRIOS
    // ========================================
    
    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Nome é obrigatório" },
        { status: 400 }
      );
    }

    if (name.trim().length < 2) {
      return NextResponse.json(
        { error: "Nome deve ter pelo menos 2 caracteres" },
        { status: 400 }
      );
    }

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email é obrigatório" },
        { status: 400 }
      );
    }

    // ========================================
    // VALIDAÇÃO DE EMAIL
    // ========================================
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Email inválido" },
        { status: 400 }
      );
    }

    const emailLowerCase = email.toLowerCase().trim();

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
    // VERIFICAR SE USUÁRIO JÁ EXISTE
    // ========================================
    
    const [existingUser] = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.email, emailLowerCase))
      .limit(1);

    if (existingUser) {
      console.log("⚠️ Email já cadastrado:", emailLowerCase);
      return NextResponse.json(
        { error: "Este email já está cadastrado. Faça login ou recupere sua senha." },
        { status: 409 }
      );
    }

    // ========================================
    // CRIAR HASH DA SENHA
    // ========================================
    
    const hashedPassword = await bcryptjs.hash(password, 12);

    // ========================================
    // CRIAR USUÁRIO NO BANCO
    // ========================================
    
    const [newUser] = await db
      .insert(users)
      .values({
        name: name.trim(),
        email: emailLowerCase,
        password: hashedPassword,
      })
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
      });

    console.log("✅ Usuário criado:", newUser.email);

    // ========================================
    // CRIAR DADOS INICIAIS (ONBOARDING)
    // ========================================
    
    try {
      await criarDadosIniciaisUsuario(newUser.id);
      console.log("✅ Onboarding concluído para:", newUser.email);
    } catch (onboardingError) {
      console.error("❌ Erro no onboarding (não bloqueia registro):", onboardingError);
      // Não bloquear registro se onboarding falhar
    }

    // ========================================
    // RETORNAR SUCESSO
    // ========================================
    
    return NextResponse.json(
      {
        message: "Conta criada com sucesso! Você já pode fazer login.",
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
        },
      },
      { status: 201 }
    );

  } catch (error) {
    console.error("❌ Erro ao registrar usuário:", error);
    
    return NextResponse.json(
      { error: "Erro ao criar conta. Tente novamente mais tarde." },
      { status: 500 }
    );
  }
}