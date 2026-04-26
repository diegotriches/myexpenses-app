"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Edit, Trash2, MapPin, Receipt, TrendingDown } from "lucide-react";
import { iconOptions } from "@/utils/iconOptions";
import { Estabelecimento } from "@/types/estabelecimento";
import { useHideValues } from "@/contexts/HideValuesContext";

type Props = {
  estabelecimento: Estabelecimento;
  onEditar: () => void;
  onExcluir: () => void;
};

const formatarMoeda = (valor: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);

export default function EstabelecimentoCard({ estabelecimento, onEditar, onExcluir }: Props) {
  const { mask } = useHideValues();
  const IconComp = iconOptions.find((i) => i.name === estabelecimento.icone)?.component || null;

  const temMovimentacao = (estabelecimento.totalTransacoes ?? 0) > 0;

  return (
    <Card
      className="group hover:shadow-lg transition-all duration-200 hover:scale-[1.02] border-gray-200 dark:border-gray-700"
      role="article"
      aria-label={`Estabelecimento ${estabelecimento.nome}`}
    >
      <CardContent className="p-4 space-y-3">
        {/* ── Linha superior: ícone + nome + menu ── */}
        <div className="flex items-center gap-3">
          {/* Ícone */}
          <div
            className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 flex items-center justify-center shadow-md"
            aria-hidden="true"
          >
            {IconComp ? (
              <IconComp size={24} className="text-white" />
            ) : (
              <Receipt size={24} className="text-white" />
            )}
          </div>

          {/* Nome + localização */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base text-gray-900 dark:text-white truncate">
              {estabelecimento.nome}
            </h3>
            {estabelecimento.localizacao ? (
              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5 truncate">
                <MapPin size={10} className="flex-shrink-0" />
                {estabelecimento.localizacao}
              </p>
            ) : (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 italic">
                Sem localização
              </p>
            )}
          </div>

          {/* Menu ⋮ */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label={`Opções para ${estabelecimento.nome}`}
              >
                <MoreVertical size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={onEditar} className="cursor-pointer">
                <Edit size={14} className="mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onExcluir}
                className="cursor-pointer text-red-600 dark:text-red-400 focus:text-red-700 focus:bg-red-50 dark:focus:bg-red-900/20"
              >
                <Trash2 size={14} className="mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* ── Stats ── */}
        <div className="border-t border-gray-100 dark:border-gray-700 pt-3">
          {!temMovimentacao ? (
            <p className="text-xs text-gray-400 dark:text-gray-500 italic">
              Sem movimentações registradas
            </p>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                <Receipt size={12} />
                <span>
                  {estabelecimento.totalTransacoes}{" "}
                  {estabelecimento.totalTransacoes === 1 ? "transação" : "transações"}
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs font-semibold tabular-nums text-red-600 dark:text-red-400">
                <TrendingDown size={12} />
                <span>{mask(formatarMoeda(estabelecimento.totalGasto ?? 0))}</span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}