//lib/auth/session.ts

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/config";

/**
 * ============================================
 * 📦 HELPERS DE SESSÃO - CONSOLIDADO
 * ============================================
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

export async function getUserId(): Promise<string | null> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return null;
    return String(session.user.id);
  } catch (error) {
    console.error("Erro ao obter userId:", error);
    return null;
  }
}

export async function getUserIdOrFail(): Promise<string> {
  const userId = await getUserId();
  if (!userId) throw new Error("Não autenticado");
  return userId;
}

export async function getUserIdOrRedirect(): Promise<string> {
  const userId = await getUserId();
  if (!userId) redirect("/login"); // ✅ corrigido de /auth/signin
  return userId;
}

export async function isAuthenticated(): Promise<boolean> {
  const userId = await getUserId();
  return userId !== null;
}

export async function requireAuth() {
  const session = await getSession();
  if (!session?.user) throw new Error("Não autenticado");
  return session;
}