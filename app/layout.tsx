"use client";

import { Providers } from "./providers";
import { PeriodoProvider } from "@/components/PeriodoContext";
import Navbar from "@/components/Navbar";
import { usePathname } from "next/navigation";

import "./globals.css";
import FloatingButton from "@/components/FloatingButton";

const metadata = {
  title: "My Expenses",
  description: "Gerencie suas finanças",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname(); // pega a rota atual
  const esconderNavbar = pathname === "/login" || pathname === "/register" || pathname === "/";

  return (
    <html lang="pt-br">
      <body>
        {!esconderNavbar && <Navbar />}
        <PeriodoProvider>
          <FloatingButton/>
          <Providers>
            {children}
          </Providers>
        </PeriodoProvider>
      </body>
    </html>
  );
}
