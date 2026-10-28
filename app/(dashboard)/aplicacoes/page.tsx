"use client";

// src/app/(dashboard)/aplicacoes/page.tsx

import { TrendingUp } from "lucide-react";
import { useContas } from "@/hooks/useContas";
import AplicacoesTab from "@/components/aplicacao/AplicacoesTab";

export default function AplicacoesPage() {
  const { data: contas = [], isLoading } = useContas();

  if (isLoading) {
    return (
      <div className="max-w-[1200px] mx-auto p-4 md:p-6">
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto p-4 md:p-6 space-y-6">
      {/* Cabeçalho — mesmo padrão das outras páginas do app */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="text-2xl md:text-3xl text-blue-700 dark:text-blue-500" />
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
            Aplicações
          </h1>
        </div>

        <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
          Acompanhe seus valores aplicados e o rendimento diário
        </p>

        <hr className="border-t border-gray-300 dark:border-gray-700 my-4" />
      </div>

      <AplicacoesTab contas={contas} />
    </div>
  );
}