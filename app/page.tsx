"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { BsCashCoin } from "react-icons/bs";
import {
  FiTrendingUp,
  FiDollarSign,
  FiPieChart,
  FiShield,
  FiArrowRight,
  FiChevronDown,
  FiCode,
  FiDatabase,
  FiLayers,
  FiZap,
  FiLock,
  FiSun,
  FiMoon
} from "react-icons/fi";
import { AutoRedirectIfAuthenticated } from "@/components/auth/AutoRedirectIfAuthenticated";
import HeroDemo from "@/components/landing/HeroDemo";
import { useMounted } from "@/hooks/useMounted";

export default function LandingPage() {
  const [techStackOpen, setTechStackOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();

  return (
    <AutoRedirectIfAuthenticated
      redirectTo="/dashboard"
      showInlineIndicator
      inlineIndicatorMessage="Verificando login salvo..."
    >
      <main className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 dark:from-gray-900 dark:via-blue-950 dark:to-purple-950">
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
          </div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 lg:pt-20 lg:pb-28">
            {mounted && (
              <div className="fixed top-6 right-6 z-50">
                <button
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="group p-3 bg-white/10 backdrop-blur-sm hover:bg-white/20 rounded-full border border-white/20 transition-all shadow-lg hover:shadow-xl hover:scale-110"
                  aria-label="Alternar tema"
                >
                  {theme === "dark" ? (
                    <FiSun className="text-yellow-300 group-hover:rotate-180 transition-transform duration-500" size={24} />
                  ) : (
                    <FiMoon className="text-blue-200 group-hover:-rotate-12 transition-transform duration-500" size={24} />
                  )}
                </button>
              </div>
            )}

            <div className="flex justify-center lg:justify-start mb-10 lg:mb-8">
              <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-sm px-6 py-3 rounded-full border border-white/20 hover:bg-white/20 transition-all">
                <BsCashCoin className="text-yellow-300" size={32} />
                <span className="font-bold text-2xl text-white">MyExpenses</span>
              </div>
            </div>

            {/* ✅ NOVO: Hero em duas colunas — texto à esquerda, demo em
                vídeo em destaque à direita (empilha no mobile) */}
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
              <div className="text-center lg:text-left text-white space-y-6">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight animate-fade-in">
                  Controle suas finanças
                  <br />
                  <span className="text-yellow-300 bg-gradient-to-r from-yellow-200 to-yellow-400 bg-clip-text text-transparent">
                    de forma simples
                  </span>
                </h1>

                <p className="text-lg md:text-xl text-blue-100 max-w-xl mx-auto lg:mx-0 leading-relaxed animate-fade-in-delay">
                  Gerencie suas receitas, despesas e investimentos em um só lugar.
                  Visualize seus gastos com gráficos intuitivos e tome decisões financeiras inteligentes.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-4 animate-fade-in-delay-2">
                  <Link
                    href="/register"
                    className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-blue-600 font-bold text-lg rounded-full hover:bg-blue-50 transition-all shadow-xl hover:shadow-2xl hover:scale-105"
                  >
                    Começar Gratuitamente
                    <FiArrowRight size={24} className="group-hover:translate-x-1 transition-transform" />
                  </Link>

                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 backdrop-blur-sm text-white font-semibold text-lg rounded-full hover:bg-white/20 transition-all border-2 border-white/30 hover:border-white/50"
                  >
                    Já tenho conta
                  </Link>
                </div>

                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6 pt-6 text-blue-100">
                  <div className="flex items-center gap-2 group">
                    <FiShield size={18} className="group-hover:text-green-300 transition-colors" />
                    <span className="text-sm">100% Seguro</span>
                  </div>
                  <div className="flex items-center gap-2 group">
                    <FiDollarSign size={18} className="group-hover:text-yellow-300 transition-colors" />
                    <span className="text-sm">Gratuito</span>
                  </div>
                  <div className="flex items-center gap-2 group">
                    <FiTrendingUp size={18} className="group-hover:text-green-300 transition-colors" />
                    <span className="text-sm">Fácil de usar</span>
                  </div>
                </div>
              </div>

              {/* ✅ NOVO: showcase de vídeo — o destaque visual principal do Hero */}
              <div className="animate-fade-in-delay-2">
                <HeroDemo />
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-white dark:bg-gray-900 transition-colors">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Tudo que você precisa para controlar suas finanças
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400">
                Ferramentas poderosas para gerenciar seu dinheiro
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="group p-8 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
                <div className="w-16 h-16 bg-blue-600 dark:bg-blue-500 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <FiDollarSign className="text-white" size={32} />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Controle Total</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Registre todas suas receitas e despesas. Organize por categorias e acompanhe cada centavo.
                </p>
              </div>

              <div className="group p-8 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
                <div className="w-16 h-16 bg-purple-600 dark:bg-purple-500 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <FiPieChart className="text-white" size={32} />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Visualização Clara</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Gráficos intuitivos mostram para onde seu dinheiro está indo. Entenda seus padrões de gastos.
                </p>
              </div>

              <div className="group p-8 bg-gradient-to-br from-green-50 to-teal-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
                <div className="w-16 h-16 bg-green-600 dark:bg-green-500 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <FiTrendingUp className="text-white" size={32} />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Decisões Inteligentes</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Análises detalhadas ajudam você a tomar decisões financeiras mais inteligentes.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Tech Stack Section */}
        <section className="py-16 bg-gray-50 dark:bg-gray-800 transition-colors">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <button onClick={() => setTechStackOpen(!techStackOpen)} className="w-full group">
              <div className="flex items-center justify-between p-6 bg-white dark:bg-gray-900 rounded-2xl shadow-lg hover:shadow-xl transition-all border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                    <FiCode className="text-white" size={24} />
                  </div>
                  <div className="text-left">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Tecnologias Utilizadas</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Desenvolvido com as melhores ferramentas do mercado</p>
                  </div>
                </div>
                <FiChevronDown className={"text-gray-400 transition-transform duration-300 " + (techStackOpen ? "rotate-180" : "")} size={24} />
              </div>
            </button>

            <div className={"overflow-hidden transition-all duration-500 ease-in-out " + (techStackOpen ? "max-h-[2000px] opacity-100 mt-6" : "max-h-0 opacity-0")}>
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 border border-gray-200 dark:border-gray-700">
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                        <FiLayers className="text-blue-600 dark:text-blue-400" size={20} />
                      </div>
                      <h4 className="text-lg font-bold text-gray-900 dark:text-white">Frontend</h4>
                    </div>
                    <div className="space-y-3 pl-2">
                      <TechItem name="Next.js 15" description="Framework React com SSR" />
                      <TechItem name="TypeScript" description="Tipagem estática" />
                      <TechItem name="Tailwind CSS" description="Estilização moderna" />
                      <TechItem name="shadcn/ui" description="Componentes reutilizáveis" />
                      <TechItem name="React Query" description="Gerenciamento de estado" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                        <FiZap className="text-purple-600 dark:text-purple-400" size={20} />
                      </div>
                      <h4 className="text-lg font-bold text-gray-900 dark:text-white">Backend</h4>
                    </div>
                    <div className="space-y-3 pl-2">
                      <TechItem name="Next.js API Routes" description="APIs serverless" />
                      <TechItem name="NextAuth.js" description="Autenticação OAuth" />
                      <TechItem name="Drizzle ORM" description="Type-safe database" />
                      <TechItem name="Nodemailer" description="Envio de e-mails via Gmail" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                        <FiDatabase className="text-green-600 dark:text-green-400" size={20} />
                      </div>
                      <h4 className="text-lg font-bold text-gray-900 dark:text-white">Database</h4>
                    </div>
                    <div className="space-y-3 pl-2">
                      <TechItem name="PostgreSQL" description="Banco relacional robusto" />
                      <TechItem name="Neon" description="Serverless Postgres" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center">
                        <FiLock className="text-red-600 dark:text-red-400" size={20} />
                      </div>
                      <h4 className="text-lg font-bold text-gray-900 dark:text-white">Segurança e Qualidade</h4>
                    </div>
                    <div className="space-y-3 pl-2">
                      <TechItem name="bcryptjs" description="Hash de senhas" />
                      <TechItem name="Zod" description="Validação de schemas" />
                      <TechItem name="ESLint" description="Qualidade de código" />
                    </div>
                  </div>
                </div>

                <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-900 rounded-xl">
                  <p className="text-sm text-blue-800 dark:text-blue-200 text-center">
                    Desenvolvido com tecnologias modernas e escaláveis para garantir performance e segurança.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-900 dark:to-purple-900 transition-colors">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl font-bold text-white mb-6">Pronto para começar?</h2>
            <p className="text-xl text-blue-100 mb-8">
              Crie sua conta gratuitamente e comece a organizar suas finanças hoje mesmo.
            </p>
            <Link
              href="/register"
              className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-blue-600 font-bold text-lg rounded-full hover:bg-blue-50 transition-all shadow-xl hover:shadow-2xl hover:scale-105"
            >
              Criar Conta Grátis
              <FiArrowRight size={24} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-8 bg-gray-900 dark:bg-black text-gray-400 dark:text-gray-500 text-center transition-colors">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-2">
                <BsCashCoin className="text-blue-400" size={20} />
                <span className="font-semibold text-gray-300">MyExpenses</span>
              </div>
              <p className="text-sm">
                &copy; {new Date().getFullYear()} MyExpenses. Todos os direitos reservados.
              </p>
              <div className="flex items-center gap-6 text-sm">
                <Link href="/privacy" className="text-gray-500 hover:text-gray-300 transition-colors">
                  Política de Privacidade
                </Link>
                <span className="text-gray-700">|</span>
                <Link href="/terms" className="text-gray-500 hover:text-gray-300 transition-colors">
                  Termos de Uso
                </Link>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </AutoRedirectIfAuthenticated>
  );
}

function TechItem({ name, description }: { name: string; description: string }) {
  return (
    <div className="flex items-start gap-3 group">
      <div className="w-1.5 h-1.5 bg-blue-600 dark:bg-blue-400 rounded-full mt-2 group-hover:scale-150 transition-transform" />
      <div>
        <p className="font-semibold text-gray-900 dark:text-white text-sm">{name}</p>
        <p className="text-xs text-gray-600 dark:text-gray-400">{description}</p>
      </div>
    </div>
  );
}