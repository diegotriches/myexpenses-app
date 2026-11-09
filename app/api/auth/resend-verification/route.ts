// src/app/api/auth/resend-verification/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, verificationTokens } from "@/db/schema";
import { eq } from "drizzle-orm";
import { sendVerificationEmail } from "@/lib/email";
import crypto from "crypto";
import { respostaDeErro } from "@/lib/rota";

/**
 * POST /api/auth/resend-verification
 *
 * Reenvia o e-mail de verificação para o usuário.
 * Gera um novo token, invalida o anterior e envia o e-mail.
 *
 * Body: { email: string }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: "E-mail é obrigatório" },
        { status: 400 }
      );
    }

    const emailLower = email.toLowerCase().trim();

    // Busca o usuário
    const [usuario] = await db
      .select()
      .from(users)
      .where(eq(users.email, emailLower))
      .limit(1);

    // Resposta genérica para não vazar informação sobre e-mails cadastrados
    if (!usuario) {
      return NextResponse.json({
        message: "Se esse e-mail estiver cadastrado, você receberá um novo link em breve.",
      });
    }

    // Se já verificado, não faz nada
    if (usuario.emailVerified) {
      return NextResponse.json({
        message: "Este e-mail já foi verificado. Faça login normalmente.",
      });
    }

    // Remove tokens anteriores para esse e-mail
    await db
      .delete(verificationTokens)
      .where(eq(verificationTokens.identifier, emailLower));

    // Gera novo token
    const token   = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    await db.insert(verificationTokens).values({
      identifier: emailLower,
      token,
      expires,
    });

    // Envia o e-mail
    await sendVerificationEmail(emailLower, usuario.name ?? "Usuário", token);

    return NextResponse.json({
      message: "Se esse e-mail estiver cadastrado, você receberá um novo link em breve.",
    });
  } catch (error) {
    return respostaDeErro(error, "Erro ao reenviar e-mail. Tente novamente.");
  }
}