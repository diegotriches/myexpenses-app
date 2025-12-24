"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { FiLogIn } from "react-icons/fi";

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

// --- Schema de validação ---
const loginSchema = z.object({
    email: z.string().email("Email inválido"),
    password: z.string().min(6, "A senha deve ter ao menos 6 caracteres"),
});

export default function LoginPage() {
    const form = useForm({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });

    async function onSubmit(values: z.infer<typeof loginSchema>) {
        await signIn("credentials", {
            email: values.email,
            password: values.password,
            callbackUrl: "/dashboard",
        });
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-gradient-to-r from-blue-400 to-purple-500 p-4">
            <Card className="w-full max-w-4xl shadow-lg rounded-2xl transform transition-all duration-700 ease-out flex flex-col md:flex-row overflow-hidden">
                {/* Coluna esquerda decorativa */}
                <div className="hidden md:flex flex-1 bg-gradient-to-b from-indigo-600 to-purple-500 text-white p-10 justify-center items-center relative">
                    <div className="space-y-4">
                        <h2 className="text-3xl font-bold">Bem-vindo de volta!</h2>
                        <p className="text-lg text-indigo-100">
                            Faça login para acessar sua conta e gerenciar seus gastos.
                        </p>
                        <div className="absolute bottom-4 left-4 opacity-20 text-6xl select-none">My Expenses</div>
                    </div>
                </div>

                {/* Coluna direita - formulário */}
                <div className="flex-1 p-10">
                    <CardHeader>
                        <CardTitle className="text-3xl md:text-4xl font-extrabold text-gray-900 text-center">
                            Login
                        </CardTitle>
                    </CardHeader>

                    <CardContent>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

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

                                {/* Botão Login */}
                                <Button
                                    type="submit"
                                    className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-indigo-600 hover:to-blue-500 text-white font-semibold shadow-md hover:shadow-lg transition-all cursor-pointer"
                                >
                                    Entrar
                                </Button>
                            </form>
                        </Form>

                        {/* Link para registro */}
                        <p className="text-sm text-center mt-4 text-gray-700">
                            Ainda não possui conta?{" "}
                            <Link href="/register" className="text-blue-600 hover:underline">
                                Criar conta
                            </Link>
                        </p>
                    </CardContent>
                </div>
            </Card>
        </main>
    );
}