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
import { Categoria } from "@/types/categoria";

type Props = {
  categoria: Categoria;
  onEditar: () => void;
  onExcluir: () => void;
};

export default function CategoriaCard({ categoria, onEditar, onExcluir }: Props) {
  const IconComp = iconOptions.find(i => i.name === categoria.icone)?.component || null;

  // Cor baseada no tipo
  const getCorGradiente = () => {
    if (categoria.tipo === "entrada") {
      return "from-green-500 to-green-600 dark:from-green-600 dark:to-green-700";
    } else if (categoria.tipo === "saida") {
      return "from-red-500 to-red-600 dark:from-red-600 dark:to-red-700";
    } else {
      // Para tipo "ambos"
      return "from-blue-500 to-purple-600 dark:from-blue-600 dark:to-purple-700";
    }
  };

  const getCorBadge = () => {
    if (categoria.tipo === "entrada") {
      return "bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/50 dark:text-green-300 dark:hover:bg-green-900/50";
    } else if (categoria.tipo === "saida") {
      return "bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-900/50";
    } else {
      // Para tipo "ambos"
      return "bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/50 dark:text-blue-300 dark:hover:bg-blue-900/50";
    }
  };

  const getTipoLabel = () => {
    if (categoria.tipo === "entrada") return "Receita";
    if (categoria.tipo === "saida") return "Despesa";
    return "Ambos";
  };

  const getTipoIcon = () => {
    if (categoria.tipo === "entrada") return <TrendingUp size={12} className="mr-1" aria-hidden="true" />;
    if (categoria.tipo === "saida") return <TrendingDown size={12} className="mr-1" aria-hidden="true" />;
    return <Tag size={12} className="mr-1" aria-hidden="true" />;
  };

  // ✅ NOVO: Texto acessível para screen readers
  const getAriaLabel = () => {
    return `Categoria ${categoria.nome}, tipo ${getTipoLabel()}`;
  };

  return (
    <Card 
      className="group hover:shadow-lg transition-all duration-200 hover:scale-[1.02] border-gray-200 dark:border-gray-700"
      role="article"
      aria-label={getAriaLabel()}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          {/* Ícone com gradiente */}
          <div 
            className={`flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${getCorGradiente()} flex items-center justify-center shadow-md`}
            aria-hidden="true"
          >
            {IconComp ? (
              <IconComp size={24} className="text-white" />
            ) : (
              <Tag size={24} className="text-white" />
            )}
          </div>

          {/* Informações ao lado */}
          <div className="flex-1 min-w-0">
            {/* Nome da categoria */}
            <h3 className="font-semibold text-base text-gray-900 dark:text-white truncate mb-1">
              {categoria.nome}
            </h3>

            {/* Badge de tipo */}
            <Badge 
              className={`${getCorBadge()} text-xs`}
              aria-label={`Tipo: ${getTipoLabel()}`}
            >
              {getTipoIcon()}
              <span>{getTipoLabel()}</span>
            </Badge>
          </div>

          {/* Menu Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label={`Opções para categoria ${categoria.nome}`}
              >
                <MoreVertical size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem 
                onClick={onEditar} 
                className="cursor-pointer focus:bg-gray-100 dark:focus:bg-gray-800"
              >
                <Edit size={14} className="mr-2" aria-hidden="true" />
                <span>Editar</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={onExcluir} 
                className="cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50 dark:text-red-400 dark:focus:text-red-300 dark:focus:bg-red-900/20"
              >
                <Trash2 size={14} className="mr-2" aria-hidden="true" />
                <span>Excluir</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}