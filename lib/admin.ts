// lib/admin.ts
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getUserId } from "@/lib/auth";

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
    throw new Error("Não autenticado. Faça login para acessar esta área.");
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
    throw new Error("Usuário não encontrado");
  }

  // 3. Verificar se é admin
  if (user.role !== "admin") {
    console.warn(`❌ Tentativa de acesso admin negada: ${user.email}`);
    throw new Error("Acesso negado. Apenas administradores podem acessar esta área.");
  }

  console.log(`✅ Admin autenticado: ${user.email}`);
  
  return userId;
}

/**
 * Verifica se usuário atual é admin (versão booleana)
 * Não lança erro, apenas retorna true/false
 */
export async function isAdmin(): Promise<boolean> {
  try {
    await verificarAdmin();
    return true;
  } catch {
    return false;
  }
}

/**
 * Busca dados completos do admin atual
 */
export async function getAdminData() {
  const userId = await verificarAdmin();
  
  const [admin] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return admin;
}