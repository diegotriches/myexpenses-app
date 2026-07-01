// src/middleware.ts
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = (req as any).nextauth?.token;
    const now   = Math.floor(Date.now() / 1000);

    // Se o token existe mas já expirou (exp no passado),
    // redireciona para o login com aviso de sessão expirada.
    // Isso cobre o caso em que o cookie ainda está presente mas
    // o JWT já não é mais válido pelo tempo.
    if (token && token.exp && (token.exp as number) < now) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("reason", "session_expired");
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      // authorized retorna true apenas se o token existe —
      // a verificação de expiração é feita no middleware acima
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