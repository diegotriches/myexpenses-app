"use client";

import { Transacao } from "@/types/transacao";

interface Props {
  transacao: Transacao;
}

export default function FaturaItem({ transacao }: Props) {
  return (
    <div className="p-4 rounded-xl shadow-sm border flex justify-between items-center bg-white">
      <div className="flex flex-col">
        <span className="font-medium">{transacao.descricao || "Sem descrição"}</span>
        <span className="text-sm text-gray-500">
          {transacao.categoria || "Sem categoria"}
        </span>
        {(transacao.parcelado || transacao.recorrente) && (
          <span className="text-xs text-purple-600">
            {transacao.parcelado
              ? `Parcela ${transacao.parcelaAtual} de ${transacao.parcelas}`
              : transacao.recorrente
              ? "Recorrente"
              : ""}
          </span>
        )}
      </div>

      <span
        className={`font-semibold ${
          transacao.tipo === "saida" ? "text-red-600" : "text-green-600"
        }`}
      >
        R$ {Number(transacao.valor).toFixed(2)}
      </span>
    </div>
  );
}