import { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { AppProviders } from "@/components/providers/AppProviders";
import type { Metadata, Viewport } from "next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
};

// Base das URLs absolutas de metadados (imagem de compartilhamento)
function urlDoApp(): URL {
  try {
    return new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000");
  } catch {
    return new URL("http://localhost:3000");
  }
}

export const metadata: Metadata = {
  metadataBase: urlDoApp(),
  title: "MyExpenses - Controle Financeiro",
  description: "Gerencie suas finanças pessoais de forma simples e eficiente",
  appleWebApp: {
    capable: true,
    title: "MyExpenses",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
};

// ✅ CORRIGIDO: RootLayout deixou de ser "async" e não chama mais
// getSession() — essa chamada lia cookies/headers durante a renderização
// no servidor, o que forçava TODO o app (inclusive páginas que poderiam
// ser estáticas) a ser tratado como dinâmico pelo Next, causando o erro
// "Dynamic server usage: ... couldn't be rendered statically because it
// used `headers`" no build.
//
// A sessão agora é obtida pelo SessionProvider no client (veja
// AppProviders.tsx) via fetch em /api/auth/session, e não mais
// pré-carregada do servidor neste layout raiz.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-br" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}