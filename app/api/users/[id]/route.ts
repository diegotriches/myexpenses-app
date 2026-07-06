// src/app/api/users/[id]/route.ts

import { db } from "@/db";
import { users } from "@/db/schema";
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { getUserId, authOptions } from "@/lib/auth";

// Janela de reautenticação OAuth aceita (5 minutos)
const OAUTH_REAUTH_WINDOW_SEGUNDOS = 5 * 60;

// PUT - Atualizar perfil (nome/email)
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // ✅ 1. Verificar autenticação
    const userId = await getUserId();
    
    if (!userId) {
      return NextResponse.json(
        { message: "Não autenticado" },
        { status: 401 }
      );
    }

    // ✅ 2. Obter ID da URL
    const params = await context.params;
    const targetId = params.id;

    // ✅ 3. Verificar ownership
    if (userId !== targetId) {
      return NextResponse.json(
        { message: "Você não tem permissão para editar outro usuário" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, email } = body;

    // ✅ 4. Validar entrada
    if (!name || name.trim().length < 2) {
      return NextResponse.json(
        { message: "Nome deve ter ao menos 2 caracteres" },
        { status: 400 }
      );
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { message: "Email inválido" },
        { status: 400 }
      );
    }

    // ✅ 5. Verificar se email já existe (para outro usuário)
    const emailNormalizado = email.toLowerCase().trim();
    const [emailExistente] = await db
      .select()
      .from(users)
      .where(eq(users.email, emailNormalizado))
      .limit(1);

    if (emailExistente && emailExistente.id !== userId) {
      return NextResponse.json(
        { message: "Este email já está em uso" },
        { status: 409 }
      );
    }

    // ✅ 6. Atualizar apenas campos permitidos
    const [atualizado] = await db
      .update(users)
      .set({
        name: name.trim(),
        email: emailNormalizado,
      })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
        emailVerified: users.emailVerified,
        createdAt: users.createdAt,
      });

    if (!atualizado) {
      return NextResponse.json(
        { message: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(atualizado);
  } catch (err: any) {
    console.error("❌ Erro ao atualizar usuário:", err);
    return NextResponse.json(
      { message: "Erro ao atualizar usuário" },
      { status: 500 }
    );
  }
}

// DELETE - Deletar conta
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Verificar autenticação
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ message: "Não autenticado" }, { status: 401 });
    }
 
    // 2. Obter ID da URL
    const params   = await context.params;
    const targetId = params.id;
 
    // 3. Verificar ownership
    if (userId !== targetId) {
      return NextResponse.json(
        { message: "Você não tem permissão para deletar outro usuário" },
        { status: 403 }
      );
    }
 
    // 4. Buscar usuário
    const [usuario] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
 
    if (!usuario) {
      return NextResponse.json({ message: "Usuário não encontrado" }, { status: 404 });
    }
 
    // 5. Verificação de identidade baseada no tipo de conta
    if (usuario.password) {
      // ── Usuário com senha (Credentials) ──────────────────────────────────
      const body = await req.json().catch(() => ({}));
      const { senha } = body;
 
      if (!senha) {
        return NextResponse.json(
          { message: "Senha é obrigatória para confirmar exclusão da conta" },
          { status: 400 }
        );
      }
 
      const senhaValida = await bcrypt.compare(senha, usuario.password);
      if (!senhaValida) {
        return NextResponse.json({ message: "Senha incorreta" }, { status: 401 });
      }
    } else {
      // ── Usuário OAuth (Google) ────────────────────────────────────────────
      // Verifica se o usuário reautenticou recentemente (últimos 5 minutos).
      // O token JWT contém `iat` (issued at) — se for recente, significa que
      // o usuário acabou de passar pelo fluxo de login do Google.
      const session = await getServerSession(authOptions);
      const token   = (session as any)?.token;
      const iat     = token?.iat as number | undefined;
      const now     = Math.floor(Date.now() / 1000);
 
      // ✅ CORRIGIDO: verifica iat do token — se o login foi nos últimos
      // OAUTH_REAUTH_WINDOW_SEGUNDOS (5min), considera reautenticação válida.
      // O frontend deve chamar signIn("google") antes de deletar e só
      // disparar a exclusão após o callback de retorno.
      if (!iat || now - iat > OAUTH_REAUTH_WINDOW_SEGUNDOS) {
        return NextResponse.json(
          {
            message:       "Reautenticação necessária",
            code:          "OAUTH_REAUTH_REQUIRED",
            // Informa ao frontend que deve redirecionar para reautenticar
            requiresReauth: true,
          },
          { status: 401 }
        );
      }
    }
 
    // 6. Deletar usuário (CASCADE deleta dados relacionados no schema)
    const [deletado] = await db
      .delete(users)
      .where(eq(users.id, userId))
      .returning();
 
    if (!deletado) {
      return NextResponse.json({ message: "Erro ao deletar usuário" }, { status: 500 });
    }
 
    return NextResponse.json({ message: "Conta deletada com sucesso" });
  } catch (err: any) {
    console.error("❌ Erro ao deletar usuário:", err);
    return NextResponse.json({ message: "Erro ao deletar usuário" }, { status: 500 });
  }
}