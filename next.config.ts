import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Aplica a todas as rotas
        source: "/:path*",
        headers: [
          // ✅ Previne clickjacking — impede que o site seja carregado em iframes
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          // ✅ Previne MIME sniffing — browser respeita o Content-Type declarado
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          // ✅ Controla informações do Referrer enviadas em requests
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          // ✅ Desativa features sensíveis do browser desnecessárias para o app
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
          // ✅ Força HTTPS por 1 ano (só ativo em produção via Vercel)
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          // ✅ Content Security Policy — controla de onde recursos podem ser carregados
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // Scripts: próprio domínio + inline (necessário para Next.js)
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              // Estilos: próprio domínio + inline (necessário para Tailwind/shadcn)
              "style-src 'self' 'unsafe-inline'",
              // Imagens: próprio domínio + data URIs + Google (avatares OAuth)
              "img-src 'self' data: blob: https://lh3.googleusercontent.com https://avatars.githubusercontent.com",
              // Fontes: próprio domínio + Google Fonts
              "font-src 'self' https://fonts.gstatic.com",
              // Conexões: próprio domínio + APIs necessárias
              "connect-src 'self'",
              // Frames: nenhum permitido
              "frame-src 'none'",
              // Objetos: nenhum permitido (Flash, etc)
              "object-src 'none'",
              // Base URI: apenas próprio domínio
              "base-uri 'self'",
              // Form actions: apenas próprio domínio
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
      {
        // Headers específicos para rotas de export/download
        source: "/api/export/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default nextConfig;