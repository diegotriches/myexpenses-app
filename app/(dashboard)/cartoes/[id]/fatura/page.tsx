"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";

import { useFaturaCartao } from "@/hooks/useFaturaCartao";
import FaturaItem from "@/components/fatura/FaturaItem";
import PagarFaturaModal from "@/components/fatura/PagarFaturaModal";
import { usePeriodo } from "@/components/PeriodoContext";
import { useContas } from "@/hooks/useContas";

export default function FaturaPage() {
  const params = useParams();
  const { contas } = useContas();
  const { mesSelecionado, anoSelecionado } = usePeriodo();

  const [modalAberto, setModalAberto] = useState(false);

  const { id } = params as { id: string };
  const cartaoId = id;

  const anoNum = anoSelecionado;
  const mesNum = mesSelecionado + 1;

  const {
    fatura,
    transacoes,
    porCategoria,
    loading,
    pagarFatura,
    pagando,
  } = useFaturaCartao({
    cartaoId,
    ano: anoNum,
    mes: mesNum,
  });
  
  useEffect(() => {
    if (fatura?.paga) {
      setModalAberto(false);
    }
  }, [fatura?.paga]);

  if (!cartaoId || isNaN(anoNum) || isNaN(mesNum)) {
    return <p>Parâmetros inválidos.</p>;
  }
  
  if (!fatura && !loading) {
    return <p>Fatura não encontrada.</p>;
  }

  const faturaVazia = transacoes.length === 0;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">
        Fatura {mesNum}/{anoNum}
      </h1>

      {fatura && (
        <div className="flex items-center gap-4">
          <span
            className={`px-3 py-1 rounded-full text-sm font-semibold ${fatura.paga
              ? "bg-green-100 text-green-700"
              : "bg-yellow-100 text-yellow-700"
              }`}
          >
            {fatura.paga ? "Fatura paga" : "Fatura em aberto"}
          </span>

          {!fatura.paga && (
            <button
              className="ml-auto px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
              onClick={() => setModalAberto(true)}
              disabled={pagando}
            >
              {pagando ? "Pagando..." : "Pagar fatura"}
            </button>
          )}
        </div>
      )}

      <p className="font-semibold text-lg">
        Total: R$ {Number(fatura?.total ?? 0).toFixed(2)}
      </p>

      {faturaVazia ? (
        <p>Nenhuma transação encontrada para este período.</p>
      ) : (
        <div className="space-y-3">
          {transacoes.map((t) => (
            <FaturaItem key={t.id} transacao={t} />
          ))}
        </div>
      )}

      <div className="mt-6">
        <h2 className="font-semibold mb-2">Resumo por Categoria</h2>

        {Object.keys(porCategoria).length === 0 ? (
          <p>Sem categorias para exibir.</p>
        ) : (
          <ul className="space-y-1">
            {Object.entries(porCategoria).map(([categoria, valor]) => (
              <li key={categoria} className="flex justify-between text-sm">
                <span>{categoria}</span>
                <span>R$ {valor.toFixed(2)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <PagarFaturaModal
        aberto={modalAberto}
        onClose={() => setModalAberto(false)}
        total={Number(fatura?.total ?? 0)}
        contas={contas}
        onConfirmar={pagarFatura}
      />
    </div>
  );
}