// src/middleware.ts

import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    // Middleware executa apenas para rotas autenticadas
    // Aqui podemos adicionar lógica extra se necessário no futuro
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: [
    // ============================================
    // 📱 PÁGINAS PROTEGIDAS
    // ============================================
    "/dashboard/:path*",
    "/movimentacoes/:path*",
    "/contas/:path*",
    "/cartoes/:path*",
    "/categorias/:path*",
    "/extrato/:path*",
    "/transferencias/:path*",
    "/faturas/:path*",
    "/perfil/:path*",
    "/ajustes/:path*",
    "/relatorios/:path*",
    "/notificacoes/:path*",

    // ============================================
    // 🔌 API ROUTES PROTEGIDAS
    // ============================================
    "/api/contas/:path*",
    "/api/cartoes/:path*",
    "/api/transacoes/:path*",
    "/api/transferencias/:path*",
    "/api/faturas/:path*",
    "/api/categorias/:path*",
    "/api/dashboard/:path*",
    "/api/extrato/:path*",
    "/api/users/:path*",
    "/api/profile/:path*",
    "/api/preferences/:path*",
    "/api/notificacoes/:path*",
    "/api/export/:path*",
  ],
};