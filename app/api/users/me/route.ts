import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    console.log("🔐 Buscando sessão...");
    
    // Obter sessão do usuário
    const session = await getServerSession(authOptions);

    console.log("👤 Sessão:", session);

    if (!session || !session.user?.email) {
      console.error("❌ Não autorizado");
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    console.log("📧 Buscando usuário por email:", session.user.email);

    // Buscar usuário no banco
    const [usuario] = await db
      .select()
      .from(users)
      .where(eq(users.email, session.user.email))
      .limit(1);

    console.log("📦 Usuário encontrado:", usuario);

    if (!usuario) {
      console.error("❌ Usuário não encontrado no banco");
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    // Retornar dados do usuário (sem senha!)
    const { password, senha, ...dadosUsuario } = usuario as any;

    console.log("✅ Retornando dados:", dadosUsuario);

    return NextResponse.json(dadosUsuario);
  } catch (error) {
    console.error("❌ Erro ao buscar usuário:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}