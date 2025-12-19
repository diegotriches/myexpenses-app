"use client";

import { useParams } from "next/navigation";
import { useFaturaCartao } from "@/hooks/useFaturaCartao";
import FaturaItem from "@/components/FaturaItem";

export default function FaturaPage() {
  const params = useParams();

  const { id, ano, mes } = params as {
    id: string;
    ano: string;
    mes: string;
  };

  const cartaoId = id;
  const anoNum = Number(ano);
  const mesNum = Number(mes);

  if (!cartaoId || isNaN(anoNum) || isNaN(mesNum)) {
    return <p>Parâmetros inválidos.</p>;
  }

  const { fatura, loading, error } = useFaturaCartao({
    cartaoId,
    ano: anoNum,
    mes: mesNum,
  });

  if (loading) return <p>Carregando fatura...</p>;
  if (error) return <p>{error}</p>;
  if (!fatura || fatura.transacoesDoMes.length === 0)
    return <p>Nenhuma transação encontrada.</p>;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">
        Fatura {mesNum}/{anoNum}
      </h1>

      <p className="font-semibold">
        Total: R$ {fatura.total.toFixed(2)}
      </p>

      <div className="space-y-3">
        {fatura.transacoesDoMes.map((t) => (
          <FaturaItem key={t.id} transacao={t} />
        ))}
      </div>

      <div className="mt-6">
        <h2 className="font-semibold mb-2">Resumo por Categoria:</h2>
        {Object.keys(fatura.porCategoria).length === 0 ? (
          <p>Sem categorias para exibir.</p>
        ) : (
          <ul>
            {Object.entries(fatura.porCategoria).map(([categoria, valor]) => (
              <li key={categoria}>
                {categoria}: R$ {valor.toFixed(2)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}