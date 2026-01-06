import { db } from "@/db";
import { users } from "@/db/schema";
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { getUserId } from "@/lib/auth";

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // ✅ 1. CRÍTICO: Verificar autenticação primeiro
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

    // ✅ 3. CRÍTICO: Verificar se o usuário está alterando sua própria senha
    if (userId !== targetId) {
      return NextResponse.json(
        { message: "Você não tem permissão para alterar a senha de outro usuário" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { senhaAtual, novaSenha } = body;

    // ✅ 4. Validar entrada
    if (!senhaAtual || !novaSenha) {
      return NextResponse.json(
        { message: "Senha atual e nova senha são obrigatórias" },
        { status: 400 }
      );
    }

    // ✅ 5. Validar requisitos de senha forte
    if (novaSenha.length < 8) {
      return NextResponse.json(
        { message: "A nova senha deve ter no mínimo 8 caracteres" },
        { status: 400 }
      );
    }

    if (!/[A-Z]/.test(novaSenha)) {
      return NextResponse.json(
        { message: "A nova senha deve conter pelo menos uma letra maiúscula" },
        { status: 400 }
      );
    }

    if (!/[a-z]/.test(novaSenha)) {
      return NextResponse.json(
        { message: "A nova senha deve conter pelo menos uma letra minúscula" },
        { status: 400 }
      );
    }

    if (!/[0-9]/.test(novaSenha)) {
      return NextResponse.json(
        { message: "A nova senha deve conter pelo menos um número" },
        { status: 400 }
      );
    }

    if (!/[^a-zA-Z0-9]/.test(novaSenha)) {
      return NextResponse.json(
        { message: "A nova senha deve conter pelo menos um caractere especial" },
        { status: 400 }
      );
    }

    // ✅ 6. Buscar usuário
    const [usuario] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!usuario) {
      return NextResponse.json(
        { message: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    // ✅ 7. Verificar se usuário tem senha (pode ter feito login via OAuth)
    if (!usuario.password) {
      return NextResponse.json(
        { message: "Este usuário usa autenticação via Google. Não é possível alterar senha." },
        { status: 400 }
      );
    }

    // ✅ 8. Verificar senha atual
    const senhaValida = await bcrypt.compare(senhaAtual, usuario.password);
    if (!senhaValida) {
      return NextResponse.json(
        { message: "Senha atual incorreta" },
        { status: 401 }
      );
    }

    // ✅ 9. Verificar se a nova senha é diferente da atual
    const mesmaSenh = await bcrypt.compare(novaSenha, usuario.password);
    if (mesmaSenh) {
      return NextResponse.json(
        { message: "A nova senha deve ser diferente da senha atual" },
        { status: 400 }
      );
    }

    // ✅ 10. Hash da nova senha
    const novaSenhaHash = await bcrypt.hash(novaSenha, 10);

    // ✅ 11. Atualizar senha
    await db
      .update(users)
      .set({ password: novaSenhaHash })
      .where(eq(users.id, userId));

    return NextResponse.json({ 
      message: "Senha alterada com sucesso" 
    });
  } catch (err: any) {
    console.error("Erro ao alterar senha:", err);
    return NextResponse.json(
      { message: "Erro ao alterar senha" },
      { status: 500 }
    );
  }
}