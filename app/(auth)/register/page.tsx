// app/(auth)/register/page.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { FiUserPlus, FiMail, FiLock, FiUser, FiArrowLeft, FiEye, FiEyeOff, FiCheck, FiX } from "react-icons/fi";
import { FcGoogle } from "react-icons/fc";
import { BsCashCoin } from "react-icons/bs";
import { useState, useEffect } from "react";

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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

// Schema de validação com requisitos de senha forte
const registerSchema = z.object({
  name: z.string().min(2, "O nome deve ter ao menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string()
    .min(8, "A senha deve ter no mínimo 8 caracteres")
    .regex(/[a-z]/, "A senha deve conter pelo menos uma letra minúscula")
    .regex(/[A-Z]/, "A senha deve conter pelo menos uma letra maiúscula")
    .regex(/[0-9]/, "A senha deve conter pelo menos um número")
    .regex(/[^a-zA-Z0-9]/, "A senha deve conter pelo menos um caractere especial (!@#$%^&*)"),
});

// Tipos para os requisitos de senha
type PasswordRequirement = {
  label: string;
  validator: (password: string) => boolean;
};

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [passwordValue, setPasswordValue] = useState("");

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  // Requisitos de senha
  const passwordRequirements: PasswordRequirement[] = [
    {
      label: "Mínimo de 8 caracteres",
      validator: (pwd) => pwd.length >= 8,
    },
    {
      label: "Uma letra maiúscula (A-Z)",
      validator: (pwd) => /[A-Z]/.test(pwd),
    },
    {
      label: "Uma letra minúscula (a-z)",
      validator: (pwd) => /[a-z]/.test(pwd),
    },
    {
      label: "Um número (0-9)",
      validator: (pwd) => /[0-9]/.test(pwd),
    },
    {
      label: "Um caractere especial (!@#$%^&*)",
      validator: (pwd) => /[^a-zA-Z0-9]/.test(pwd),
    },
  ];

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

  async function handleGoogleSignIn() {
    setIsLoading(true);
    try {
      await signIn("google", { 
        callbackUrl: "/dashboard",
        redirect: true 
      });
    } catch (error) {
      console.error("Erro ao fazer login com Google:", error);
      toast({
        title: "Erro ao fazer login",
        description: "Não foi possível conectar com o Google. Tente novamente.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  }

  const onSubmit = async (values: z.infer<typeof registerSchema>) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const error = await res.json();
        toast({
          title: "Erro ao criar conta",
          description: error.message || "Tente novamente mais tarde.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Conta criada com sucesso!",
        description: "Você será redirecionado para o login.",
      });
      
      setTimeout(() => router.push("/login"), 1500);
    } catch (err) {
      toast({
        title: "Erro inesperado",
        description: "Não foi possível criar sua conta. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 dark:from-gray-900 dark:via-blue-950 dark:to-purple-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl"></div>
      </div>

      {/* Back to home button */}
      <Link
        href="/"
        className="absolute top-6 left-6 flex items-center gap-2 text-white hover:text-blue-200 transition-colors group"
      >
        <FiArrowLeft className="group-hover:-translate-x-1 transition-transform" />
        <span className="font-medium">Voltar</span>
      </Link>

      <div className="relative w-full max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          {/* Left Side - Benefits */}
          <div className="hidden lg:block text-white space-y-6">
            <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full mb-4">
              <BsCashCoin className="text-yellow-300" size={24} />
              <span className="font-semibold text-lg">MyExpenses</span>
            </div>

            <h1 className="text-5xl font-extrabold leading-tight">
              Comece a organizar suas finanças hoje!
            </h1>

            <p className="text-xl text-blue-100 leading-relaxed">
              Crie sua conta gratuitamente e tenha acesso imediato a todas as funcionalidades.
            </p>

            <div className="space-y-4 pt-4">
              {[
                { text: "100% gratuito e sem limites", highlight: true },
                { text: "Não precisa de cartão de crédito", highlight: true },
                { text: "Comece a usar em segundos", highlight: false },
                { text: "Dashboard completo com gráficos", highlight: false },
                { text: "Controle total de suas transações", highlight: false },
                { text: "Dados seguros e criptografados", highlight: false }
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full ${
                    item.highlight ? 'bg-green-400' : 'bg-green-400/20'
                  } flex items-center justify-center flex-shrink-0`}>
                    {item.highlight ? (
                      <FiCheck className="text-white" size={14} />
                    ) : (
                      <div className="w-3 h-3 rounded-full bg-green-400"></div>
                    )}
                  </div>
                  <span className={item.highlight ? 'text-white font-semibold' : 'text-blue-100'}>
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Side - Register Form */}
          <Card className="bg-white dark:bg-gray-800 shadow-2xl border-0">
            <CardHeader className="space-y-2 pb-6">
              {/* Mobile logo */}
              <div className="lg:hidden flex justify-center mb-4">
                <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-full">
                  <BsCashCoin size={20} />
                  <span className="font-semibold">MyExpenses</span>
                </div>
              </div>

              <CardTitle className="text-3xl font-bold text-gray-900 dark:text-white text-center">
                Criar sua conta
              </CardTitle>
              <p className="text-center text-gray-600 dark:text-gray-400">
                Preencha os dados para começar
              </p>
            </CardHeader>

            <CardContent className="space-y-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  {/* Name Field */}
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 dark:text-gray-300">
                          Nome completo
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <Input
                              type="text"
                              placeholder="Seu nome"
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

                  {/* Email Field */}
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 dark:text-gray-300">
                          Email
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

                  {/* Password Field */}
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 dark:text-gray-300">
                          Senha
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
                          <div className="space-y-3 mt-3 animate-in fade-in slide-in-from-top-1 duration-200">
                            {/* Strength Bar */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-600 dark:text-gray-400">
                                  Força da senha:
                                </span>
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

                            {/* Requirements Checklist */}
                            <div className="space-y-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Requisitos da senha:
                              </p>
                              {passwordRequirements.map((requirement, index) => {
                                const isValid = requirement.validator(passwordValue);
                                return (
                                  <div 
                                    key={index} 
                                    className={`flex items-center gap-2 text-xs transition-colors ${
                                      isValid 
                                        ? "text-green-600 dark:text-green-400" 
                                        : "text-gray-500 dark:text-gray-400"
                                    }`}
                                  >
                                    {isValid ? (
                                      <FiCheck className="flex-shrink-0" size={14} />
                                    ) : (
                                      <FiX className="flex-shrink-0" size={14} />
                                    )}
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

                  {/* Terms notice */}
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    Ao criar sua conta, você concorda com nossos{" "}
                    <Link href="/terms" className="text-blue-600 dark:text-blue-400 hover:underline">
                      Termos de Uso
                    </Link>{" "}
                    e{" "}
                    <Link href="/privacy" className="text-blue-600 dark:text-blue-400 hover:underline">
                      Política de Privacidade
                    </Link>
                  </p>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Criando conta...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <FiUserPlus size={20} />
                        Criar Conta Gratuita
                      </div>
                    )}
                  </Button>
                </form>
              </Form>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white dark:bg-gray-800 text-gray-500">
                    Ou registre-se com
                  </span>
                </div>
              </div>

              {/* Google Register */}
              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full h-12 border-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300 font-medium cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-gray-700 dark:border-gray-300 border-t-transparent rounded-full animate-spin mr-2"></div>
                    <span>Conectando...</span>
                  </>
                ) : (
                  <>
                    <FcGoogle size={24} className="mr-2" />
                    Continuar com Google
                  </>
                )}
              </Button>

              {/* Login Link */}
              <div className="text-center pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Já possui uma conta?{" "}
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
        </div>
      </div>
    </main>
  );
}