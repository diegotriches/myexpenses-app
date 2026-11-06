"use client";

// src/app/(dashboard)/aplicacoes/page.tsx

import { useState } from "react";
import { TrendingUp } from "lucide-react";
import { useContas } from "@/hooks/useContas";
import AplicacoesTab from "@/components/aplicacao/AplicacoesTab";
import ResumoInvestimentos from "@/components/aplicacao/ResumoInvestimentos";
import RendaVariavelEmBreve from "@/components/aplicacao/RendaVariavel";

type AbaType = "renda-fixa" | "renda-variavel";

export default function AplicacoesPage() {
  const { data: contas = [], isLoading } = useContas();
  const [aba, setAba] = useState<AbaType>("renda-fixa");

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

      {/* Resumo — soma de todos os investimentos (mesmo padrão da página Contas) */}
      <ResumoInvestimentos />

      {/* Abas: renda fixa / renda variável (mesmo estilo da página Contas) */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700" role="tablist">
        {([
          { id: "renda-fixa", label: "Renda fixa", emBreve: false },
          { id: "renda-variavel", label: "Renda variável", emBreve: true },
        ] as const).map((item) => {
          const selecionada = aba === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selecionada}
              onClick={() => setAba(item.id)}
              className={[
                "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
                selecionada
                  ? "border-blue-700 text-blue-700 dark:border-blue-500 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200",
              ].join(" ")}
            >
              {item.label}
              {item.emBreve && (
                <span className="ml-2 rounded-full px-2 py-0.5 text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  Em breve
                </span>
              )}
            </button>
          );
        })}
      </div>

      {aba === "renda-fixa" ? (
        <AplicacoesTab contas={contas} />
      ) : (
        <RendaVariavelEmBreve />
      )}
    </div>
  );
}