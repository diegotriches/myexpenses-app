"use client";

import { useState } from "react";
import { TrendingUp } from "lucide-react";
import { useContas } from "@/hooks/useContas";
import AplicacoesTab from "@/components/aplicacoes/AplicacoesTab";
import ResumoInvestimentos from "@/components/aplicacoes/ResumoInvestimentos";
import ResumoRendaVariavel from "@/components/renda-variavel/ResumoRendaVariavel";
import RendaVariavel from "@/components/renda-variavel/RendaVariavel";
import { PageHeader } from "@/components/common/PageHeader";
import { AbasSecao } from "@/components/common/AbasSecao";

type AbaType = "renda-fixa" | "renda-variavel";

export default function AplicacoesPage() {
  const { data: contas = [], isLoading } = useContas();
  const [aba, setAba] = useState<AbaType>("renda-fixa");

  if (isLoading) {
    return (
      <div className="page-container p-4 md:p-6">
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700" />
        </div>
      </div>
    );
  }

  return (
    <div className="page-container p-4 md:p-6 space-y-6">
      <PageHeader
        icone={TrendingUp}
        titulo="Aplicações"
        descricao="Acompanhe seus investimentos em renda fixa e renda variável"
      />

      {/* Resumo da aba selecionada (mesmo padrão de cards compactos das outras páginas) */}
      {aba === "renda-fixa" ? <ResumoInvestimentos /> : <ResumoRendaVariavel />}

      {/* Abas: renda fixa / renda variável (mesmo estilo da página Contas) */}
      <AbasSecao
        ariaLabel="Tipo de investimento"
        abas={[
          { id: "renda-fixa", rotulo: "Renda fixa" },
          { id: "renda-variavel", rotulo: "Renda variável" },
        ] as const}
        ativa={aba}
        onChange={setAba}
      />

      {aba === "renda-fixa" ? (
        <AplicacoesTab contas={contas} />
      ) : (
        <RendaVariavel contas={contas} />
      )}
    </div>
  );
}