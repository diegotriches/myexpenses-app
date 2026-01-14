// lib/auth.ts

/**
 * ============================================
 * 🔐 AUTH MODULE - CENTRAL EXPORTS
 * ============================================
 * 
 * Módulo centralizado de autenticação.
 * Re-exporta todos os recursos de autenticação de forma organizada.
 * 
 * Estrutura:
 * - lib/auth/config.ts    → Configuração NextAuth
 * - lib/auth/adapter.ts   → Drizzle Adapter
 * - lib/auth/session.ts   → Helpers de sessão
 * 
 * Uso:
 * ```typescript
 * import { authOptions, getUserId, DrizzleAdapter } from "@/lib/auth";
 * ```
 * 
 * ============================================
 */

// ============================================
// 📦 NEXTAUTH CONFIG
// ============================================
export { authOptions } from "./auth/config";

// ============================================
// 🔌 DATABASE ADAPTER
// ============================================
export { DrizzleAdapter } from "./auth/adapter";

// ============================================
// 👤 SESSION HELPERS
// ============================================
export {
  getSession,
  getUserId,
  getUserIdOrFail,
  getUserIdOrRedirect,
  isAuthenticated,
  requireAuth,
} from "./auth/session";

// ============================================
// 📚 EXEMPLOS DE USO
// ============================================

/*
┌─────────────────────────────────────────────────────────────────┐
│ IMPORTS CENTRALIZADOS                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ // ✅ Um único import resolve tudo                              │
│ import { authOptions, getUserId } from "@/lib/auth";           │
│                                                                 │
│ // ✅ Em API Routes                                             │
│ import { getUserId } from "@/lib/auth";                        │
│                                                                 │
│ // ✅ Em Server Components                                      │
│ import { getUserIdOrRedirect } from "@/lib/auth";              │
│                                                                 │
│ // ✅ Para configurar NextAuth                                  │
│ import { authOptions } from "@/lib/auth";                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
*/