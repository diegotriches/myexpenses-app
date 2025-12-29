"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BsCashCoin } from "react-icons/bs";
import { FiHome, FiArrowLeft, FiSearch, FiAlertCircle } from "react-icons/fi";

function NotFound() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 dark:from-gray-900 dark:via-blue-950 dark:to-purple-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-2xl mx-auto text-center space-y-8">
        {/* Logo/Brand */}
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-sm px-6 py-3 rounded-full">
            <BsCashCoin className="text-yellow-300" size={28} />
            <span className="font-bold text-xl text-white">MyExpenses</span>
          </div>
        </div>

        {/* 404 Number - Large and animated */}
        <div className="relative">
          <div className="text-[180px] md:text-[240px] font-extrabold leading-none text-white/10 select-none">
            404
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <FiAlertCircle className="text-white/80 animate-pulse" size={80} />
          </div>
        </div>

        {/* Message */}
        <div className="space-y-4 -mt-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white">
            Página não encontrada
          </h1>
          <p className="text-xl text-blue-100 max-w-md mx-auto">
            Ops! A página que você está procurando não existe ou foi movida.
          </p>
        </div>

        {/* Suggestions */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 max-w-md mx-auto">
          <p className="text-white/90 mb-4 font-medium">
            Sugestões do que fazer:
          </p>
          <ul className="space-y-2 text-left text-blue-100">
            <li className="flex items-start gap-2">
              <span className="text-green-300 mt-1">✓</span>
              <span>Verificar se o endereço está correto</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-300 mt-1">✓</span>
              <span>Voltar à página anterior</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-300 mt-1">✓</span>
              <span>Ir para a página inicial</span>
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
          <button
            onClick={() => router.back()}
            className="group px-8 py-4 rounded-xl font-semibold border-2 border-white text-white hover:bg-white/10 backdrop-blur-sm transition-all duration-300 flex items-center gap-2 min-w-[200px] justify-center"
          >
            <FiArrowLeft className="group-hover:-translate-x-1 transition-transform" size={20} />
            Voltar
          </button>

          <Link
            href="/"
            className="group px-8 py-4 rounded-xl font-bold bg-white text-blue-700 hover:bg-blue-50 shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center gap-2 min-w-[200px] justify-center transform hover:scale-105"
          >
            <FiHome size={20} />
            Página Inicial
            <FiSearch className="group-hover:rotate-12 transition-transform" size={18} />
          </Link>
        </div>

        {/* Help text */}
        <p className="text-sm text-blue-200 pt-4">
          Precisa de ajuda?{" "}
          <Link href="/contato" className="text-white hover:underline font-semibold">
            Entre em contato
          </Link>
        </p>
      </div>
    </main>
  );
}

export default NotFound;