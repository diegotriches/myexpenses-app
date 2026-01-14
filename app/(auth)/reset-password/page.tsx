// app/(auth)/reset-password/page.tsx
"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { FiLock, FiArrowLeft, FiEye, FiEyeOff, FiCheck, FiX, FiCheckCircle } from "react-icons/fi";
import { BsCashCoin } from "react-icons/bs";
import { useState, useEffect, Suspense } from "react";

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

// Schema de validação com senha forte
const resetPasswordSchema = z.object({
  password: z.string()
    .min(8, "A senha deve ter no mínimo 8 caracteres")
    .regex(/[a-z]/, "A senha deve conter pelo menos uma letra minúscula")
    .regex(/[A-Z]/, "A senha deve conter pelo menos uma letra maiúscula")
    .regex(/[0-9]/, "A senha deve conter pelo menos um número")
    .regex(/[^a-zA-Z0-9]/, "A senha deve conter pelo menos um caractere especial (!@#$%^&*)"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

type PasswordRequirement = {
  label: string;
  validator: (password: string) => boolean;
};

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [passwordValue, setPasswordValue] = useState("");
  const [success, setSuccess] = useState(false);

  const token = searchParams.get("token");

  const form = useForm<z.infer<typeof resetPasswordSchema>>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  // Requisitos de senha
  const passwordRequirements: PasswordRequirement[] = [
    { label: "Mínimo de 8 caracteres", validator: (pwd) => pwd.length >= 8 },
    { label: "Uma letra maiúscula (A-Z)", validator: (pwd) => /[A-Z]/.test(pwd) },
    { label: "Uma letra minúscula (a-z)", validator: (pwd) => /[a-z]/.test(pwd) },
    { label: "Um número (0-9)", validator: (pwd) => /[0-9]/.test(pwd) },
    { label: "Um caractere especial (!@#$%^&*)", validator: (pwd) => /[^a-zA-Z0-9]/.test(pwd) },
  ];

  // Verificar token ao carregar página
  useEffect(() => {
    async function verifyToken() {
      if (!token) {
        setTokenError("Token não fornecido. Solicite uma nova recuperação de senha.");
        setIsVerifying(false);
        return;
      }

      try {
        const res = await fetch(`/api/auth/verify-reset-token?token=${token}`);
        const data = await res.json();

        if (data.valid) {
          setTokenValid(true);
          setUserEmail(data.email);
        } else {
          setTokenError(data.error || "Token inválido");
        }
      } catch (error) {
        setTokenError("Erro ao verificar token. Tente novamente.");
      } finally {
        setIsVerifying(false);
      }
    }

    verifyToken();
  }, [token]);

  // Calcular força da senha
  const getPasswordStrength = (password: string) => {
    const validRequirements = passwordRequirements.filter(req => req.validator(password)).length;
    const percentage = (validRequirements / passwordRequirements.length) * 100;
    
    if (percentage === 0) return { label: "", color: "bg-gray-200 dark:bg-gray-700", percentage: 0 };
    if (percentage <= 40) return { label: "Fraca", color: "bg-red-500", percentage };
    if (percentage <= 60) return { label: "Média", color: "bg-yellow-500", percentage };
    if (percentage <= 80) return { label: "Boa", color: "bg-blue-500", percentage };
    return { label: "Forte", color: "bg-green-500", percentage };
  };

  const passwordStrength = getPasswordStrength(passwordValue);

  async function onSubmit(values: z.infer<typeof resetPasswordSchema>) {
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password: values.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast({
          title: "Erro ao redefinir senha",
          description: data.error || "Tente novamente mais tarde.",
          variant: "destructive",
        });
        return;
      }

      setSuccess(true);

      toast({
        title: "Senha alterada com sucesso!",
        description: "Você será redirecionado para o login.",
      });

      setTimeout(() => router.push("/login"), 3000);
    } catch (err) {
      toast({
        title: "Erro inesperado",
        description: "Não foi possível redefinir sua senha. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Loading state
  if (isVerifying) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-600 dark:text-gray-400">Verificando token...</p>
      </div>
    );
  }

  // Token inválido
  if (!tokenValid) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertDescription>
            {tokenError}
          </AlertDescription>
        </Alert>

        <div className="text-center space-y-4">
          <Link
            href="/forgot-password"
            className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            Solicitar nova recuperação de senha
          </Link>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-6">
        <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
          <FiCheckCircle className="text-green-600 dark:text-green-400" size={40} />
        </div>

        <div className="text-center space-y-2">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
            Senha alterada com sucesso!
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Redirecionando para o login...
          </p>
        </div>

        <Link
          href="/login"
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          Ir para o login
        </Link>
      </div>
    );
  }

  // Form
  return (
    <>
      <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 mb-6">
        <AlertDescription className="text-sm text-blue-900 dark:text-blue-300">
          ✉️ Redefinindo senha para: <strong>{userEmail}</strong>
        </AlertDescription>
      </Alert>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Password Field */}
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-700 dark:text-gray-300">
                  Nova Senha
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      {...field}
                      disabled={isLoading}
                      onChange={(e) => {
                        field.onChange(e);
                        setPasswordValue(e.target.value);
                      }}
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

                {/* Password Strength Indicator */}
                {passwordValue.length > 0 && (
                  <div className="space-y-3 mt-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600 dark:text-gray-400">Força da senha:</span>
                        <span className={`font-semibold ${
                          passwordStrength.label === "Forte" ? "text-green-600 dark:text-green-400" :
                          passwordStrength.label === "Boa" ? "text-blue-600 dark:text-blue-400" :
                          passwordStrength.label === "Média" ? "text-yellow-600 dark:text-yellow-400" :
                          "text-red-600 dark:text-red-400"
                        }`}>
                          {passwordStrength.label}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${passwordStrength.color} transition-all duration-300`}
                          style={{ width: `${passwordStrength.percentage}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="space-y-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Requisitos:</p>
                      {passwordRequirements.map((requirement, index) => {
                        const isValid = requirement.validator(passwordValue);
                        return (
                          <div key={index} className={`flex items-center gap-2 text-xs ${
                            isValid ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-gray-400"
                          }`}>
                            {isValid ? <FiCheck size={14} /> : <FiX size={14} />}
                            <span>{requirement.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </FormItem>
            )}
          />

          {/* Confirm Password Field */}
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-700 dark:text-gray-300">
                  Confirmar Nova Senha
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      {...field}
                      disabled={isLoading}
                      className="pl-10 pr-10 h-12 border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer"
                    >
                      {showConfirmPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                    </button>
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
                Redefinindo...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <FiLock size={20} />
                Redefinir Senha
              </div>
            )}
          </Button>
        </form>
      </Form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 dark:from-gray-900 dark:via-blue-950 dark:to-purple-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl"></div>
      </div>

      {/* Back button */}
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
              Redefinir Senha
            </CardTitle>
            <CardDescription className="text-center">
              Escolha uma senha forte e segura para sua conta
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <Suspense fallback={
              <div className="text-center py-8">
                <div className="inline-block w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            }>
              <ResetPasswordForm />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}