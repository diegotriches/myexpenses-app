
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
    // ✅ 1. CRÍTICO: Verificar autenticação
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

    // ✅ 3. CRÍTICO: Verificar se o usuário está editando seu próprio perfil
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
    if (email) {
      const [emailExistente] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (emailExistente && emailExistente.id !== userId) {
        return NextResponse.json(
          { message: "Este email já está em uso" },
          { status: 400 }
        );
      }
    }

    // ✅ 6. Atualizar apenas campos permitidos
    const [atualizado] = await db
      .update(users)
      .set({
        name: name.trim(),
        email: email.toLowerCase().trim(),
      })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
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
    console.error("Erro ao atualizar usuário:", err);
    return NextResponse.json(
      { message: "Erro ao atualizar usuário" },
      { status: 500 }
    );
  }
}

// ✅ Deletar usuário (deletar própria conta)
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // ✅ 1. CRÍTICO: Verificar autenticação
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

    // ✅ 3. CRÍTICO: Verificar se o usuário está deletando sua própria conta
    if (userId !== targetId) {
      return NextResponse.json(
        { message: "Você não tem permissão para deletar outro usuário" },
        { status: 403 }
      );
    }

    // ✅ 4. OPCIONAL: Pedir confirmação de senha antes de deletar
    const body = await req.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { message: "Senha é obrigatória para confirmar exclusão da conta" },
        { status: 400 }
      );
    }

    // ✅ 5. Verificar senha antes de deletar
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

    // Se usuário tem senha (não é OAuth only)
    if (usuario.password) {
      const senhaValida = await bcrypt.compare(password, usuario.password);
      if (!senhaValida) {
        return NextResponse.json(
          { message: "Senha incorreta" },
          { status: 401 }
        );
      }
    }

    // ✅ 6. IMPORTANTE: Deletar dados relacionados primeiro (cascade)
    // TODO: Adicionar deleção de:
    // - contas
    // - cartoes
    // - transacoes
    // - transferencias
    // - etc.

    // ✅ 7. Deletar usuário
    const [deletado] = await db
      .delete(users)
      .where(eq(users.id, userId))
      .returning();

    if (!deletado) {
      return NextResponse.json(
        { message: "Erro ao deletar usuário" },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      message: "Conta deletada com sucesso" 
    });
  } catch (err: any) {
    console.error("Erro ao deletar usuário:", err);
    return NextResponse.json(
      { message: "Erro ao deletar usuário" },
      { status: 500 }
    );
  }
}