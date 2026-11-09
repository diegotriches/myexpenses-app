// src/app/api/auth/register/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, verificationTokens } from "@/db/schema";
import bcryptjs from "bcryptjs";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { criarDadosIniciaisUsuario } from "@/services/onboardingService";
import { validatePassword } from "@/lib/validators/password";
import { sendVerificationEmail } from "@/lib/email";
import { respostaDeErro } from "@/lib/rota";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, password } = body;

    // ── Validações ────────────────────────────────────────────────────────────

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json(
        { error: "Nome deve ter pelo menos 2 caracteres" },
        { status: 400 }
      );
    }

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email é obrigatório" }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "E-mail inválido" }, { status: 400 });
    }

    const emailLower = email.toLowerCase().trim();

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.error },
        { status: 400 }
      );
    }

    // ── Verificar e-mail duplicado ────────────────────────────────────────────

    const [existingUser] = await db
      .select({ id: users.id, emailVerified: users.emailVerified })
      .from(users)
      .where(eq(users.email, emailLower))
      .limit(1);

    if (existingUser) {
      // ✅ Se existir mas não verificado, reenvia o e-mail em vez de bloquear
      if (!existingUser.emailVerified) {
        // Remove token anterior e gera novo
        await db
          .delete(verificationTokens)
          .where(eq(verificationTokens.identifier, emailLower));

        const token   = crypto.randomBytes(32).toString("hex");
        const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

        await db.insert(verificationTokens).values({
          identifier: emailLower,
          token,
          expires,
        });

        const [user] = await db
          .select({ name: users.name })
          .from(users)
          .where(eq(users.id, existingUser.id))
          .limit(1);

        await sendVerificationEmail(emailLower, user?.name ?? "Usuário", token)
          .catch((err) => console.error("Erro ao reenviar verificação:", err));

        return NextResponse.json(
          {
            error:     "Este e-mail já está cadastrado mas não foi verificado. " +
                       "Enviamos um novo link de verificação para sua caixa de entrada.",
            needsVerification: true,
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: "Este email já está cadastrado. Faça login ou recupere sua senha." },
        { status: 409 }
      );
    }

    // ── Criar usuário ─────────────────────────────────────────────────────────

    const hashedPassword = await bcryptjs.hash(password, 12);

    const [newUser] = await db
      .insert(users)
      .values({
        name:     name.trim(),
        email:    emailLower,
        password: hashedPassword,
        // emailVerified permanece null até o usuário clicar no link
      })
      .returning({ id: users.id, name: users.name, email: users.email });

    console.log("✅ Usuário criado:", newUser.email);

    // ── Onboarding ────────────────────────────────────────────────────────────

    try {
      await criarDadosIniciaisUsuario(newUser.id);
    } catch (err) {
      console.error("❌ Erro no onboarding (não bloqueia registro):", err);
    }

    // ── Gerar token de verificação e enviar e-mail ────────────────────────────

    const token   = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    await db.insert(verificationTokens).values({
      identifier: emailLower,
      token,
      expires,
    });

    // Envia em background — não bloqueia a resposta se falhar
    sendVerificationEmail(emailLower, newUser.name ?? "Usuário", token)
      .then(() => console.log("✅ E-mail de verificação enviado:", emailLower))
      .catch((err) => console.error("❌ Erro ao enviar e-mail de verificação:", err));

    return NextResponse.json(
      {
        message: "Conta criada! Verifique sua caixa de entrada para ativar sua conta.",
        user: { id: newUser.id, name: newUser.name, email: newUser.email },
      },
      { status: 201 }
    );
  } catch (error) {
    return respostaDeErro(error, "Erro ao criar conta. Tente novamente mais tarde.");
  }
}