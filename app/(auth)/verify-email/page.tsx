// src/app/(auth)/verify-email/page.tsx
"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { BsCashCoin } from "react-icons/bs";
import { FiArrowLeft } from "react-icons/fi";
import { Loader2, MailCheck, MailX, RefreshCw, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// ── Conteúdo da página ────────────────────────────────────────────────────────

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router       = useRouter();

  const token = searchParams.get("token");
  const email = searchParams.get("email"); // vindo do redirecionamento do login

  // Estados possíveis: "idle" | "verifying" | "success" | "error" | "resending" | "resent"
  const [status,       setStatus]       = useState<"idle" | "verifying" | "success" | "error" | "resending" | "resent">(
    token ? "verifying" : "idle"
  );
  const [errorMessage, setErrorMessage] = useState("");

  // Se veio com token na URL, verifica automaticamente
  useEffect(() => {
    if (!token) return;

    async function verificar() {
      setStatus("verifying");
      try {
        const res = await fetch(`/api/auth/verify-email?token=${token}`);
        const data = await res.json();
        if (res.ok) {
          setStatus("success");
        } else {
          setStatus("error");
          setErrorMessage(data.error || "Token inválido ou expirado.");
        }
      } catch {
        setStatus("error");
        setErrorMessage("Erro de conexão. Tente novamente.");
      }
    }

    verificar();
  }, [token]);

  async function handleReenviar() {
    if (!email) return;
    setStatus("resending");
    try {
      await fetch("/api/auth/resend-verification", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email }),
      });
      setStatus("resent");
    } catch {
      setStatus("error");
      setErrorMessage("Erro ao reenviar. Tente novamente.");
    }
  }

  // ── Verificando token ───────────────────────────────────────────────────────
  if (status === "verifying") {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <Loader2 className="h-16 w-16 text-blue-600 dark:text-blue-400 animate-spin" />
        <p className="text-lg font-semibold text-gray-900 dark:text-white">Verificando seu e-mail...</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">Aguarde um momento</p>
      </div>
    );
  }

  // ── Verificado com sucesso ──────────────────────────────────────────────────
  if (status === "success") {
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
        </div>
        <div className="space-y-2">
          <p className="text-xl font-bold text-gray-900 dark:text-white">E-mail verificado!</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Sua conta foi ativada com sucesso. Você já pode fazer login.
          </p>
        </div>
        <Button
          onClick={() => router.push("/login")}
          className="w-full h-11 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold mt-2"
        >
          Ir para o Login
        </Button>
      </div>
    );
  }

  // ── Erro na verificação ─────────────────────────────────────────────────────
  if (status === "error") {
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <MailX className="h-12 w-12 text-red-600 dark:text-red-400" />
        </div>
        <div className="space-y-2">
          <p className="text-xl font-bold text-gray-900 dark:text-white">Link inválido</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">{errorMessage}</p>
        </div>
        {email && (
          <Button
            onClick={handleReenviar}
            variant="outline"
            className="w-full h-11 mt-2"
          >
            <RefreshCw size={16} className="mr-2" />
            Solicitar novo link
          </Button>
        )}
        <Link href="/login" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
          Voltar ao login
        </Link>
      </div>
    );
  }

  // ── E-mail reenviado ────────────────────────────────────────────────────────
  if (status === "resent") {
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <div className="w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
          <MailCheck className="h-12 w-12 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="space-y-2">
          <p className="text-xl font-bold text-gray-900 dark:text-white">E-mail reenviado!</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Verifique sua caixa de entrada{email ? ` (${email})` : ""} e clique no link de confirmação.
            O link expira em 24 horas.
          </p>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
          Não recebeu? Verifique também a pasta de spam.
        </p>
        <Link href="/login" className="text-sm text-blue-600 dark:text-blue-400 hover:underline mt-2">
          Voltar ao login
        </Link>
      </div>
    );
  }

  // ── Aguardando verificação (veio do login sem token) ────────────────────────
  return (
    <div className="flex flex-col items-center gap-4 py-4 text-center">
      <div className="w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
        <MailCheck className="h-12 w-12 text-blue-600 dark:text-blue-400" />
      </div>
      <div className="space-y-2">
        <p className="text-xl font-bold text-gray-900 dark:text-white">Verifique seu e-mail</p>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Enviamos um link de confirmação para{" "}
          {email ? <strong>{email}</strong> : "o seu e-mail"}.
          Clique no link para ativar sua conta.
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 pt-1">
          O link expira em 24 horas. Verifique também a pasta de spam.
        </p>
      </div>

      {email && (
        <Button
          onClick={handleReenviar}
          variant="outline"
          disabled={status === "resending"}
          className="w-full h-11 mt-2"
        >
          {status === "resending" ? (
            <><Loader2 size={16} className="mr-2 animate-spin" />Reenviando...</>
          ) : (
            <><RefreshCw size={16} className="mr-2" />Reenviar e-mail</>
          )}
        </Button>
      )}

      <Link href="/login" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
        Voltar ao login
      </Link>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function VerifyEmailPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 dark:from-gray-900 dark:via-blue-950 dark:to-purple-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl" />
      </div>

      <Link
        href="/"
        className="absolute top-6 left-6 flex items-center gap-2 text-white hover:text-blue-200 transition-colors group"
      >
        <FiArrowLeft className="group-hover:-translate-x-1 transition-transform" />
        <span className="font-medium">Voltar</span>
      </Link>

      <div className="relative w-full max-w-md mx-auto">
        <Card className="bg-white dark:bg-gray-800 shadow-2xl border-0">
          <CardHeader className="space-y-2 pb-4">
            <div className="flex justify-center mb-2">
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-full">
                <BsCashCoin size={20} />
                <span className="font-semibold">MyExpenses</span>
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white text-center">
              Confirmação de Conta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense fallback={
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
              </div>
            }>
              <VerifyEmailContent />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}