"use client"

import Link from "next/link";
import { FiLogIn, FiUserPlus, FiTrendingUp, FiPieChart, FiCreditCard, FiShield, FiZap, FiCheckCircle } from "react-icons/fi";
import { FcGoogle } from "react-icons/fc";
import { BsCashCoin } from "react-icons/bs";

export default function LandingPage() {
  const features = [
    {
      icon: FiTrendingUp,
      title: "Controle Total",
      description: "Acompanhe todas suas receitas e despesas em tempo real"
    },
    {
      icon: FiPieChart,
      title: "Análises Inteligentes",
      description: "Gráficos e relatórios para entender seus hábitos financeiros"
    },
    {
      icon: FiCreditCard,
      title: "Múltiplas Contas",
      description: "Gerencie contas bancárias e cartões em um só lugar"
    },
    {
      icon: FiShield,
      title: "100% Seguro",
      description: "Seus dados protegidos com criptografia de ponta"
    }
  ];

  const benefits = [
    "Dashboard intuitivo e fácil de usar",
    "Categorias personalizáveis",
    "Controle de parcelamentos e recorrências",
    "Modo noturno para conforto visual",
    "Exportação de relatórios",
    "Acesso em qualquer dispositivo"
  ];

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 dark:from-gray-900 dark:via-blue-950 dark:to-purple-950">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl"></div>
        </div>

        <div className="relative container mx-auto px-6 py-16 md:py-24">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
            {/* Left Content */}
            <div className="flex-1 text-center lg:text-left text-white">
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
                <BsCashCoin className="text-yellow-300" size={20} />
                <span className="text-sm font-medium">Gestão Financeira Inteligente</span>
              </div>

              <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold mb-6 leading-tight">
                MyExpenses
              </h1>

              <p className="text-xl md:text-2xl mb-4 text-blue-100">
                Transforme a forma como você lida com seu dinheiro
              </p>

              <p className="text-lg mb-8 text-blue-200 max-w-2xl mx-auto lg:mx-0">
                Mais controle, mais clareza e menos preocupações. Gerencie suas finanças com inteligência e alcance seus objetivos.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8">
                <Link
                  href="/register"
                  className="group px-8 py-4 rounded-xl text-blue-700 font-bold bg-white hover:bg-blue-50 shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center justify-center gap-2 transform hover:scale-105"
                >
                  <FiUserPlus size={20} />
                  Começar Gratuitamente
                  <FiZap className="group-hover:rotate-12 transition-transform" size={18} />
                </Link>

                <Link
                  href="/login"
                  className="px-8 py-4 rounded-xl font-semibold border-2 border-white text-white hover:bg-white/10 backdrop-blur-sm transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <FiLogIn size={20} />
                  Já tenho conta
                </Link>
              </div>

              {/* Social Proof */}
              <div className="flex items-center gap-6 justify-center lg:justify-start text-sm text-blue-100">
                <div className="flex items-center gap-2">
                  <FiCheckCircle className="text-green-300" />
                  <span>Gratuito</span>
                </div>
                <div className="flex items-center gap-2">
                  <FiCheckCircle className="text-green-300" />
                  <span>Sem cartão</span>
                </div>
                <div className="flex items-center gap-2">
                  <FiCheckCircle className="text-green-300" />
                  <span>Ilimitado</span>
                </div>
              </div>
            </div>

            {/* Right - Auth Card */}
            <div className="flex-1 w-full max-w-md">
              <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 transform hover:scale-105 transition-transform duration-300">
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-4">
                    <BsCashCoin className="text-white" size={32} />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                    Acesse sua conta
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    Entre e gerencie suas finanças
                  </p>
                </div>

                <div className="space-y-3">
                  <Link
                    href="/login"
                    className="w-full py-4 rounded-xl text-white font-semibold bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    <FiLogIn size={20} />
                    Entrar com E-mail
                  </Link>

                  <button
                    className="flex items-center justify-center gap-3 w-full py-4 rounded-xl border-2 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300 font-medium text-gray-700 dark:text-gray-300 shadow-sm hover:shadow-md"
                    onClick={() => {
                      console.log("Login com Google");
                    }}
                  >
                    <FcGoogle size={24} />
                    Continuar com Google
                  </button>

                  <div className="relative py-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 bg-white dark:bg-gray-800 text-gray-500">
                        Novo por aqui?
                      </span>
                    </div>
                  </div>

                  <Link
                    href="/register"
                    className="w-full py-4 rounded-xl font-semibold border-2 border-blue-500 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 transition-all duration-300 flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                  >
                    <FiUserPlus size={20} />
                    Criar Conta Gratuita
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-white dark:bg-gray-900 py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Tudo que você precisa para controlar suas finanças
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Ferramentas poderosas e intuitivas para você ter o controle total do seu dinheiro
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="group p-6 rounded-2xl border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-xl transition-all duration-300 bg-white dark:bg-gray-800"
                >
                  <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Icon className="text-blue-600 dark:text-blue-400" size={28} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-900 py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
                Por que escolher o MyExpenses?
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {benefits.map((benefit, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex-shrink-0 w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                    <FiCheckCircle className="text-green-600 dark:text-green-400" size={20} />
                  </div>
                  <span className="text-gray-800 dark:text-gray-200 font-medium">
                    {benefit}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-900 dark:to-purple-900 py-20">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Pronto para começar?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Junte-se a milhares de pessoas que já transformaram sua relação com o dinheiro
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-10 py-5 rounded-xl text-blue-700 font-bold bg-white hover:bg-blue-50 shadow-2xl hover:shadow-3xl transition-all duration-300 text-lg transform hover:scale-105"
          >
            <FiUserPlus size={24} />
            Criar Conta Grátis Agora
            <FiZap size={20} />
          </Link>
        </div>
      </section>
    </main>
  );
}