import { db } from "@/db";
import { users } from "@/db/schema";
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getToken } from "next-auth/jwt";
import bcrypt from "bcryptjs";
import { getUserId } from "@/lib/auth";
import { respostaDeErro } from "@/lib/rota";
import { solicitarTrocaEmail } from "@/lib/trocaEmail";
import { perfilDoUsuario } from "@/lib/perfilUsuario";

// Janela de reautenticação OAuth aceita (5 minutos)
const OAUTH_REAUTH_WINDOW_SEGUNDOS = 5 * 60;

// PUT - Atualizar perfil: nome na hora; e-mail novo vira pedido de troca, confirmado por link
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    // ✅ 1. Verificar autenticação
    const userId = await getUserId();

    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // ✅ 2. Obter ID da URL
    const params = await context.params;
    const targetId = params.id;

    // ✅ 3. Verificar ownership
    if (userId !== targetId) {
      return NextResponse.json(
        { error: "Você não tem permissão para editar outro usuário" },
        { status: 403 },
      );
    }

    const body = (await req.json().catch(() => ({}))) as { name?: unknown; email?: unknown };
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.toLowerCase().trim() : "";

    // ✅ 4. Validar entrada
    if (name.length < 2) {
      return NextResponse.json(
        { error: "Nome deve ter ao menos 2 caracteres" },
        { status: 400 },
      );
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "E-mail inválido" }, { status: 400 });
    }

    const [atual] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!atual) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 },
      );
    }

    // ✅ 5. Nome muda na hora
    await db.update(users).set({ name }).where(eq(users.id, userId));

    // ✅ 6. E-mail só muda depois de confirmado pelo link enviado ao endereço novo
    // (mesmo e-mail mantém um pedido em aberto; cancelar é DELETE /api/users/[id]/troca-email)
    if (email !== atual.email) {
      await solicitarTrocaEmail(userId, name, email);
    }

    return NextResponse.json(await perfilDoUsuario(userId));
  } catch (err) {
    return respostaDeErro(err, "Erro ao atualizar usuário");
  }
}

// DELETE - Deletar conta
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    // 1. Verificar autenticação
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // 2. Obter ID da URL
    const params = await context.params;
    const targetId = params.id;

    // 3. Verificar ownership
    if (userId !== targetId) {
      return NextResponse.json(
        { message: "Você não tem permissão para deletar outro usuário" },
        { status: 403 },
      );
    }

    // 4. Buscar usuário
    const [usuario] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!usuario) {
      return NextResponse.json(
        { message: "Usuário não encontrado" },
        { status: 404 },
      );
    }

    // 5. Verificação de identidade baseada no tipo de conta
    if (usuario.password) {
      // ── Usuário com senha (Credentials) ──────────────────────────────────
      const body = await req.json().catch(() => ({}));
      const { senha } = body;

      if (!senha) {
        return NextResponse.json(
          { message: "Senha é obrigatória para confirmar exclusão da conta" },
          { status: 400 },
        );
      }

      const senhaValida = await bcrypt.compare(senha, usuario.password);
      if (!senhaValida) {
        return NextResponse.json(
          { message: "Senha incorreta" },
          { status: 401 },
        );
      }
    } else {
      // ── Usuário OAuth (Google) ────────────────────────────────────────────
      // ✅ CORRIGIDO: getServerSession(authOptions) nunca expõe o JWT bruto
      // (o callback session() não anexa "token" ao objeto retornado — só usa
      // seus dados internamente). getToken() lê o JWT diretamente do cookie
      // no servidor, sem depender do formato do session callback.
      const token = await getToken({
        req,
        secret: process.env.NEXTAUTH_SECRET,
      });
      const iat = token?.iat as number | undefined;
      const now = Math.floor(Date.now() / 1000);

      if (!iat || now - iat > OAUTH_REAUTH_WINDOW_SEGUNDOS) {
        return NextResponse.json(
          {
            message: "Reautenticação necessária",
            code: "OAUTH_REAUTH_REQUIRED",
            requiresReauth: true,
          },
          { status: 401 },
        );
      }
    }

    // 6. Deletar usuário (CASCADE deleta dados relacionados no schema)
    const [deletado] = await db
      .delete(users)
      .where(eq(users.id, userId))
      .returning();

    if (!deletado) {
      return NextResponse.json(
        { message: "Erro ao deletar usuário" },
        { status: 500 },
      );
    }

    return NextResponse.json({ message: "Conta deletada com sucesso" });
  } catch (err) {
    return respostaDeErro(err, "Erro ao deletar usuário");
  }
}
