import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";

/**
 * Pega a sessão do servidor (para usar em Server Components e API Routes)
 */
export async function getSession() {
  return await getServerSession(authOptions);
}

/**
 * Pega o usuário autenticado ou redireciona para login
 * Use em Server Components que precisam de autenticação
 */
export async function getAuthenticatedUser() {
  const session = await getSession();
  
  if (!session?.user) {
    redirect("/login");
  }
  
  return session.user;
}

/**
 * Pega o userId ou lança erro 401
 * Use em API Routes
 */
export async function getUserIdFromSession() {
  const session = await getSession();
  
  if (!session?.user?.id) {
    throw new Error("Não autenticado");
  }
  
  return session.user.id;
}

/**
 * Verifica se o usuário está autenticado
 */
export async function isAuthenticated() {
  const session = await getSession();
  return !!session?.user;
}