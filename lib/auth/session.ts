//lib/auth/session.ts

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

/**
 * ============================================
 * 📦 HELPERS DE SESSÃO - CONSOLIDADO
 * ============================================
 * 
 * Funções unificadas para gerenciar autenticação
 * em Server Components e API Routes.
 * 
 * USO:
 * - Server Components: use getSession() ou getUserIdOrRedirect()
 * - API Routes: use getUserId() ou requireAuth()
 * 
 * ============================================
 */

// ============================================
// 🔍 OBTER SESSÃO
// ============================================

/**
 * Obtém a sessão completa do usuário autenticado
 * 
 * @returns Session ou null
 * @example
 * ```typescript
 * const session = await getSession();
 * if (session) {
 *   console.log(session.user.id);
 * }
 * ```
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

// ============================================
// 👤 OBTER USER ID
// ============================================

/**
 * Obtém o ID do usuário autenticado (retorna null se não autenticado)
 * 
 * **Use em API Routes** quando quiser retornar erro 401 manualmente
 * 
 * @returns userId (string) ou null
 * @example
 * ```typescript
 * // Em API Route
 * const userId = await getUserId();
 * if (!userId) {
 *   return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
 * }
 * ```
 */
export async function getUserId(): Promise<string | null> {
  try {
    const session = await getServerSession(authOptions);
    
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
 * Obtém o ID do usuário autenticado (lança erro se não autenticado)
 * 
 * **Use em API Routes** quando quiser que o erro seja lançado automaticamente
 * 
 * @returns userId (string)
 * @throws Error("Não autenticado") se não houver sessão
 * @example
 * ```typescript
 * // Em API Route com try-catch
 * try {
 *   const userId = await getUserIdOrFail();
 *   // Continua apenas se autenticado
 * } catch (error) {
 *   return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
 * }
 * ```
 */
export async function getUserIdOrFail(): Promise<string> {
  const userId = await getUserId();
  
  if (!userId) {
    throw new Error("Não autenticado");
  }
  
  return userId;
}

/**
 * Obtém o ID do usuário autenticado (redireciona se não autenticado)
 * 
 * **Use em Server Components** que exigem autenticação
 * 
 * @returns userId (string)
 * @example
 * ```typescript
 * // Em Server Component (page.tsx)
 * export default async function MinhaPage() {
 *   const userId = await getUserIdOrRedirect();
 *   // Usuário sempre estará autenticado aqui
 * }
 * ```
 */
export async function getUserIdOrRedirect(): Promise<string> {
  const userId = await getUserId();
  
  if (!userId) {
    redirect("/auth/signin");
  }
  
  return userId;
}

// ============================================
// 🛡️ VERIFICAR AUTENTICAÇÃO
// ============================================

/**
 * Verifica se o usuário está autenticado
 * 
 * @returns boolean
 * @example
 * ```typescript
 * const authenticated = await isAuthenticated();
 * if (!authenticated) {
 *   // Mostrar mensagem ou redirecionar
 * }
 * ```
 */
export async function isAuthenticated(): Promise<boolean> {
  const userId = await getUserId();
  return userId !== null;
}

/**
 * Obtém a sessão completa ou lança erro
 * 
 * **Use em API Routes** quando precisar de dados completos da sessão
 * 
 * @returns Session completa
 * @throws Error("Não autenticado") se não houver sessão
 * @example
 * ```typescript
 * try {
 *   const session = await requireAuth();
 *   console.log(session.user.email, session.user.name);
 * } catch (error) {
 *   return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
 * }
 * ```
 */
export async function requireAuth() {
  const session = await getSession();
  
  if (!session?.user) {
    throw new Error("Não autenticado");
  }
  
  return session;
}

// ============================================
// 📚 RESUMO DE USO
// ============================================

/*
┌─────────────────────────────────────────────────────────────────┐
│ QUANDO USAR CADA FUNÇÃO?                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ 🖥️  SERVER COMPONENTS (páginas, layouts):                       │
│   ✅ getUserIdOrRedirect() - Redireciona se não autenticado    │
│   ✅ getSession() - Para dados completos (nome, email, etc)    │
│   ✅ isAuthenticated() - Verificação condicional               │
│                                                                 │
│ 🔌 API ROUTES:                                                  │
│   ✅ getUserId() - Retorna null (você trata o erro)            │
│   ✅ getUserIdOrFail() - Lança erro (use try-catch)            │
│   ✅ requireAuth() - Quando precisar de session completa       │
│                                                                 │
│ ⚠️  EVITE:                                                       │
│   ❌ getUserIdOrRedirect() em API Routes (não funciona)        │
│   ❌ getUserIdOrFail() em Server Components (melhor redirect)  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

EXEMPLOS PRÁTICOS:

// ✅ Server Component
export default async function DashboardPage() {
  const userId = await getUserIdOrRedirect(); // Redireciona se não autenticado
  const contas = await buscarContas(userId);
  return <Dashboard contas={contas} />;
}

// ✅ API Route (opção 1 - manual)
export async function GET() {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  const dados = await buscarDados(userId);
  return NextResponse.json(dados);
}

// ✅ API Route (opção 2 - automático)
export async function GET() {
  try {
    const userId = await getUserIdOrFail();
    const dados = await buscarDados(userId);
    return NextResponse.json(dados);
  } catch (error) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
}

// ✅ Verificação condicional
export default async function HomePage() {
  const authenticated = await isAuthenticated();
  if (authenticated) {
    return <DashboardLink />;
  }
  return <LoginButton />;
}
*/