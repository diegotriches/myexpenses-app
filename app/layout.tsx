import { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { AppProviders } from "@/components/providers/AppProviders";
import { getSession } from "@/lib/auth";
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

export const metadata: Metadata = {
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

// ✅ Server Component — busca sessão no servidor antes de renderizar
export default async function RootLayout({ children }: { children: ReactNode }) {
  const session = await getSession();

  return (
    <html lang="pt-br" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AppProviders session={session}>{children}</AppProviders>
      </body>
    </html>
  );
}