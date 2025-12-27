"use client";

import { Card } from "@/components/ui/card";
import { Pencil, Trash2, FileText } from "lucide-react";
import { Cartao } from "@/types/cartao";
import { useRouter } from "next/navigation";

import { empresaOptions, bandeiraOptions } from "@/utils/cartaoOptions";

interface Props {
  cartao: Cartao;
  movimentacoes: { valor: number | string; cartaoId: number }[];
  onEditar: (cartao: Cartao) => void;
  onExcluir: (cartao: Cartao) => void;
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
  const router = useRouter();
  const movsSeguros = Array.isArray(movimentacoes) ? movimentacoes : [];

  const empresaImg = getImgFromOption(empresaOptions, cartao.empresa ?? "");
  const bandeiraImg = getImgFromOption(bandeiraOptions, cartao.bandeira);

  // Cálculo de Em Uso
  const totalEmUso = movsSeguros
    .filter((mov) => mov.cartaoId === cartao.id)
    .reduce((total, mov) => total + Number(mov.valor ?? 0), 0);

  const limiteTotal = Number(cartao.limite) || 0;
  const limiteDisponivel = limiteTotal - totalEmUso;
  const porcentagemUso = limiteTotal > 0 ? (totalEmUso / limiteTotal) * 100 : 0;

  const abrirFatura = () => {
    // Se foi passado um callback externo, chama ele
    if (onFatura) return onFatura(cartao.id);

    // Caso contrário, usa navegação interna
    router.push(`/cartoes/${cartao.id}/fatura`);
  };

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2">
          {empresaImg && <img src={empresaImg} alt={cartao.empresa || "Empresa"} className="h-9 w-9 rounded-md object-contain" />}
          <div className="flex flex-col">
            <span className="text-sm font-semibold">{cartao.nome}</span>
            <span className={`text-xs ${cartao.ativo ? "text-green-600" : "text-red-600"}`}>
              {cartao.ativo ? "Ativo" : "Inativo"}
            </span>
          </div>
        </div>
        {bandeiraImg && <img src={bandeiraImg} alt={cartao.bandeira} className="h-9 w-9 object-contain" />}
      </div>

      {cartao.tipo === "credito" && (
        <>
          {/* Linha superior */}
          <div className="border-t border-gray-300 -mb-3"></div>
          
          <div className="flex items-center justify-center gap-27 text-sm text-gray-700">
            <div className="text-center"><span className="font-medium">Fecha dia:</span> {cartao.diaFechamento}</div>
            <div className="text-center"><span className="font-medium">Vence dia:</span> {cartao.diaVencimento}</div>
          </div>

          {/* Linha inferior */}
          <div className="border-t border-gray-300 -mt-3"></div>

          {/* Limites em linha horizontal */}
          <div className="flex items-center justify-around text-center text-sm">
            <div className="flex flex-col gap-0.5">
              <span className="font-medium text-gray-700">Limite total</span>
              <span className="text-gray-800">R$ {limiteTotal.toFixed(2)}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="font-medium text-gray-700">Em uso</span>
              <span className="text-gray-800">R$ {totalEmUso.toFixed(2)}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="font-medium text-gray-700">Disponível</span>
              <span className="text-gray-800">R$ {limiteDisponivel.toFixed(2)}</span>
            </div>
          </div>

          <div className="w-full space-y-0.5">
            <div className="w-full h-1.5 bg-gray-200 rounded overflow-hidden">
              <div className="h-full bg-green-500 transition-all duration-300" style={{ width: `${Math.min(porcentagemUso, 100)}%` }}></div>
            </div>
            <span className="text-sm text-gray-600">{porcentagemUso.toFixed(1)}% do limite utilizado</span>
          </div>
        </>
      )}

      <div className="flex justify-end gap-3">
        <button onClick={() => onEditar(cartao)} className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1 cursor-pointer">
          <Pencil size={13} /> Editar
        </button>

        <button onClick={abrirFatura} className="text-purple-600 hover:text-purple-800 text-sm font-medium flex items-center gap-1 cursor-pointer">
          <FileText size={13} /> Ver Fatura
        </button>

        <button onClick={() => onExcluir(cartao)} className="text-red-600 hover:text-red-800 text-sm font-medium flex items-center gap-1 cursor-pointer">
          <Trash2 size={13} /> Remover
        </button>
      </div>
    </Card>
  );
}