"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

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

// --- Schema de cadastro ---
const registerSchema = z.object({
  name: z.string().min(2, "O nome deve ter ao menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "A senha deve ter ao menos 6 caracteres"),
});

export default function RegisterPage() {
  const router = useRouter();

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof registerSchema>) => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const error = await res.json();
        console.error(error);
        alert(error.message || "Erro ao criar conta.");
        return;
      }

      alert("Conta criada com sucesso!");
      router.push("/login");
    } catch (err) {
      console.error(err);
      alert("Erro inesperado.");
    }
  };

  return (
        <main className="flex min-h-screen items-center justify-center bg-gradient-to-r from-blue-400 to-purple-500 p-4">
            {/* Card flutuante */}
            <Card className="w-full max-w-md shadow-lg rounded-2xl transform transition-all duration-700 ease-out ">
                <CardHeader>
                    <CardTitle className="text-center text-3xl md:text-4xl font-extrabold text-gray-900">
                        Criar Conta
                    </CardTitle>
                </CardHeader>

                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                            {/* Nome */}
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nome</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="text"
                                                placeholder="Seu nome"
                                                {...field}
                                                className="border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Email */}
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="email"
                                                placeholder="seuemail@exemplo.com"
                                                {...field}
                                                className="border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Senha */}
                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Senha</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="password"
                                                placeholder="••••••••"
                                                {...field}
                                                className="border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Botão Criar Conta */}
                            <Button
                                type="submit"
                                className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-indigo-600 hover:to-blue-500 text-white font-semibold shadow-md hover:shadow-lg transition-all"
                            >
                                Criar Conta
                            </Button>
                        </form>
                    </Form>

                    {/* Link para login */}
                    <p className="text-sm text-center mt-4 text-gray-700">
                        Já possui conta?{" "}
                        <Link href="/login" className="text-blue-600 hover:underline">
                            Fazer login
                        </Link>
                    </p>
                </CardContent>

                {/* Animação fade-in */}
                <style jsx>{`
                    @keyframes fadeIn {
                        from { opacity: 0; transform: translateY(20px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    .animate-fadeIn {
                        animation: fadeIn 0.7s forwards;
                    }
                `}</style>
            </Card>
        </main>
    );
}