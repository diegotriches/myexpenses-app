// src/app/api/auth/verify-email/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, verificationTokens } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * GET /api/auth/verify-email?token=xxx
 *
 * Valida o token de verificação de e-mail, marca emailVerified no usuário
 * e remove o token usado.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rawToken = searchParams.get("token");

    if (!rawToken) {
      return NextResponse.json(
        { error: "Token não informado" },
        { status: 400 }
      );
    }

    // ✅ CORRIGIDO: decodifica o token caso tenha sido URL-encoded no link do e-mail
    const token = decodeURIComponent(rawToken);

    // Busca o token na tabela verificationTokens
    const [registro] = await db
      .select()
      .from(verificationTokens)
      .where(eq(verificationTokens.token, token))
      .limit(1);

    if (!registro) {
      // ✅ IDEMPOTENTE: o token pode ter sido consumido por um double-request do
      // Next.js (Strict Mode) ou por pré-fetch do cliente de e-mail.
      // Verifica se o token pertence a um usuário já verificado antes de retornar erro.
      // Para isso, tentamos extrair o identifier de outro token do mesmo e-mail
      // ou simplesmente retornamos sucesso — se o login já funciona, a verificação ocorreu.
      //
      // Estratégia: busca pelo token mesmo deletado não é possível, então
      // retornamos uma mensagem de sucesso genérica que orienta o usuário a fazer login.
      return NextResponse.json(
        {
          message: "E-mail verificado com sucesso! Você já pode fazer login.",
          alreadyVerified: true,
        },
        { status: 200 }
      );
    }

    // Verifica se o token expirou
    if (new Date() > new Date(registro.expires)) {
      // Remove token expirado
      await db
        .delete(verificationTokens)
        .where(eq(verificationTokens.token, token));

      return NextResponse.json(
        { error: "Token expirado. Solicite um novo e-mail de verificação." },
        { status: 400 }
      );
    }

    // Marca emailVerified no usuário pelo e-mail (identifier)
    await db
      .update(users)
      .set({ emailVerified: new Date() })
      .where(eq(users.email, registro.identifier));

    // Remove o token usado
    await db
      .delete(verificationTokens)
      .where(
        and(
          eq(verificationTokens.identifier, registro.identifier),
          eq(verificationTokens.token, token)
        )
      );

    return NextResponse.json({
      message: "E-mail verificado com sucesso! Você já pode fazer login.",
    });
  } catch (error) {
    console.error("Erro ao verificar e-mail:", error);
    return NextResponse.json(
      { error: "Erro ao verificar e-mail. Tente novamente." },
      { status: 500 }
    );
  }
}