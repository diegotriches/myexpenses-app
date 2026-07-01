// src/app/(auth)/login/page.tsx
"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn, useSession } from "next-auth/react";
import { FiLogIn, FiMail, FiLock, FiArrowLeft, FiEye, FiEyeOff, FiAlertCircle, FiX, FiClock } from "react-icons/fi";
import { FcGoogle } from "react-icons/fc";
import { BsCashCoin } from "react-icons/bs";
import { useState, useEffect, Suspense } from "react";
import { Loader2 } from "lucide-react";

import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input }    from "@/components/ui/input";
import { Button }   from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox }  from "@/components/ui/checkbox";

const loginSchema = z.object({
  email:    z.string().email("Email inválido"),
  password: z.string().min(6, "A senha deve ter ao menos 6 caracteres"),
});

const REMEMBER_ME_KEY = "myexpenses_remember_me";

// ── AutoLoginWrapper ──────────────────────────────────────────────────────────

function AutoLoginWrapper({ children }: { children: React.ReactNode }) {
  const router                    = useRouter();
  const searchParams              = useSearchParams();
  const { data: session, status } = useSession();

  // ✅ CORRIGIDO: não redireciona automaticamente se há um motivo explícito
  // para estar na página de login (sessão expirada, logout manual, etc.)
  // Antes redirecionava sempre que havia sessão ativa, mesmo que o usuário
  // tivesse chegado aqui via link "Já tenho conta" após a sessão expirar.
  const reason = searchParams.get("reason");
  const sessionExpired = reason === "session_expired";

  useEffect(() => {
    // Só redireciona automaticamente se:
    // 1. Há sessão autenticada E
    // 2. Não foi redirecionado por sessão expirada
    if (status === "authenticated" && session?.user && !sessionExpired) {
      router.replace("/dashboard");
    }
  }, [status, session, router, sessionExpired]);

  // Se sessão expirou, mostra o formulário de login imediatamente
  // sem exibir o loading de "Verificando autenticação..."
  if (sessionExpired) {
    return <>{children}</>;
  }

  if (status === "loading" || status === "authenticated") {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 dark:from-gray-900 dark:via-blue-950 dark:to-purple-950 flex items-center justify-center p-4">
        <Card className="bg-white dark:bg-gray-800 shadow-2xl border-0 w-full max-w-md">
          <CardContent className="p-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-12 w-12 text-blue-600 dark:text-blue-400 animate-spin" />
              <div className="space-y-2">
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {status === "authenticated" ? "Redirecionando..." : "Verificando autenticação..."}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Aguarde um momento</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  return <>{children}</>;
}

// ── Formulário de login ───────────────────────────────────────────────────────

function LoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [showPassword,    setShowPassword]    = useState(false);
  const [isLoadingForm,   setIsLoadingForm]   = useState(false);
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const [error,           setError]           = useState<string | null>(null);
  const [rememberMe,      setRememberMe]      = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(REMEMBER_ME_KEY) === "true";
    }
    return false;
  });

  const form = useForm({
    resolver:      zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  // ✅ NOVO: detecta reason=session_expired e exibe aviso informativo
  const reason         = searchParams.get("reason");
  const sessionExpired = reason === "session_expired";

  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (!errorParam) return;

    const errorMessages: Record<string, string> = {
      CredentialsSignin:       "Email ou senha incorretos. Verifique suas credenciais e tente novamente.",
      OAuthSignin:             "Erro ao fazer login com Google. Tente novamente.",
      OAuthCallback:           "Erro no callback do Google. Tente novamente.",
      OAuthCreateAccount:      "Erro ao criar conta com Google. Tente novamente.",
      EmailCreateAccount:      "Erro ao criar conta. Tente novamente.",
      Callback:                "Erro no callback de autenticação. Tente novamente.",
      OAuthAccountNotLinked:   "Esta conta já está vinculada a outro método de login.",
      EmailSignin:             "Erro ao enviar email de verificação.",
      SessionRequired:         "É necessário fazer login para acessar esta página.",
      Default:                 "Ocorreu um erro ao fazer login. Tente novamente.",
    };

    setError(errorMessages[errorParam] || errorMessages.Default);
  }, [searchParams]);

  function handleRememberMeChange(checked: boolean) {
    setRememberMe(checked);
    localStorage.setItem(REMEMBER_ME_KEY, String(checked));
  }

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    setIsLoadingForm(true);
    setError(null);

    try {
      const result = await signIn("credentials", {
        email:      values.email,
        password:   values.password,
        rememberMe: String(rememberMe),
        redirect:   false,
      });

      if (result?.error) {
        if (result.error === "EMAIL_NOT_VERIFIED") {
          router.push(`/verify-email?email=${encodeURIComponent(values.email)}`);
          return;
        }
        if (result.error === "CredentialsSignin") {
          setError("Email ou senha incorretos. Verifique suas credenciais e tente novamente.");
        } else {
          setError("Ocorreu um erro ao fazer login. Tente novamente.");
        }
      } else if (result?.ok) {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err) {
      setError("Erro inesperado. Por favor, tente novamente mais tarde.");
      console.error("Erro no login:", err);
    } finally {
      setIsLoadingForm(false);
    }
  }

  async function handleGoogleLogin() {
    setIsLoadingGoogle(true);
    setError(null);
    try {
      await signIn("google", { callbackUrl: "/dashboard", redirect: true });
    } catch (err) {
      setError("Erro ao fazer login com Google. Tente novamente.");
      console.error("Erro no login Google:", err);
      setIsLoadingGoogle(false);
    }
  }

  const isAnyLoading = isLoadingForm || isLoadingGoogle;

  return (
    <>
      {/* ✅ NOVO: aviso de sessão expirada — padrão de mercado */}
      {sessionExpired && (
        <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800">
          <FiClock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertDescription className="text-amber-800 dark:text-amber-300">
            <p className="font-medium">Sua sessão expirou</p>
            <p className="text-sm mt-0.5">
              Por segurança, faça login novamente para continuar.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-2 duration-300">
          <FiAlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between gap-2">
            <span className="flex-1">{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
            >
              <FiX size={18} />
            </button>
          </AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-700 dark:text-gray-300">Email</FormLabel>
                <FormControl>
                  <div className="relative">
                    <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <Input
                      type="email"
                      placeholder="seu@email.com"
                      {...field}
                      disabled={isAnyLoading}
                      className="pl-10 h-12 border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800"
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-700 dark:text-gray-300">Senha</FormLabel>
                <FormControl>
                  <div className="relative">
                    <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      {...field}
                      disabled={isAnyLoading}
                      className="pl-10 pr-10 h-12 border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer"
                    >
                      {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox
                id="remember-me"
                checked={rememberMe}
                onCheckedChange={handleRememberMeChange}
                disabled={isAnyLoading}
              />
              <label htmlFor="remember-me" className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer select-none">
                Lembrar de mim (7 dias)
              </label>
            </div>
            <Link href="/forgot-password" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
              Esqueceu a senha?
            </Link>
          </div>

          <Button
            type="submit"
            disabled={isAnyLoading}
            className="w-full h-12 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
          >
            {isLoadingForm ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Entrando...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <FiLogIn size={20} />
                Entrar
              </div>
            )}
          </Button>
        </form>
      </Form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300 dark:border-gray-600" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-white dark:bg-gray-800 text-gray-500">Ou continue com</span>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={handleGoogleLogin}
        disabled={isAnyLoading}
        className="w-full h-12 border-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300 font-medium cursor-pointer"
      >
        {isLoadingGoogle ? (
          <>
            <div className="w-5 h-5 border-2 border-gray-700 dark:border-gray-300 border-t-transparent rounded-full animate-spin mr-2" />
            Conectando...
          </>
        ) : (
          <>
            <FcGoogle size={24} className="mr-2" />
            Entrar com Google
          </>
        )}
      </Button>

      <div className="text-center pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Ainda não tem uma conta?{" "}
          <Link href="/register" className="text-blue-600 dark:text-blue-400 hover:underline font-semibold">
            Criar conta gratuita
          </Link>
        </p>
      </div>
    </>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function LoginPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 dark:from-gray-900 dark:via-blue-950 dark:to-purple-950 flex items-center justify-center p-4">
        <Card className="bg-white dark:bg-gray-800 shadow-2xl border-0 w-full max-w-md">
          <CardContent className="p-12 text-center">
            <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto" />
          </CardContent>
        </Card>
      </main>
    }>
      <AutoLoginWrapper>
        <main className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 dark:from-gray-900 dark:via-blue-950 dark:to-purple-950 flex items-center justify-center p-4 relative overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl" />
          </div>

          <Link href="/" className="absolute top-6 left-6 flex items-center gap-2 text-white hover:text-blue-200 transition-colors group">
            <FiArrowLeft className="group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">Voltar</span>
          </Link>

          <div className="relative w-full max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              <div className="hidden lg:block text-white space-y-6">
                <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full mb-4">
                  <BsCashCoin className="text-yellow-300" size={24} />
                  <span className="font-semibold text-lg">MyExpenses</span>
                </div>
                <h1 className="text-5xl font-extrabold leading-tight">Bem-vindo de volta!</h1>
                <p className="text-xl text-blue-100 leading-relaxed">
                  Continue gerenciando suas finanças com inteligência. Seus dados estão seguros e prontos para você.
                </p>
                <div className="space-y-4 pt-4">
                  {[
                    "Acesso a todas suas transações",
                    "Dashboard com análises em tempo real",
                    "Controle completo de receitas e despesas",
                  ].map((item, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-green-400/20 flex items-center justify-center flex-shrink-0">
                        <div className="w-3 h-3 rounded-full bg-green-400" />
                      </div>
                      <span className="text-blue-100">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Card className="bg-white dark:bg-gray-800 shadow-2xl border-0">
                <CardHeader className="space-y-2 pb-6">
                  <div className="lg:hidden flex justify-center mb-4">
                    <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-full">
                      <BsCashCoin size={20} />
                      <span className="font-semibold">MyExpenses</span>
                    </div>
                  </div>
                  <CardTitle className="text-3xl font-bold text-gray-900 dark:text-white text-center">
                    Entrar na sua conta
                  </CardTitle>
                  <p className="text-center text-gray-600 dark:text-gray-400">
                    Acesse o painel e gerencie suas finanças
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <Suspense fallback={<div className="text-center py-8"><Loader2 className="h-8 w-8 text-blue-600 animate-spin mx-auto" /></div>}>
                    <LoginForm />
                  </Suspense>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </AutoLoginWrapper>
    </Suspense>
  );
}