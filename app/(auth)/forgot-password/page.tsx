// app/(auth)/forgot-password/page.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { FiMail, FiArrowLeft, FiSend, FiCheckCircle } from "react-icons/fi";
import { BsCashCoin } from "react-icons/bs";
import { useState } from "react";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

const forgotPasswordSchema = z.object({
  email: z.string().email("Email inválido"),
});

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const form = useForm<z.infer<typeof forgotPasswordSchema>>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(values: z.infer<typeof forgotPasswordSchema>) {
    setIsLoading(true);

    try {
      // ✅ CONECTADO COM API REAL
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = await res.json();

      if (!res.ok) {
        // Erro da API (400, 500, etc)
        toast({
          title: "Erro ao enviar email",
          description: data.error || "Não foi possível enviar o email de recuperação. Tente novamente.",
          variant: "destructive",
        });
        return;
      }

      // ✅ SUCESSO - Sempre mostra mensagem genérica (segurança)
      setEmailSent(true);

      toast({
        title: "Email enviado!",
        description: "Verifique sua caixa de entrada para redefinir sua senha.",
      });
    } catch (error) {
      console.error("Erro ao enviar email:", error);
      toast({
        title: "Erro ao enviar email",
        description: "Não foi possível enviar o email de recuperação. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 dark:from-gray-900 dark:via-blue-950 dark:to-purple-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl"></div>
      </div>

      {/* Back to login button */}
      <Link
        href="/login"
        className="absolute top-6 left-6 flex items-center gap-2 text-white hover:text-blue-200 transition-colors group"
      >
        <FiArrowLeft className="group-hover:-translate-x-1 transition-transform" />
        <span className="font-medium">Voltar ao login</span>
      </Link>

      <div className="relative w-full max-w-md mx-auto">
        <Card className="bg-white dark:bg-gray-800 shadow-2xl border-0">
          <CardHeader className="space-y-2 pb-6">
            {/* Logo */}
            <div className="flex justify-center mb-4">
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-full">
                <BsCashCoin size={20} />
                <span className="font-semibold">MyExpenses</span>
              </div>
            </div>

            <CardTitle className="text-3xl font-bold text-gray-900 dark:text-white text-center">
              {emailSent ? "Email enviado!" : "Esqueceu sua senha?"}
            </CardTitle>
            <CardDescription className="text-center">
              {emailSent 
                ? "Verifique sua caixa de entrada e siga as instruções para redefinir sua senha."
                : "Não se preocupe, isso acontece! Digite seu email e enviaremos instruções para redefinir sua senha."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {!emailSent ? (
              <>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    {/* Email Field */}
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700 dark:text-gray-300">
                            Email cadastrado
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                              <Input
                                type="email"
                                placeholder="seu@email.com"
                                {...field}
                                disabled={isLoading}
                                className="pl-10 h-12 border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Submit Button */}
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-12 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
                    >
                      {isLoading ? (
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          Enviando...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <FiSend size={20} />
                          Enviar instruções
                        </div>
                      )}
                    </Button>
                  </form>
                </Form>

                {/* Info Alert */}
                <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                  <AlertDescription className="text-sm text-blue-900 dark:text-blue-300">
                    💡 Lembre-se de verificar sua pasta de spam se não encontrar o email.
                  </AlertDescription>
                </Alert>
              </>
            ) : (
              <>
                {/* Success State */}
                <div className="flex flex-col items-center justify-center py-8 space-y-6">
                  <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                    <FiCheckCircle className="text-green-600 dark:text-green-400" size={40} />
                  </div>

                  <div className="text-center space-y-2">
                    <p className="text-gray-700 dark:text-gray-300">
                      Enviamos um email para:
                    </p>
                    <p className="font-semibold text-lg text-gray-900 dark:text-white">
                      {form.getValues("email")}
                    </p>
                  </div>

                  <Alert className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
                    <AlertDescription className="text-sm text-yellow-900 dark:text-yellow-300">
                      ⚠️ O link de recuperação expira em 1 hora.
                    </AlertDescription>
                  </Alert>

                  <Button
                    onClick={() => setEmailSent(false)}
                    variant="outline"
                    className="w-full cursor-pointer"
                  >
                    Enviar novamente
                  </Button>
                </div>
              </>
            )}

            {/* Back to Login */}
            <div className="text-center pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Lembrou sua senha?{" "}
                <Link
                  href="/login"
                  className="text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                >
                  Fazer login
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Help Section */}
        <div className="mt-8 text-center text-white space-y-2">
          <p className="text-sm">Ainda precisa de ajuda?</p>
          <Link
            href="mailto:suporte@myexpenses.com"
            className="text-sm text-blue-200 hover:text-white hover:underline font-medium"
          >
            Entre em contato com o suporte
          </Link>
        </div>
      </div>
    </main>
  );
}