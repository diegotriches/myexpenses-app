"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Pencil, Trash2, Power, CreditCard, Wallet } from "lucide-react";
import { Cartao } from "@/types/cartao";
import { empresaOptions, bandeiraOptions } from "@/utils/cartaoOptions";

function getImgFromOption(options: readonly { value: string; imgSrc: string }[], value: string) {
  return options.find((o) => o.value === value)?.imgSrc ?? null;
}

interface Props {
  cartao: Cartao;
  onEditar: (cartao: Cartao) => void;
  onExcluir: (cartao: Cartao) => void;
  onToggleAtivo: (cartao: Cartao) => void;
}

export default function CartaoItemInativo({ cartao, onEditar, onExcluir, onToggleAtivo }: Props) {
  const empresaImg  = getImgFromOption(empresaOptions,  cartao.empresa  ?? "");
  const bandeiraImg = getImgFromOption(bandeiraOptions, cartao.bandeira ?? "");

  return (
    <Card className="border-gray-200 dark:border-gray-700 opacity-75 hover:opacity-100 transition-opacity">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">

          {/* Logo + info */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {empresaImg ? (
              <div className="w-10 h-10 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center p-1.5 border dark:border-gray-700 flex-shrink-0">
                <img src={empresaImg} alt={cartao.empresa || ""} className="w-full h-full object-contain" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                {cartao.tipo === "credito"
                  ? <CreditCard size={18} className="text-gray-400" />
                  : <Wallet size={18} className="text-gray-400" />
                }
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 truncate">
                  {cartao.nome}
                </span>
                <Badge
                  variant="secondary"
                  className="bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 text-xs flex-shrink-0"
                >
                  Inativo
                </Badge>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {cartao.tipo === "credito" ? "Crédito" : "Débito"}
                {cartao.bandeira ? ` • ${cartao.bandeira}` : ""}
              </p>
            </div>
          </div>

          {/* Bandeira + menu */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {bandeiraImg && (
              <div className="w-8 h-8 flex items-center justify-center opacity-60">
                <img src={bandeiraImg} alt={cartao.bandeira} className="w-full h-full object-contain" />
              </div>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical size={15} className="text-gray-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={() => onToggleAtivo(cartao)} className="cursor-pointer">
                  <Power size={14} className="mr-2 text-green-600" />
                  Reativar cartão
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEditar(cartao)} className="cursor-pointer">
                  <Pencil size={14} className="mr-2" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onExcluir(cartao)}
                  className="cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600"
                >
                  <Trash2 size={14} className="mr-2" />
                  Remover
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}