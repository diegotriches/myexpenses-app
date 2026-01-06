import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

/**
 * Obtém o ID do usuário autenticado na sessão atual
 * @returns userId (string) ou null se não autenticado
 */
export async function getUserId(): Promise<string | null> {
  try {
    const session = await getServerSession(authOptions);
    
    // Garantir que o ID seja sempre string (compatível com UUID)
    if (!session?.user?.id) {
      return null;
    }
    
    return String(session.user.id);
  } catch (error) {
    console.error("Erro ao obter userId:", error);
    return null;
  }
}

/**
 * Verifica se há uma sessão válida e retorna os dados do usuário
 * @returns Session completa ou lança erro 401
 * @throws Error se não autenticado
 */
export async function requireAuth() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    throw new Error("Não autenticado");
  }
  
  return session;
}

/**
 * Obtém a sessão completa do usuário autenticado
 * @returns Session ou null
 */
export async function getSession() {
  try {
    const session = await getServerSession(authOptions);
    return session;
  } catch (error) {
    console.error("Erro ao obter sessão:", error);
    return null;
  }
}

/**
 * Verifica se o usuário está autenticado
 * @returns boolean
 */
export async function isAuthenticated(): Promise<boolean> {
  const userId = await getUserId();
  return userId !== null;
}