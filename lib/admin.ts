// lib/admin.ts
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import { ErroHttp } from "@/lib/erroHttp";

/**
 * Verifica se usuário atual é admin
 * 
 * @throws Error se não autenticado ou não é admin
 * @returns userId do admin
 */
export async function verificarAdmin(): Promise<string> {
  // 1. Verificar se está autenticado
  const userId = await getUserId();

  if (!userId) {
    throw new ErroHttp("Não autenticado. Faça login para acessar esta área.", 401);
  }

  // 2. Buscar role do usuário
  const [user] = await db
    .select({ 
      id: users.id,
      email: users.email,
      role: users.role,
      name: users.name,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new ErroHttp("Usuário não encontrado", 404);
  }

  // 3. Verificar se é admin
  if (user.role !== "admin") {
    console.warn(`❌ Tentativa de acesso admin negada: ${user.email}`);
    throw new ErroHttp("Acesso negado. Apenas administradores podem acessar esta área.", 403);
  }

  console.log(`✅ Admin autenticado: ${user.email}`);
  
  return userId;
}

