import { db } from "@/db";
import { users } from "@/db/schema";
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { getUserId } from "@/lib/auth";
import { validatePassword } from "@/lib/validators/password";
import { respostaDeErro } from "@/lib/rota";

// PUT - Alterar senha
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // ✅ 1. Verificar autenticação
    const userId = await getUserId();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    // ✅ 2. Obter ID da URL
    const params = await context.params;
    const targetId = params.id;

    // ✅ 3. Verificar ownership
    if (userId !== targetId) {
      return NextResponse.json(
        { message: "Você não tem permissão para alterar a senha de outro usuário" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { senhaAtual, senhaNova, confirmarSenha } = body;

    // ✅ 4. Validar entrada básica
    if (!senhaAtual || !senhaNova || !confirmarSenha) {
      return NextResponse.json(
        { message: "Senha atual, nova senha e confirmação são obrigatórias" },
        { status: 400 }
      );
    }

    // ✅ 5. Validar se senhas novas coincidem
    if (senhaNova !== confirmarSenha) {
      return NextResponse.json(
        { message: "A nova senha e a confirmação não coincidem" },
        { status: 400 }
      );
    }

    // ✅ 6. Validar requisitos de senha forte (usando validator centralizado)
    const validacao = validatePassword(senhaNova);
    if (!validacao.valid) {
      return NextResponse.json(
        { message: validacao.error },
        { status: 400 }
      );
    }

    // ✅ 7. Buscar usuário
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

    // ✅ 8. Verificar se usuário tem senha (pode ter feito login via OAuth)
    if (!usuario.password) {
      return NextResponse.json(
        { message: "Este usuário usa autenticação via Google. Não é possível alterar senha." },
        { status: 400 }
      );
    }

    // ✅ 9. Verificar senha atual
    const senhaValida = await bcrypt.compare(senhaAtual, usuario.password);
    if (!senhaValida) {
      return NextResponse.json(
        { message: "Senha atual incorreta" },
        { status: 401 }
      );
    }

    // ✅ 10. Verificar se a nova senha é diferente da atual
    const mesmaSenh = await bcrypt.compare(senhaNova, usuario.password);
    if (mesmaSenh) {
      return NextResponse.json(
        { message: "A nova senha deve ser diferente da senha atual" },
        { status: 400 }
      );
    }

    // ✅ 11. Hash da nova senha
    const novaSenhaHash = await bcrypt.hash(senhaNova, 12);

    // ✅ 12. Atualizar senha
    await db
      .update(users)
      .set({ password: novaSenhaHash })
      .where(eq(users.id, userId));

    console.log("✅ Senha alterada com sucesso para usuário:", userId);

    return NextResponse.json({ 
      message: "Senha alterada com sucesso" 
    });
  } catch (err) {
    return respostaDeErro(err, "Erro ao alterar senha");
  }
}