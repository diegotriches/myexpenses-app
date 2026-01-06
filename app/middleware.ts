export { default } from "next-auth/middleware";

// ✅ Configuração completa de rotas protegidas
export const config = {
  matcher: [
    // ✅ Páginas protegidas
    "/dashboard/:path*",
    "/movimentacoes/:path*",
    "/contas/:path*",
    "/cartoes/:path*",
    "/categorias/:path*",
    "/extrato/:path*",
    "/transferencias/:path*",
    "/faturas/:path*",
    "/perfil/:path*",
    "/configuracoes/:path*",
    "/relatorios/:path*",
    
    // ✅ API Routes protegidas
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
    
    // ⚠️ NÃO incluir rotas públicas:
    // - "/" (landing page)
    // - "/login"
    // - "/register"
    // - "/api/auth/*" (NextAuth precisa ser público)
  ],
};

// ============================================
// 📋 DOCUMENTAÇÃO DE ROTAS
// ============================================

/*
✅ ROTAS PÚBLICAS (não precisam de autenticação):
- / (landing page)
- /login
- /register
- /forgot-password (se implementar)
- /api/auth/* (NextAuth)

✅ ROTAS PROTEGIDAS (exigem autenticação):

PÁGINAS:
- /dashboard
- /movimentacoes
- /contas
- /cartoes
- /categorias
- /extrato
- /transferencias
- /faturas
- /perfil
- /configuracoes
- /relatorios

API ROUTES:
- /api/contas/*
- /api/cartoes/*
- /api/transacoes/*
- /api/transferencias/*
- /api/faturas/*
- /api/categorias/*
- /api/dashboard/*
- /api/extrato/*
- /api/users/*
- /api/profile/*
- /api/preferences/*

⚠️ IMPORTANTE:
- Todas as rotas em matcher[] exigem sessão válida
- NextAuth redireciona automaticamente para /api/auth/signin
- Rotas de API retornam 401 se não autenticado
*/