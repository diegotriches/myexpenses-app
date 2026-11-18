"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { TrendingUp } from "lucide-react";
import { useContas } from "@/hooks/useContas";
import AplicacoesTab from "@/components/aplicacoes/AplicacoesTab";
import ResumoInvestimentos from "@/components/aplicacoes/ResumoInvestimentos";
import ResumoRendaVariavel from "@/components/renda-variavel/ResumoRendaVariavel";
import RendaVariavel, { SECOES_RV, type SecaoRv } from "@/components/renda-variavel/RendaVariavel";
import { PageHeader } from "@/components/common/PageHeader";
import { AbasSecao } from "@/components/common/AbasSecao";

type AbaType = "renda-fixa" | "renda-variavel";

const ehSecaoRv = (v: string | null): v is SecaoRv => !!v && (SECOES_RV as readonly string[]).includes(v);

/**
 * Aba e seção vêm do endereço: sem ?rv= abre a renda fixa; com ?rv=carteira|historico|proventos|ir,
 * a renda variável na seção indicada. Atualizar a página ou voltar mantém o lugar.
 * A troca usa history.replaceState (o Next sincroniza o useSearchParams), então não há navegação:
 * a página não remonta nem repete a animação de entrada.
 */
function trocarEndereco(rv: SecaoRv | null) {
  const params = new URLSearchParams(window.location.search);
  if (rv) params.set("rv", rv); else params.delete("rv");
  const busca = params.toString();
  window.history.replaceState(null, "", `${window.location.pathname}${busca ? `?${busca}` : ""}`);
}

function CarregandoAplicacoes() {
  return (
    <div className="page-container p-4 md:p-6">
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700" />
      </div>
    </div>
  );
}

/** useSearchParams() fica neste componente interno, envolvido por <Suspense> (sem isso o build falha). */
function AplicacoesContent() {
  const { data: contas = [], isLoading } = useContas();
  const rvParam = useSearchParams().get("rv");
  const secaoRv: SecaoRv | null = ehSecaoRv(rvParam) ? rvParam : null;
  const aba: AbaType = secaoRv ? "renda-variavel" : "renda-fixa";

  if (isLoading) return <CarregandoAplicacoes />;

  return (
    <div className="page-container p-4 md:p-6 space-y-6">
      <PageHeader
        icone={TrendingUp}
        titulo="Aplicações"
        descricao="Acompanhe seus investimentos em renda fixa e renda variável"
      />

      {/* Resumo da aba selecionada (mesmo padrão de cards compactos das outras páginas) */}
      <div key={`resumo-${aba}`} className="motion-safe:animate-conteudo-in">{aba === "renda-fixa" ? <ResumoInvestimentos /> : <ResumoRendaVariavel />}</div>

      {/* Abas: renda fixa / renda variável (mesmo estilo da página Contas) */}
      <AbasSecao
        ariaLabel="Tipo de investimento"
        abas={[
          { id: "renda-fixa", rotulo: "Renda fixa" },
          { id: "renda-variavel", rotulo: "Renda variável" },
        ] as const}
        ativa={aba}
        onChange={(a) => trocarEndereco(a === "renda-variavel" ? "carteira" : null)}
      />

      {/* key: o conteúdo da aba é recriado na troca e entra com a mesma animação das outras abas */}
      <div key={aba} className="motion-safe:animate-conteudo-in">
        {aba === "renda-fixa" ? (
          <AplicacoesTab contas={contas} />
        ) : (
          <RendaVariavel contas={contas} secao={secaoRv ?? "carteira"} onSecaoChange={trocarEndereco} />
        )}
      </div>
    </div>
  );
}

export default function AplicacoesPage() {
  return (
    <Suspense fallback={<CarregandoAplicacoes />}>
      <AplicacoesContent />
    </Suspense>
  );
}
