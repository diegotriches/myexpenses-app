"use client";

import { Card } from "@/components/ui/card";
import { Pencil, Trash2, FileText } from "lucide-react";
import { Cartao } from "@/types/cartao";

import { empresaOptions, bandeiraOptions } from "@/utils/cartoes/cartaoOptions";

interface Props {
  cartao: Cartao;
  movimentacoes: { valor: number | string; cartaoId: number }[]; // aceita number ou string
  onEditar: (cartao: Cartao) => void;
  onExcluir: (id: number) => void;
  onFatura?: (cartaoId: number) => void;
}

function getImgFromOption(options: any[], value: string) {
  const found = options.find((o) => o.value === value);
  return found ? found.imgSrc : null;
}

export default function CartaoItem({
  cartao,
  movimentacoes = [],
  onEditar,
  onExcluir,
  onFatura,
}: Props) {
  const empresaImg = getImgFromOption(empresaOptions, cartao.empresa ?? "");
  const bandeiraImg = getImgFromOption(bandeiraOptions, cartao.bandeira);

  const movsSeguros = Array.isArray(movimentacoes) ? movimentacoes : [];

  // Cálculo de Em Uso (garantindo número)
  const totalEmUso = movsSeguros
    .filter((mov) => mov.cartaoId === cartao.id)
    .reduce((total, mov) => total + Number(mov.valor ?? 0), 0);

  // Disponível
  const limiteTotal = Number(cartao.limite) || 0;
  const limiteDisponivel = limiteTotal - totalEmUso;

  // Porcentagem do uso do limite
  const porcentagemUso = limiteTotal > 0 ? (totalEmUso / limiteTotal) * 100 : 0;

  return (
    <Card className="p-4 space-y-4">
      {/* Linha superior */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          {empresaImg && (
            <img
              src={empresaImg}
              alt={cartao.empresa || "Empresa"}
              className="h-10 w-10 rounded-md object-contain"
            />
          )}

          <div className="flex flex-col">
            <span className="text-lg font-semibold">{cartao.nome}</span>
            <span
              className={`text-sm ${
                cartao.ativo ? "text-green-600" : "text-red-600"
              }`}
            >
              {cartao.ativo ? "Ativo" : "Inativo"}
            </span>
          </div>
        </div>

        {bandeiraImg && (
          <img
            src={bandeiraImg}
            alt={cartao.bandeira}
            className="h-8 w-8 object-contain"
          />
        )}
      </div>

      {/* Fechamento / Vencimento */}
      {cartao.tipo === "credito" && (
        <div className="flex items-center gap-6 text-sm text-gray-700">
          <div>
            <span className="font-medium">Fecha dia:</span> {cartao.diaFechamento}
          </div>
          <div>
            <span className="font-medium">Vence dia:</span> {cartao.diaVencimento}
          </div>
        </div>
      )}

      {/* Limites */}
      {cartao.tipo === "credito" && (
        <div className="flex flex-col gap-1 text-sm text-gray-800">
          <span>
            <span className="font-medium">Limite total: </span>
            R$ {limiteTotal.toFixed(2)}
          </span>

          <span>
            <span className="font-medium">Em uso: </span>
            R$ {totalEmUso.toFixed(2)}
          </span>

          <span>
            <span className="font-medium">Disponível: </span>
            R$ {limiteDisponivel.toFixed(2)}
          </span>
        </div>
      )}

      {/* Barra de Progresso */}
      {cartao.tipo === "credito" && (
        <div className="w-full space-y-1 mt-1">
          <div className="w-full h-2 bg-gray-200 rounded overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-300"
              style={{ width: `${Math.min(porcentagemUso, 100)}%` }}
            ></div>
          </div>

          <span className="text-xs text-gray-600">
            {porcentagemUso.toFixed(1)}% do limite utilizado
          </span>
        </div>
      )}

      {/* Ações */}
      <div className="flex justify-end gap-4 pt-2">
        <button
          onClick={() => onEditar(cartao)}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
        >
          <Pencil size={16} /> Editar
        </button>

        <button
          onClick={() => onFatura && onFatura(cartao.id)}
          className="text-purple-600 hover:text-purple-800 text-sm font-medium flex items-center gap-1"
        >
          <FileText size={16} /> Ver Fatura
        </button>

        <button
          onClick={() => onExcluir(cartao.id)}
          className="text-red-600 hover:text-red-800 text-sm font-medium flex items-center gap-1"
        >
          <Trash2 size={16} /> Remover
        </button>
      </div>
    </Card>
  );
}
