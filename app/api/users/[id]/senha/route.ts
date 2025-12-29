import { db } from "@/db";
import { users } from "@/db/schema";
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = Number(params.id);
    const body = await req.json();
    const { senhaAtual, novaSenha } = body;

    if (!senhaAtual || !novaSenha) {
      return NextResponse.json(
        { message: "Senha atual e nova senha são obrigatórias" },
        { status: 400 }
      );
    }

    // Busca usuário
    const [usuario] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!usuario) {
      return NextResponse.json(
        { message: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    // Verifica senha atual
    const senhaValida = await bcrypt.compare(senhaAtual, usuario.password);
    if (!senhaValida) {
      return NextResponse.json(
        { message: "Senha atual incorreta" },
        { status: 401 }
      );
    }

    // Hash da nova senha
    const novaSenhaHash = await bcrypt.hash(novaSenha, 10);

    // Atualiza senha
    await db
      .update(users)
      .set({ password: novaSenhaHash })
      .where(eq(users.id, id));

    return NextResponse.json({ message: "Senha alterada com sucesso" });
  } catch (err: any) {
    console.error("Erro ao alterar senha:", err);
    return NextResponse.json(
      { message: err.message || "Erro ao alterar senha" },
      { status: 500 }
    );
  }
}