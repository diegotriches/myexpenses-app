"use client";

import { Card, CardContent } from "@/components/ui/card";
import { LineChart, Building2, Coins, Percent, BarChart3, Construction } from "lucide-react";

const PREVISTOS = [
  { icon: Building2, titulo: "Cadastro de ações", texto: "Registre compras e vendas de ações e FIIs." },
  { icon: Percent, titulo: "Preço médio", texto: "Acompanhe o custo médio de cada papel." },
  { icon: Coins, titulo: "Proventos", texto: "Dividendos e JCP recebidos ao longo do tempo." },
  { icon: BarChart3, titulo: "Rentabilidade", texto: "Valor atual, lucro e prejuízo da carteira." },
];

export default function RendaVariavel() {
  return (
    <Card className="border-dashed border-2 border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900/40 shadow-none">
      <CardContent className="p-6 md:p-10 space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 rounded-full bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center">
            <LineChart size={26} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex items-center justify-center gap-2">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              Renda variável
            </h2>
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              <Construction size={12} />
              Em desenvolvimento
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            Em breve você poderá cadastrar ações de empresas e acompanhar sua carteira de renda
            variável por aqui, junto com a renda fixa.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
          {PREVISTOS.map(({ icon: Icon, titulo, texto }) => (
            <div
              key={titulo}
              className="flex items-start gap-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-3"
            >
              <Icon size={18} className="text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{titulo}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{texto}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}