"use client"

import Link from "next/link";
import { FiLogIn, FiUserPlus } from "react-icons/fi";
import { FcGoogle } from "react-icons/fc";

export default function LandingPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-r from-blue-400 to-purple-500 p-6">
      <div className="bg-white shadow-lg hover:shadow-2xl transform hover:-translate-y-1 transition-all rounded-2xl p-10 max-w-md w-full text-center">
        <h1 className="text-4xl font-extrabold mb-4 text-gray-800">MyExpenses</h1>

        <p className="text-gray-500 mb-8 text-lg">
          Transforme a forma como você lida com seu dinheiro: mais controle, mais clareza e menos preocupações.
        </p>

        <div className="flex flex-col gap-4">
          <Link
            href="/login"
            className="w-full py-3 rounded-xl text-white font-semibold bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-indigo-600 hover:to-blue-500 shadow-md hover:shadow-lg transition flex items-center justify-center gap-2"
          >
            <FiLogIn size={20} />
            Entrar
          </Link>

          <Link
            href="/register"
            className="w-full py-3 rounded-xl font-semibold border border-gray-300 hover:bg-gray-100 transition flex items-center justify-center gap-2"
          >
            <FiUserPlus size={20} />
            Criar Conta
          </Link>

          <button
            className="flex items-center justify-center gap-3 w-full py-3 rounded-xl border border-gray-300 hover:bg-gray-100 transition font-medium"
            onClick={() => {
              console.log("Login com Google");
            }}
          >
            <FcGoogle size={24} />
            Entrar com Google
          </button>
        </div>
      </div>
    </main>
  );
}