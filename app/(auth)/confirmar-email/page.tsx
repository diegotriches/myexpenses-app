"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { FiArrowLeft } from "react-icons/fi";
import { Loader2, MailX, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authService } from "@/services/authService";
import { mensagemDoErro } from "@/services/http";
import { LogoMarca } from "@/components/common/LogoMarca";

type Estado =
  | { status: "confirmando" }
  | { status: "sucesso"; email: string }
  | { status: "erro"; mensagem: string };

// ── Conteúdo ──────────────────────────────────────────────────────────────────

function ConfirmarEmailContent() {
  const token = useSearchParams().get("token");
  const queryClient = useQueryClient();
  const [estado, setEstado] = useState<Estado>(
    token ? { status: "confirmando" } : { status: "erro", mensagem: "Link incompleto: o token não foi informado." },
  );

  // O link vale uma vez só: a ref evita a segunda chamada do modo estrito do React,
  // que acharia o link já usado e mostraria erro depois do sucesso
  const enviado = useRef(false);
  useEffect(() => {
    if (!token || enviado.current) return;
    enviado.current = true;
    authService
      .confirmarTrocaEmail(token)
      .then(({ email }) => {
        // Se a sessão estiver aberta nesta aba, o perfil em cache mostraria o e-mail antigo
        queryClient.invalidateQueries({ queryKey: ["profile"] });
        setEstado({ status: "sucesso", email });
      })
      .catch((erro) => setEstado({ status: "erro", mensagem: mensagemDoErro(erro, "Erro de conexão. Tente novamente.") }));
  }, [token, queryClient]);

  if (estado.status === "confirmando") {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
        <p className="text-sm text-gray-600 dark:text-gray-400">Confirmando o novo e-mail...</p>
      </div>
    );
  }

  if (estado.status === "sucesso") {
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
        </div>
        <div className="space-y-2">
          <p className="text-xl font-bold text-gray-900 dark:text-white">E-mail alterado!</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Sua conta agora usa <strong>{estado.email}</strong>. Se você entra com e-mail e senha,
            use o novo endereço no próximo login.
          </p>
        </div>
        <Link
          href="/perfil"
          className="w-full h-11 mt-2 inline-flex items-center justify-center rounded-md bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold"
        >
          Ir para o perfil
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 py-4 text-center">
      <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
        <MailX className="h-12 w-12 text-red-600 dark:text-red-400" />
      </div>
      <div className="space-y-2">
        <p className="text-xl font-bold text-gray-900 dark:text-white">Não foi possível trocar o e-mail</p>
        <p className="text-sm text-gray-600 dark:text-gray-400">{estado.mensagem}</p>
      </div>
      <Link href="/perfil" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
        Ir para o perfil
      </Link>
    </div>
  );
}

// ── Página ────────────────────────────────────────────────────────────────────

export default function ConfirmarEmailPage() {
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
                <LogoMarca tamanho={24} className="ring-1 ring-white/40 shadow-md" />
                <span className="font-semibold">MyExpenses</span>
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white text-center">
              Troca de E-mail
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense fallback={
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
              </div>
            }>
              <ConfirmarEmailContent />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
