import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth/config";

/**
 * ============================================
 * 🔐 NEXTAUTH ROUTE HANDLER
 * ============================================
 * 
 * Expõe os endpoints do NextAuth:
 * - GET/POST /api/auth/signin
 * - POST /api/auth/signout
 * - GET/POST /api/auth/callback/:provider
 * - GET /api/auth/session
 * - GET /api/auth/csrf
 * - GET /api/auth/providers
 * 
 * A configuração completa está em lib/auth/config.ts
 * ============================================
 */

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };