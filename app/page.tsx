"use client";

import Link from "next/link";
import { BsCashCoin } from "react-icons/bs";
import { FiTrendingUp, FiDollarSign, FiPieChart, FiShield, FiArrowRight } from "react-icons/fi";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 dark:from-gray-900 dark:via-blue-950 dark:to-purple-950">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32">
          {/* Logo */}
          <div className="flex justify-center mb-12">
            <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-sm px-6 py-3 rounded-full">
              <BsCashCoin className="text-yellow-300" size={32} />
              <span className="font-bold text-2xl text-white">MyExpenses</span>
            </div>
          </div>

          {/* Hero Content */}
          <div className="text-center text-white space-y-8">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold leading-tight">
              Controle suas finanças
              <br />
              <span className="text-yellow-300">de forma simples</span>
            </h1>

            <p className="text-xl md:text-2xl text-blue-100 max-w-3xl mx-auto leading-relaxed">
              Gerencie suas receitas, despesas e investimentos em um só lugar.
              Visualize seus gastos com gráficos intuitivos e tome decisões financeiras inteligentes.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-blue-600 font-bold text-lg rounded-full hover:bg-blue-50 transition-all shadow-xl hover:shadow-2xl hover:scale-105"
              >
                Começar Gratuitamente
                <FiArrowRight size={24} />
              </Link>

              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 backdrop-blur-sm text-white font-semibold text-lg rounded-full hover:bg-white/20 transition-all border-2 border-white/30"
              >
                Já tenho conta
              </Link>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap items-center justify-center gap-8 pt-12 text-blue-100">
              <div className="flex items-center gap-2">
                <FiShield size={20} />
                <span>100% Seguro</span>
              </div>
              <div className="flex items-center gap-2">
                <FiDollarSign size={20} />
                <span>Gratuito</span>
              </div>
              <div className="flex items-center gap-2">
                <FiTrendingUp size={20} />
                <span>Fácil de usar</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white dark:bg-gray-900">
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
            {/* Feature 1 */}
            <div className="p-8 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mb-6">
                <FiDollarSign className="text-white" size={32} />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                Controle Total
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Registre todas suas receitas e despesas. Organize por categorias e acompanhe cada centavo.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-8 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mb-6">
                <FiPieChart className="text-white" size={32} />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                Visualização Clara
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Gráficos intuitivos mostram para onde seu dinheiro está indo. Entenda seus padrões de gastos.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-8 bg-gradient-to-br from-green-50 to-teal-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mb-6">
                <FiTrendingUp className="text-white" size={32} />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                Decisões Inteligentes
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Análises detalhadas ajudam você a tomar decisões financeiras mais inteligentes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-900 dark:to-purple-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Pronto para começar?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Crie sua conta gratuitamente e comece a organizar suas finanças hoje mesmo.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-blue-600 font-bold text-lg rounded-full hover:bg-blue-50 transition-all shadow-xl hover:shadow-2xl hover:scale-105"
          >
            Criar Conta Grátis
            <FiArrowRight size={24} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-gray-900 text-gray-400 text-center">
        <div className="max-w-7xl mx-auto px-4">
          <p>&copy; 2024 MyExpenses. Todos os direitos reservados.</p>
        </div>
      </footer>
    </main>
  );
}