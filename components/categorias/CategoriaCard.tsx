"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreVertical, Edit, Trash2, TrendingUp, TrendingDown, Tag } from "lucide-react";
import { iconOptions } from "@/utils/iconOptions";
import { Categoria } from "app/(dashboard)/categorias/page";

type Props = {
  categoria: Categoria;
  onEditar: () => void;
  onExcluir: () => void;
};

export default function CategoriaCard({ categoria, onEditar, onExcluir }: Props) {
  const IconComp = iconOptions.find(i => i.name === categoria.icon)?.component || null;

  // Cor baseada no tipo
  const getCorGradiente = () => {
    return categoria.tipo === "entrada" 
      ? "from-green-500 to-green-600" 
      : "from-red-500 to-red-600";
  };

  const getCorBadge = () => {
    return categoria.tipo === "entrada"
      ? "bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900 dark:text-green-300"
      : "bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900 dark:text-red-300";
  };

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 hover:scale-[1.02]">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          {/* Ícone com gradiente */}
          <div className={`flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${getCorGradiente()} flex items-center justify-center shadow-md`}>
            {IconComp ? (
              <IconComp size={24} className="text-white" />
            ) : (
              <Tag size={24} className="text-white" />
            )}
          </div>

          {/* Menu Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Opções da categoria"
              >
                <MoreVertical size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEditar} className="cursor-pointer">
                <Edit size={14} className="mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={onExcluir} 
                className="cursor-pointer text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
              >
                <Trash2 size={14} className="mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Informações */}
        <div className="space-y-2">
          {/* Nome */}
          <h3 className="font-semibold text-base text-gray-900 dark:text-white truncate">
            {categoria.nome}
          </h3>

          {/* Badge de tipo com ícone */}
          <Badge className={getCorBadge()}>
            {categoria.tipo === "entrada" ? (
              <>
                <TrendingUp size={12} className="mr-1" />
                Receita
              </>
            ) : (
              <>
                <TrendingDown size={12} className="mr-1" />
                Despesa
              </>
            )}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}