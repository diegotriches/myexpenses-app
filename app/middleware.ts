// src/middleware.ts

export { default } from "next-auth/middleware";

// ✅ Configuração completa de rotas protegidas
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
    "/configuracoes/:path*",
    "/relatorios/:path*",
    "/notificacoes/:path*",         // ✅ NOVO - Página de notificações
    
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
    "/api/notificacoes/:path*",     // ✅ NOVO - API de notificações
    
    // ⚠️ NÃO incluir rotas públicas:
    // - "/" (landing page)
    // - "/login"
    // - "/register"
    // - "/api/auth/*" (NextAuth precisa ser público)
    // - "/api/cron/*" (protegido por CRON_SECRET)
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
- /api/cron/* (protegido por CRON_SECRET em vez de sessão)

✅ ROTAS PROTEGIDAS (exigem autenticação):

📱 PÁGINAS:
- /dashboard - Página inicial com resumo financeiro
- /movimentacoes - Lista e gerencia transações
- /contas - CRUD de contas bancárias
- /cartoes - CRUD de cartões de crédito/débito
- /categorias - CRUD de categorias personalizadas
- /extrato - Visualização de extrato detalhado
- /transferencias - Transferências entre contas
- /faturas - Gerenciamento de faturas de cartão
- /perfil - Dados do usuário
- /configuracoes - Configurações gerais
- /relatorios - Relatórios e gráficos
- /notificacoes - ✅ NOVO - Central de notificações

🔌 API ROUTES:
- /api/contas/* - CRUD de contas
- /api/cartoes/* - CRUD de cartões
- /api/transacoes/* - CRUD de transações
- /api/transferencias/* - CRUD de transferências
- /api/faturas/* - Operações com faturas
- /api/categorias/* - CRUD de categorias
- /api/dashboard/* - Dados do dashboard
- /api/extrato/* - Dados do extrato
- /api/users/* - Gerenciamento de usuários
- /api/profile/* - Perfil do usuário
- /api/preferences/* - Preferências do usuário
- /api/notificacoes/* - ✅ NOVO - Sistema de notificações
  * GET /api/notificacoes - Lista notificações
  * POST /api/notificacoes - Cria notificação
  * GET /api/notificacoes/[id] - Busca por ID
  * DELETE /api/notificacoes/[id] - Remove notificação
  * PUT /api/notificacoes/[id]/lida - Marca como lida
  * PUT /api/notificacoes/marcar-todas-lidas - Marca todas como lidas
  * DELETE /api/notificacoes/limpar-lidas - Remove todas lidas
  * GET /api/notificacoes/preferencias - Busca preferências
  * PUT /api/notificacoes/preferencias - Atualiza preferências
  * POST /api/notificacoes/verificar - Verifica e cria notificações automáticas

⚠️ IMPORTANTE:
- Todas as rotas em matcher[] exigem sessão válida do NextAuth
- NextAuth redireciona automaticamente para /api/auth/signin se não autenticado
- Rotas de API retornam 401 Unauthorized se não houver sessão
- Middleware protege tanto páginas quanto API routes
- Rotas de cron (/api/cron/*) não estão no matcher e são protegidas por CRON_SECRET

🔒 SEGURANÇA:
- Todas as API routes verificam userId da sessão
- Queries de banco SEMPRE incluem filtro por userId
- Verificação de ownership antes de operações (update/delete)
- Cron jobs autenticam via CRON_SECRET em vez de sessão

📚 PRÓXIMAS IMPLEMENTAÇÕES:
- /metas - Sistema de metas financeiras
- /orcamento - Orçamento por categoria
- /relatorios/avancado - Relatórios customizáveis
- /api/export/* - Exportação de dados (PDF/Excel/CSV)
*/