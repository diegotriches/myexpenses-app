// proxy.ts
//
// Primeira barreira de autenticação (no Next 16, "proxy" substitui "middleware"
// e o arquivo precisa ficar na raiz). As rotas de API continuam checando a
// sessão por conta própria; aqui elas só recebem um 401 em JSON, nunca um
// redirect para o HTML do login.
import { withAuth, type NextRequestWithAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

const ehRotaApi = (caminho: string) => caminho.startsWith("/api/");

export default withAuth(
  function proxy(req: NextRequestWithAuth) {
    const token = req.nextauth.token;
    const agora = Math.floor(Date.now() / 1000);
    const expirado = typeof token?.exp === "number" && token.exp < agora;

    if (ehRotaApi(req.nextUrl.pathname) && (!token || expirado)) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    if (expirado) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("reason", "session_expired");
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      // API sempre passa para a função acima, que responde 401 em JSON
      authorized: ({ token, req }) => ehRotaApi(req.nextUrl.pathname) || !!token,
    },
    pages: {
      signIn: "/login",
    },
  }
);

// Ficam de fora, de propósito: /api/auth e /api/contato (públicas) e
// /api/cron (protegida por CRON_SECRET).
export const config = {
  matcher: [
    "/admin/:path*",
    "/ajustes/:path*",
    "/aplicacoes/:path*",
    "/cartoes/:path*",
    "/categorias/:path*",
    "/contas/:path*",
    "/dashboard/:path*",
    "/estabelecimentos/:path*",
    "/notificacoes/:path*",
    "/perfil/:path*",
    "/resumo-anual/:path*",
    "/transacoes/:path*",

    "/api/admin/:path*",
    "/api/antecipacoes/:path*",
    "/api/aplicacoes/:path*",
    "/api/backups/:path*",
    "/api/cartoes/:path*",
    "/api/categorias/:path*",
    "/api/contas/:path*",
    "/api/dashboard/:path*",
    "/api/estabelecimentos/:path*",
    "/api/export/:path*",
    "/api/import/:path*",
    "/api/notas/:path*",
    "/api/notificacoes/:path*",
    "/api/parcelamentos/:path*",
    "/api/preferences/:path*",
    "/api/recorrencias/:path*",
    "/api/renda-variavel/:path*",
    "/api/resumo-anual/:path*",
    "/api/transacoes/:path*",
    "/api/transferencias/:path*",
    "/api/users/:path*",
  ],
};
