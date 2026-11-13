"use client";

import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreVertical, Edit, Trash2, Tag, ListOrdered } from "lucide-react";
import { iconOptions } from "@/utils/iconOptions";
import { Categoria } from "@/types/categoria";

type Props = {
  categoria: Categoria;
  /** Extrato da categoria: o card inteiro é um link para ele */
  hrefExtrato: string;
  onEditar: () => void;
  onExcluir: () => void;
};

const corGradiente: Record<Categoria["tipo"], string> = {
  entrada: "from-green-500 to-green-600 dark:from-green-600 dark:to-green-700",
  saida:   "from-red-500 to-red-600 dark:from-red-600 dark:to-red-700",
  ambos:   "from-blue-500 to-purple-600 dark:from-blue-600 dark:to-purple-700",
};

// Card enxuto: ícone e nome. Totais, gráfico e lançamentos ficam no extrato
export default function CategoriaCard({ categoria, hrefExtrato, onEditar, onExcluir }: Props) {
  const IconComp = iconOptions.find((i) => i.name === categoria.icone)?.component || Tag;

  return (
    <div className="flex items-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition">
      <Link
        href={hrefExtrato}
        className="flex flex-1 min-w-0 items-center gap-3 p-3 rounded-l-lg outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        aria-label={`Extrato da categoria ${categoria.nome}`}
      >
        <div
          className={`flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br ${corGradiente[categoria.tipo]} flex items-center justify-center shadow-sm`}
          aria-hidden="true"
        >
          <IconComp size={20} className="text-white" />
        </div>
        <h3 className="flex-1 min-w-0 font-semibold text-sm text-gray-900 dark:text-white truncate" title={categoria.nome}>
          {categoria.nome}
        </h3>
      </Link>

      <div className="pr-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 flex-shrink-0 hover:bg-gray-100 dark:hover:bg-gray-700"
              aria-label={`Opções para ${categoria.nome}`}
            >
              <MoreVertical size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link href={hrefExtrato}>
                <ListOrdered size={14} className="mr-2" />
                Ver extrato
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
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
    </div>
  );
}
